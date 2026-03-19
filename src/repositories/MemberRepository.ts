// src/repositories/MemberRepository.ts
import { pool } from '@config/database';
import { Member, CreateMemberDTO, UpdateMemberDTO, MemberFilters, PaginatedMembers, MemberStatistics, ProfileUpdateLink, AuditLog } from '@/dtos/member.types';
import logger from '@config/logger';
import { AppError } from "@utils/AppError";
import crypto from 'crypto';

export class MemberRepository {
    /**
     * Generate a unique profile update token
     */
    private generateProfileToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Create audit log entry
     */
    async createAuditLog(data: {
        churchId: string;
        entityType: 'member' | 'event' | 'attendance' | 'user' | 'family';
        entityId: string;
        action: string;
        actorType: 'admin' | 'member' | 'system';
        actorId?: string;
        changes?: Record<string, any>;
        metadata?: Record<string, any>;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<AuditLog> {
        const query = `
            INSERT INTO audit_logs (
                church_id, entity_type, entity_id, action, action_type, actor_type, actor_id,
                changes, metadata, ip_address, user_agent, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
        `;

        const values = [
            data.churchId,
            data.entityType,
            data.entityId,
            data.action,
            data.entityType, // Use entity_type as action_type
            data.actorType,
            data.actorId || null,
            data.changes ? JSON.stringify(data.changes) : null,
            data.metadata ? JSON.stringify(data.metadata) : null,
            data.ipAddress || null,
            data.userAgent || null,
            'success', // Default status
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Create member with optional profile update token
     */
    async create(data: CreateMemberDTO, options?: {
        generateToken?: boolean;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<{ member: Member; profileLink?: ProfileUpdateLink }> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            let profileToken: string | null = null;
            let tokenExpiry: Date | null = null;

            // Generate profile update token if requested
            if (options?.generateToken) {
                profileToken = this.generateProfileToken();
                tokenExpiry = new Date();
                tokenExpiry.setDate(tokenExpiry.getDate() + 30); // 30 days expiry
            }

            // Clear wedding anniversary if not married
            const weddingAnniversary = data.maritalStatus === 'married' ? (data.weddingAnniversary || null) : null;

            const query = `
                INSERT INTO members (
                    church_id, user_id, first_name, last_name, email, phone, gender,
                    marital_status, date_of_birth, wedding_anniversary, address, city, state,
                    country, postal_code, profile_image_url, registration_type,
                    status, notes, created_by, profile_update_token, profile_update_token_expires_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
                    RETURNING *
            `;

            const values = [
                data.churchId,
                data.userId || null,
                data.firstName,
                data.lastName,
                data.email || null,
                data.phone || null,
                data.gender || null,
                data.maritalStatus || null,
                data.dateOfBirth || null,
                weddingAnniversary,
                data.address || null,
                data.city || null,
                data.state || null,
                data.country || null,
                data.postalCode || null,
                data.profileImageUrl || null,
                data.registrationType || 'manual',
                data.status || 'active',
                data.notes || null,
                data.createdBy || null,
                profileToken,
                tokenExpiry,
            ];

            const result = await client.query(query, values);
            const member = result.rows[0];

            // Create audit log
            await this.createAuditLog({
                churchId: data.churchId,
                entityType: 'member',
                entityId: member.id,
                action: 'create',
                actorType: 'admin',
                actorId: data.createdBy,
                changes: {
                    created: {
                        first_name: data.firstName,
                        last_name: data.lastName,
                        email: data.email,
                        phone: data.phone,
                    }
                },
                metadata: {
                    registration_type: data.registrationType || 'manual',
                    profile_link_generated: !!profileToken,
                },
                ipAddress: options?.ipAddress,
                userAgent: options?.userAgent,
            });

            // Log profile link generation if applicable
            if (profileToken) {
                await this.createAuditLog({
                    churchId: data.churchId,
                    entityType: 'member',
                    entityId: member.id,
                    action: 'profile_link_generated',
                    actorType: 'admin',
                    actorId: data.createdBy,
                    metadata: {
                        expires_at: tokenExpiry,
                        email: data.email,
                        phone: data.phone,
                    },
                    ipAddress: options?.ipAddress,
                    userAgent: options?.userAgent,
                });
            }

            await client.query('COMMIT');

            // Prepare response
            const response: { member: Member; profileLink?: ProfileUpdateLink } = { member };

            if (profileToken && tokenExpiry) {
                const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                response.profileLink = {
                    token: profileToken,
                    link: `${baseUrl}/profile/update/${profileToken}`,
                    expiresAt: tokenExpiry,
                };
            }

            return response;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error creating member:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Generate or regenerate profile update link
     */
    async generateProfileUpdateLink(
        memberId: string,
        churchId: string,
        actorId?: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<ProfileUpdateLink> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const token = this.generateProfileToken();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

            const query = `
                UPDATE members
                SET profile_update_token = $1,
                    profile_update_token_expires_at = $2,
                    updated_at = NOW()
                WHERE id = $3 AND church_id = $4 AND deleted_at IS NULL
                    RETURNING id, email, phone
            `;

            const result = await client.query(query, [token, expiresAt, memberId, churchId]);

            if (result.rows.length === 0) {
                throw new AppError('Member not found', 404);
            }

            const member = result.rows[0];

            // Create audit log
            await this.createAuditLog({
                churchId,
                entityType: 'member',
                entityId: memberId,
                action: 'profile_link_generated',
                actorType: actorId ? 'admin' : 'system',
                actorId,
                metadata: {
                    expires_at: expiresAt,
                    email: member.email,
                    phone: member.phone,
                    regenerated: true,
                },
                ipAddress,
                userAgent,
            });

            await client.query('COMMIT');

            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return {
                token,
                link: `${baseUrl}/profile/update/${token}`,
                expiresAt,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error generating profile update link:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Verify and get member by profile update token
     */
    async findByProfileToken(token: string): Promise<Member | null> {
        const query = `
            SELECT * FROM members
            WHERE profile_update_token = $1
              AND profile_update_token_expires_at > NOW()
              AND deleted_at IS NULL
        `;
        const result = await pool.query(query, [token]);
        return result.rows[0] || null;
    }

    /**
     * Update member profile via token (member self-update)
     */
    async updateViaToken(
        token: string,
        data: UpdateMemberDTO,
        ipAddress?: string,
        userAgent?: string
    ): Promise<Member | null> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Verify token
            const member = await this.findByProfileToken(token);
            if (!member) {
                throw new AppError('Invalid or expired profile update link', 400);
            }

            // Prepare update
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            const fieldMapping: Record<string, string> = {
                firstName: 'first_name',
                lastName: 'last_name',
                email: 'email',
                phone: 'phone',
                gender: 'gender',
                maritalStatus: 'marital_status',
                dateOfBirth: 'date_of_birth',
                weddingAnniversary: 'wedding_anniversary',
                address: 'address',
                city: 'city',
                state: 'state',
                country: 'country',
                postalCode: 'postal_code',
                profileImageUrl: 'profile_image_url',
            };

            // Handle wedding anniversary based on marital status
            let processedData = { ...data };
            if (data.maritalStatus && data.maritalStatus !== 'married') {
                processedData.weddingAnniversary = null;
            }

            // Track changes for audit
            const changes: Record<string, { old: any; new: any }> = {};

            for (const [key, value] of Object.entries(processedData)) {
                if (value !== undefined && fieldMapping[key]) {
                    const dbField = fieldMapping[key];
                    const oldValue = (member as any)[dbField];

                    if (oldValue !== value) {
                        changes[dbField] = { old: oldValue, new: value };
                    }

                    updates.push(`${dbField} = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                }
            }

            if (updates.length === 0) {
                await client.query('ROLLBACK');
                return member;
            }

            // Mark profile as completed and invalidate token
            updates.push(
                `updated_at = NOW()`,
                `profile_completed_at = NOW()`,
                `profile_update_token = NULL`,
                `profile_update_token_expires_at = NULL`
            );

            const query = `
                UPDATE members
                SET ${updates.join(', ')}
                WHERE id = $${paramIndex} AND deleted_at IS NULL
                    RETURNING *
            `;
            values.push(member.id);

            const result = await client.query(query, values);
            const updatedMember = result.rows[0];

            // Create audit log
            await this.createAuditLog({
                churchId: member.church_id,
                entityType: 'member',
                entityId: member.id,
                action: 'profile_updated',
                actorType: 'member',
                changes,
                metadata: {
                    via_token: true,
                    completed_at: new Date(),
                },
                ipAddress,
                userAgent,
            });

            await client.query('COMMIT');

            return updatedMember;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error updating member via token:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Log profile link sent event
     */
    async logProfileLinkSent(
        memberId: string,
        churchId: string,
        channels: string[],
        actorId?: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.createAuditLog({
            churchId,
            entityType: 'member',
            entityId: memberId,
            action: 'profile_link_sent',
            actorType: 'admin',
            actorId,
            metadata: {
                channels,
                sent_at: new Date(),
            },
            ipAddress,
            userAgent,
        });
    }

    async getCelebrations(
        churchId: string,
        filters: {
            type?: 'birthday' | 'anniversary' | 'all';
            period?: 'upcoming' | 'past' | 'all';
            days?: number;
            page?: number;
            limit?: number;
        }
    ): Promise<{
        celebrations: any[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
    }> {
        const { type = 'all', period = 'all', days = 365, page = 1, limit = 20 } = filters;

        const query = `
            WITH celebrations AS (
                -- Birthdays
                SELECT
                    m.id,
                    m.first_name,
                    m.last_name,
                    m.email,
                    m.phone,
                    m.profile_image_url,
                    m.date_of_birth,
                    m.wedding_anniversary,
                    'birthday' as celebration_type,
                    m.date_of_birth as original_date,
                    MAKE_DATE(
                            EXTRACT(YEAR FROM CURRENT_DATE)::int,
                            EXTRACT(MONTH FROM m.date_of_birth)::int,
                            LEAST(
                                    EXTRACT(DAY FROM m.date_of_birth)::int,
                                    CASE
                                        WHEN EXTRACT(MONTH FROM m.date_of_birth) = 2
                                            AND EXTRACT(DAY FROM m.date_of_birth) = 29
                                            AND NOT (EXTRACT(YEAR FROM CURRENT_DATE)::int % 4 = 0 
                                    AND (EXTRACT(YEAR FROM CURRENT_DATE)::int % 100 != 0 
                                        OR EXTRACT(YEAR FROM CURRENT_DATE)::int % 400 = 0))
                                            THEN 28
                                        ELSE EXTRACT(DAY FROM m.date_of_birth)::int
                        END
                            )
                    ) as this_year_date,
                    EXTRACT(YEAR FROM CURRENT_DATE)::int - EXTRACT(YEAR FROM m.date_of_birth)::int as age_or_years
                FROM members m
                WHERE m.church_id = $1
                  AND m.deleted_at IS NULL
                  AND m.status = 'active'
                  AND m.date_of_birth IS NOT NULL
                  AND ($2 = 'all' OR $2 = 'birthday')

                UNION ALL

                -- Anniversaries
                SELECT
                    m.id,
                    m.first_name,
                    m.last_name,
                    m.email,
                    m.phone,
                    m.profile_image_url,
                    m.date_of_birth,
                    m.wedding_anniversary,
                    'anniversary' as celebration_type,
                    m.wedding_anniversary as original_date,
                    MAKE_DATE(
                            EXTRACT(YEAR FROM CURRENT_DATE)::int,
                            EXTRACT(MONTH FROM m.wedding_anniversary)::int,
                            LEAST(
                                    EXTRACT(DAY FROM m.wedding_anniversary)::int,
                                    CASE
                                        WHEN EXTRACT(MONTH FROM m.wedding_anniversary) = 2
                                            AND EXTRACT(DAY FROM m.wedding_anniversary) = 29
                                            AND NOT (EXTRACT(YEAR FROM CURRENT_DATE)::int % 4 = 0 
                                    AND (EXTRACT(YEAR FROM CURRENT_DATE)::int % 100 != 0 
                                        OR EXTRACT(YEAR FROM CURRENT_DATE)::int % 400 = 0))
                                            THEN 28
                                        ELSE EXTRACT(DAY FROM m.wedding_anniversary)::int
                        END
                            )
                    ) as this_year_date,
                    EXTRACT(YEAR FROM CURRENT_DATE)::int - EXTRACT(YEAR FROM m.wedding_anniversary)::int as age_or_years
                FROM members m
                WHERE m.church_id = $1
                  AND m.deleted_at IS NULL
                  AND m.status = 'active'
                  AND m.wedding_anniversary IS NOT NULL
                  AND m.marital_status = 'married'
                  AND ($2 = 'all' OR $2 = 'anniversary')
            ),
                 calculated AS (
                     SELECT
                         c.*,
                         CASE
                             WHEN c.this_year_date >= CURRENT_DATE THEN
                                 (c.this_year_date - CURRENT_DATE)
                             ELSE
                                 (c.this_year_date + INTERVAL '1 year')::date - CURRENT_DATE
            END as days_until,
                CASE 
                    WHEN c.this_year_date < CURRENT_DATE THEN true
                    ELSE false
            END as has_passed_this_year
            FROM celebrations c
        ),
        filtered AS (
            SELECT 
                id,
                first_name,
                last_name,
                email,
                phone,
                profile_image_url,
                date_of_birth,
                wedding_anniversary,
                celebration_type,
                TO_CHAR(this_year_date, 'YYYY-MM-DD') as celebration_date,
                days_until::int,
                age_or_years,
                has_passed_this_year,
                CASE 
                    WHEN has_passed_this_year = false THEN 0 
                    ELSE 1 
                END as sort_group
            FROM calculated
            WHERE 
                CASE 
                    WHEN $3 = 'upcoming' THEN has_passed_this_year = false AND days_until <= $4
            WHEN $3 = 'past' THEN has_passed_this_year = true
            ELSE true
            END
            )
            SELECT * FROM filtered
            ORDER BY
                sort_group ASC,
                CASE
                    WHEN sort_group = 0 THEN days_until
                    ELSE -days_until
                    END ASC
        `;

        const countQuery = `
            WITH celebrations AS (
                SELECT m.id, 'birthday' as celebration_type,
                       MAKE_DATE(
                               EXTRACT(YEAR FROM CURRENT_DATE)::int,
                               EXTRACT(MONTH FROM m.date_of_birth)::int,
                               LEAST(EXTRACT(DAY FROM m.date_of_birth)::int, 28)
                       ) as this_year_date
                FROM members m
                WHERE m.church_id = $1
                  AND m.deleted_at IS NULL
                  AND m.status = 'active'
                  AND m.date_of_birth IS NOT NULL
                  AND ($2 = 'all' OR $2 = 'birthday')

                UNION ALL

                SELECT m.id, 'anniversary' as celebration_type,
                       MAKE_DATE(
                               EXTRACT(YEAR FROM CURRENT_DATE)::int,
                               EXTRACT(MONTH FROM m.wedding_anniversary)::int,
                               LEAST(EXTRACT(DAY FROM m.wedding_anniversary)::int, 28)
                       ) as this_year_date
                FROM members m
                WHERE m.church_id = $1
                  AND m.deleted_at IS NULL
                  AND m.status = 'active'
                  AND m.wedding_anniversary IS NOT NULL
                  AND m.marital_status = 'married'
                  AND ($2 = 'all' OR $2 = 'anniversary')
            ),
                 calculated AS (
                     SELECT *,
                            CASE WHEN this_year_date < CURRENT_DATE THEN true ELSE false END as has_passed_this_year,
                            CASE
                                WHEN this_year_date >= CURRENT_DATE THEN (this_year_date - CURRENT_DATE)
                                ELSE (this_year_date + INTERVAL '1 year')::date - CURRENT_DATE
            END as days_until
            FROM celebrations
        )
            SELECT COUNT(*) as total FROM calculated
            WHERE
                CASE
                    WHEN $3 = 'upcoming' THEN has_passed_this_year = false AND days_until <= $4
                    WHEN $3 = 'past' THEN has_passed_this_year = true
                    ELSE true
                    END
        `;

        const offset = (page - 1) * limit;

        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, [churchId, type, period, days]),
            pool.query(query + ` LIMIT $5 OFFSET $6`, [churchId, type, period, days, limit, offset])
        ]);

        const total = parseInt(countResult.rows[0].total, 10);

        const celebrations = dataResult.rows.map(row => ({
            id: row.id,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            phone: row.phone,
            profile_image_url: row.profile_image_url,
            date_of_birth: row.date_of_birth,
            wedding_anniversary: row.wedding_anniversary,
            celebration_type: row.celebration_type,
            celebration_date: row.celebration_date,
            days_until: row.days_until,
            has_passed_this_year: row.has_passed_this_year,
            age: row.celebration_type === 'birthday' ? row.age_or_years : undefined,
            years: row.celebration_type === 'anniversary' ? row.age_or_years : undefined,
        }));

        return {
            celebrations,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findAll(filters: MemberFilters): Promise<PaginatedMembers> {
        const {
            churchId,
            search,
            status,
            gender,
            maritalStatus,
            familyId,
            hasFamily,
            hasUserAccount,
            profileCompleted,
            page = 1,
            limit = 20,
            sortBy = 'created_at',
            sortOrder = 'desc',
        } = filters;

        let whereClause = 'WHERE church_id = $1 AND deleted_at IS NULL';
        const values: any[] = [churchId];
        let paramIndex = 2;

        if (search) {
            whereClause += ` AND (
                LOWER(first_name) LIKE LOWER($${paramIndex}) OR 
                LOWER(last_name) LIKE LOWER($${paramIndex}) OR 
                LOWER(email) LIKE LOWER($${paramIndex}) OR
                phone LIKE $${paramIndex}
            )`;
            values.push(`%${search}%`);
            paramIndex++;
        }

        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            values.push(status);
            paramIndex++;
        }

        if (gender) {
            whereClause += ` AND gender = $${paramIndex}`;
            values.push(gender);
            paramIndex++;
        }

        if (maritalStatus) {
            whereClause += ` AND marital_status = $${paramIndex}`;
            values.push(maritalStatus);
            paramIndex++;
        }

        if (familyId) {
            whereClause += ` AND family_id = $${paramIndex}`;
            values.push(familyId);
            paramIndex++;
        }

        if (hasFamily !== undefined) {
            if (hasFamily) {
                whereClause += ` AND family_id IS NOT NULL`;
            } else {
                whereClause += ` AND family_id IS NULL`;
            }
        }

        if (hasUserAccount !== undefined) {
            if (hasUserAccount) {
                whereClause += ` AND user_id IS NOT NULL`;
            } else {
                whereClause += ` AND user_id IS NULL`;
            }
        }

        if (profileCompleted !== undefined) {
            if (profileCompleted) {
                whereClause += ` AND profile_completed_at IS NOT NULL`;
            } else {
                whereClause += ` AND profile_completed_at IS NULL AND profile_update_token IS NOT NULL`;
            }
        }

        const validSortColumns = ['first_name', 'last_name', 'email', 'created_at', 'updated_at', 'status', 'wedding_anniversary', 'profile_completed_at'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

        const countQuery = `SELECT COUNT(*) FROM members ${whereClause}`;
        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count, 10);

        const offset = (page - 1) * limit;
        const dataQuery = `
            SELECT * FROM members
                              ${whereClause}
            ORDER BY ${sortColumn} ${order}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        values.push(limit, offset);

        const dataResult = await pool.query(dataQuery, values);

        return {
            members: dataResult.rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: string, churchId: string): Promise<Member | null> {
        const query = `
            SELECT * FROM members
            WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
        `;
        const result = await pool.query(query, [id, churchId]);
        return result.rows[0] || null;
    }

    /**
     * Get members by group ID
     */
    async getMembersByGroup(churchId: string, groupId: string): Promise<Member[]> {
        try {
            const query = `
            SELECT m.* 
            FROM members m
            INNER JOIN group_members gm ON m.id = gm.member_id
            WHERE gm.group_id = $1 
              AND m.church_id = $2 
              AND m.deleted_at IS NULL
              AND gm.deleted_at IS NULL
            ORDER BY m.first_name, m.last_name
        `;

            const result = await pool.query(query, [groupId, churchId]);
            return result.rows;
        } catch (error) {
            logger.error('Error in getMembersByGroup:', error);
            throw new AppError('Failed to get members by group', 500);
        }
    }

    /**
     * Search members by name with fuzzy matching
     */
    async searchByName(
        churchId: string,
        firstName: string,
        lastName: string,
        limit: number = 5
    ): Promise<Member[]> {
        try {
            // First try exact match (case-insensitive)
            const exactMatchQuery = `
                SELECT * FROM members
                WHERE church_id = $1 
                    AND deleted_at IS NULL
                    AND LOWER(first_name) = LOWER($2)
                    AND LOWER(last_name) = LOWER($3)
                LIMIT $4
            `;

            const exactResult = await pool.query(exactMatchQuery, [churchId, firstName, lastName, limit]);

            // If we found exact matches, return them
            if (exactResult.rows.length > 0) {
                return exactResult.rows;
            }

            // If no exact match, try fuzzy search
            const fuzzyMatchQuery = `
                SELECT * FROM members
                WHERE church_id = $1 
                    AND deleted_at IS NULL
                    AND (
                        (
                            LOWER(first_name) LIKE LOWER($2) 
                            AND LOWER(last_name) LIKE LOWER($3)
                        )
                        OR
                        (
                            LOWER(first_name) LIKE LOWER($4) 
                            AND LOWER(last_name) LIKE LOWER($5)
                        )
                    )
                ORDER BY 
                    CASE 
                        WHEN LOWER(first_name) = LOWER($6) THEN 0
                        WHEN LOWER(last_name) = LOWER($7) THEN 1
                        ELSE 2
                    END,
                    first_name, last_name
                LIMIT $8
            `;

            const fuzzyResult = await pool.query(fuzzyMatchQuery, [
                churchId,
                `%${firstName}%`,
                `%${lastName}%`,
                `%${lastName}%`,
                `%${firstName}%`,
                firstName,
                lastName,
                limit
            ]);

            return fuzzyResult.rows;
        } catch (error) {
            logger.error('Error in searchByName:', error);
            throw new AppError('Failed to search members by name', 500);
        }
    }

    async findByEmail(email: string, churchId: string): Promise<Member | null> {
        const query = `
            SELECT * FROM members
            WHERE LOWER(email) = LOWER($1) AND church_id = $2 AND deleted_at IS NULL
        `;
        const result = await pool.query(query, [email, churchId]);
        return result.rows[0] || null;
    }

    async findByUserId(userId: string, churchId: string): Promise<Member | null> {
        const client = await pool.connect();

        try {
            const query = `
                SELECT * FROM members
                WHERE user_id = $1 AND church_id = $2 AND deleted_at IS NULL
            `;

            const result = await client.query(query, [userId, churchId]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error in MemberRepository.findByUserId:', error);
            throw new AppError('Failed to fetch member by user ID', 500);
        } finally {
            client.release();
        }
    }

    async findByPhone(phone: string, churchId: string): Promise<Member | null> {
        const query = `
            SELECT * FROM members
            WHERE phone = $1 AND church_id = $2 AND deleted_at IS NULL
        `;
        const result = await pool.query(query, [phone, churchId]);
        return result.rows[0] || null;
    }

    async update(
        id: string,
        churchId: string,
        data: UpdateMemberDTO,
        actorId?: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<Member | null> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get current member data for audit
            const currentMember = await this.findById(id, churchId);
            if (!currentMember) {
                throw new AppError('Member not found', 404);
            }

            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            const fieldMapping: Record<string, string> = {
                firstName: 'first_name',
                lastName: 'last_name',
                email: 'email',
                phone: 'phone',
                gender: 'gender',
                maritalStatus: 'marital_status',
                dateOfBirth: 'date_of_birth',
                weddingAnniversary: 'wedding_anniversary',
                address: 'address',
                city: 'city',
                state: 'state',
                country: 'country',
                postalCode: 'postal_code',
                profileImageUrl: 'profile_image_url',
                status: 'status',
                notes: 'notes',
                updatedBy: 'updated_by',
                familyId: 'family_id',
                familyRole: 'family_role',
                familyRoleOther: 'family_role_other',
            };

            let processedData = { ...data };
            if (data.maritalStatus && data.maritalStatus !== 'married') {
                processedData.weddingAnniversary = null;
            }

            // Track changes for audit
            const changes: Record<string, { old: any; new: any }> = {};

            for (const [key, value] of Object.entries(processedData)) {
                if (value !== undefined && fieldMapping[key]) {
                    const dbField = fieldMapping[key];
                    const oldValue = (currentMember as any)[dbField];

                    if (oldValue !== value) {
                        changes[dbField] = { old: oldValue, new: value };
                    }

                    updates.push(`${fieldMapping[key]} = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                }
            }

            if (updates.length === 0) {
                await client.query('ROLLBACK');
                return currentMember;
            }

            updates.push(`updated_at = NOW()`);

            const query = `
                UPDATE members
                SET ${updates.join(', ')}
                WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1} AND deleted_at IS NULL
                    RETURNING *
            `;
            values.push(id, churchId);

            const result = await client.query(query, values);
            const updatedMember = result.rows[0];

            // Create audit log
            await this.createAuditLog({
                churchId,
                entityType: 'member',
                entityId: id,
                action: 'update',
                actorType: 'admin',
                actorId,
                changes,
                ipAddress,
                userAgent,
            });

            await client.query('COMMIT');

            return updatedMember;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error updating member:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async delete(
        id: string,
        churchId: string,
        actorId?: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<boolean> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get member data for audit
            const member = await this.findById(id, churchId);
            if (!member) {
                throw new AppError('Member not found', 404);
            }

            const query = `
                UPDATE members
                SET deleted_at = NOW(), status = 'inactive'
                WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
            `;
            const result = await client.query(query, [id, churchId]);

            if ((result.rowCount ?? 0) > 0) {
                // Create audit log
                await this.createAuditLog({
                    churchId,
                    entityType: 'member',
                    entityId: id,
                    action: 'delete',
                    actorType: 'admin',
                    actorId,
                    changes: {
                        deleted: {
                            first_name: member.first_name,
                            last_name: member.last_name,
                            email: member.email,
                        }
                    },
                    ipAddress,
                    userAgent,
                });

                await client.query('COMMIT');
                return true;
            }

            await client.query('ROLLBACK');
            return false;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error deleting member:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getStatistics(churchId: string): Promise<MemberStatistics> {
        const statusQuery = `
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'inactive') as inactive
            FROM members
            WHERE church_id = $1 AND deleted_at IS NULL
        `;
        const statusResult = await pool.query(statusQuery, [churchId]);
        const statusData = statusResult.rows[0];

        const genderQuery = `
            SELECT
                COUNT(*) FILTER (WHERE gender = 'male') as male,
                COUNT(*) FILTER (WHERE gender = 'female') as female,
                COUNT(*) FILTER (WHERE gender = 'other') as other,
                COUNT(*) FILTER (WHERE gender IS NULL) as unknown
            FROM members
            WHERE church_id = $1 AND deleted_at IS NULL
        `;
        const genderResult = await pool.query(genderQuery, [churchId]);
        const genderData = genderResult.rows[0];

        const maritalQuery = `
            SELECT
                COUNT(*) FILTER (WHERE marital_status = 'single') as single,
                COUNT(*) FILTER (WHERE marital_status = 'married') as married,
                COUNT(*) FILTER (WHERE marital_status = 'divorced') as divorced,
                COUNT(*) FILTER (WHERE marital_status = 'widowed') as widowed,
                COUNT(*) FILTER (WHERE marital_status IS NULL) as unknown
            FROM members
            WHERE church_id = $1 AND deleted_at IS NULL
        `;
        const maritalResult = await pool.query(maritalQuery, [churchId]);
        const maritalData = maritalResult.rows[0];

        const growthQuery = `
            SELECT
                COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as new_this_month,
                COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
                         AND created_at < DATE_TRUNC('month', CURRENT_DATE)) as last_month
            FROM members
            WHERE church_id = $1 AND deleted_at IS NULL
        `;
        const growthResult = await pool.query(growthQuery, [churchId]);
        const growthData = growthResult.rows[0];

        const birthdayQuery = `
            SELECT COUNT(*) as upcoming_birthdays
            FROM members
            WHERE church_id = $1
              AND deleted_at IS NULL
              AND date_of_birth IS NOT NULL
              AND (
                (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(DAY FROM date_of_birth) >= EXTRACT(DAY FROM CURRENT_DATE))
                    OR
                (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '30 days')
                    AND EXTRACT(DAY FROM date_of_birth) <= EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '30 days'))
                )
        `;
        const birthdayResult = await pool.query(birthdayQuery, [churchId]);

        const anniversaryQuery = `
            SELECT COUNT(*) as upcoming_anniversaries
            FROM members
            WHERE church_id = $1
              AND deleted_at IS NULL
              AND wedding_anniversary IS NOT NULL
              AND marital_status = 'married'
              AND (
                (EXTRACT(MONTH FROM wedding_anniversary) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(DAY FROM wedding_anniversary) >= EXTRACT(DAY FROM CURRENT_DATE))
                    OR
                (EXTRACT(MONTH FROM wedding_anniversary) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '30 days')
                    AND EXTRACT(DAY FROM wedding_anniversary) <= EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '30 days'))
                )
        `;
        const anniversaryResult = await pool.query(anniversaryQuery, [churchId]);

        const familyQuery = `
            SELECT
                COUNT(*) FILTER (WHERE family_id IS NOT NULL) as members_in_families,
                COUNT(*) FILTER (WHERE family_id IS NULL) as members_without_family
            FROM members
            WHERE church_id = $1 AND deleted_at IS NULL
        `;
        const familyResult = await pool.query(familyQuery, [churchId]);
        const familyData = familyResult.rows[0];

        const userAccountQuery = `
            SELECT
                COUNT(*) FILTER (WHERE user_id IS NOT NULL) as members_with_user_accounts
            FROM members
            WHERE church_id = $1 AND deleted_at IS NULL
        `;
        const userAccountResult = await pool.query(userAccountQuery, [churchId]);
        const userAccountData = userAccountResult.rows[0];

        const profileQuery = `
            SELECT
                COUNT(*) FILTER (WHERE profile_completed_at IS NOT NULL) as profiles_completed,
                COUNT(*) FILTER (WHERE profile_completed_at IS NULL AND profile_update_token IS NOT NULL) as profiles_pending
            FROM members
            WHERE church_id = $1 AND deleted_at IS NULL
        `;
        const profileResult = await pool.query(profileQuery, [churchId]);
        const profileData = profileResult.rows[0];

        const newThisMonth = parseInt(growthData.new_this_month, 10);
        const lastMonth = parseInt(growthData.last_month, 10);
        const growthPercentage = lastMonth > 0 ? Math.round(((newThisMonth - lastMonth) / lastMonth) * 100) : 0;

        return {
            total: parseInt(statusData.total, 10),
            active: parseInt(statusData.active, 10),
            inactive: parseInt(statusData.inactive, 10),
            byGender: {
                male: parseInt(genderData.male, 10),
                female: parseInt(genderData.female, 10),
                other: parseInt(genderData.other, 10),
                unknown: parseInt(genderData.unknown, 10),
            },
            byMaritalStatus: {
                single: parseInt(maritalData.single, 10),
                married: parseInt(maritalData.married, 10),
                divorced: parseInt(maritalData.divorced, 10),
                widowed: parseInt(maritalData.widowed, 10),
                unknown: parseInt(maritalData.unknown, 10),
            },
            newThisMonth,
            growthPercentage,
            upcomingBirthdays: parseInt(birthdayResult.rows[0].upcoming_birthdays, 10),
            upcomingAnniversaries: parseInt(anniversaryResult.rows[0].upcoming_anniversaries, 10),
            membersInFamilies: parseInt(familyData.members_in_families, 10),
            membersWithoutFamily: parseInt(familyData.members_without_family, 10),
            membersWithUserAccounts: parseInt(userAccountData.members_with_user_accounts, 10),
            profilesCompleted: parseInt(profileData.profiles_completed, 10),
            profilesPending: parseInt(profileData.profiles_pending, 10),
        };
    }

    async search(query: string, churchId: string, limit: number = 10): Promise<Member[]> {
        const searchQuery = `
            SELECT * FROM members
            WHERE church_id = $1
              AND deleted_at IS NULL
              AND (
                LOWER(first_name) LIKE LOWER($2) OR
                LOWER(last_name) LIKE LOWER($2) OR
                LOWER(email) LIKE LOWER($2) OR
                phone LIKE $2
                )
            ORDER BY first_name, last_name
                LIMIT $3
        `;
        const result = await pool.query(searchQuery, [churchId, `%${query}%`, limit]);
        return result.rows;
    }

    async getUpcomingAnniversaries(churchId: string, days: number = 30): Promise<Member[]> {
        const query = `
            SELECT * FROM members
            WHERE church_id = $1
              AND deleted_at IS NULL
              AND wedding_anniversary IS NOT NULL
              AND marital_status = 'married'
              AND status = 'active'
              AND (
                (EXTRACT(MONTH FROM wedding_anniversary) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(DAY FROM wedding_anniversary) >= EXTRACT(DAY FROM CURRENT_DATE))
                    OR
                (EXTRACT(MONTH FROM wedding_anniversary) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '${days} days')
                    AND EXTRACT(DAY FROM wedding_anniversary) <= EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '${days} days'))
                )
            ORDER BY
                EXTRACT(MONTH FROM wedding_anniversary),
                EXTRACT(DAY FROM wedding_anniversary)
        `;
        const result = await pool.query(query, [churchId]);
        return result.rows;
    }

    async linkUserToMember(memberId: string, userId: string, churchId: string): Promise<Member | null> {
        const query = `
            UPDATE members
            SET user_id = $1, updated_at = NOW()
            WHERE id = $2 AND church_id = $3 AND deleted_at IS NULL
                RETURNING *
        `;
        const result = await pool.query(query, [userId, memberId, churchId]);
        return result.rows[0] || null;
    }

    async unlinkUserFromMember(memberId: string, churchId: string): Promise<Member | null> {
        const query = `
            UPDATE members
            SET user_id = NULL, updated_at = NOW()
            WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
                RETURNING *
        `;
        const result = await pool.query(query, [memberId, churchId]);
        return result.rows[0] || null;
    }

    /**
     * Get audit logs for a member
     */
    async getAuditLogs(
        memberId: string,
        churchId: string,
        options?: {
            page?: number;
            limit?: number;
        }
    ): Promise<{ logs: AuditLog[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const offset = (page - 1) * limit;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM audit_logs
            WHERE church_id = $1 AND entity_type = 'member' AND entity_id = $2
        `;

        const dataQuery = `
            SELECT *
            FROM audit_logs
            WHERE church_id = $1 AND entity_type = 'member' AND entity_id = $2
            ORDER BY created_at DESC
                LIMIT $3 OFFSET $4
        `;

        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, [churchId, memberId]),
            pool.query(dataQuery, [churchId, memberId, limit, offset])
        ]);

        const total = parseInt(countResult.rows[0].total, 10);

        return {
            logs: dataResult.rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}