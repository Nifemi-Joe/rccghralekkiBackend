import { pool } from '@config/database';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';
import { CreateChurchDTO, UpdateChurchDTO } from '@/dtos/church.types';
import crypto from 'crypto';

// ============================================================================
// INTERFACES
// ============================================================================

export interface Church {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logo_url: string | null;
    timezone: string;
    currency: string;
    subscription_plan: string;
    subscription_status: string;
    setup_status: 'pending_admin' | 'active';
    admin_setup_skipped: boolean;
    trial_ends_at: Date;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface ChurchQueryOptions {
    limit?: number;
    offset?: number;
    status?: 'pending_admin' | 'active';
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedChurches {
    churches: Church[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ============================================================================
// REPOSITORY CLASS
// ============================================================================

export class ChurchRepository {

    // ==========================================================================
    // HELPER METHODS
    // ==========================================================================

    /**
     * Generate unique slug from church name
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') + '-' + crypto.randomBytes(4).toString('hex');
    }

    /**
     * Convert camelCase to snake_case
     */
    private camelToSnake(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    // ==========================================================================
    // CREATE OPERATIONS
    // ==========================================================================

    /**
     * Create a new church
     */
    async create(
        data: CreateChurchDTO,
        setupStatus: 'pending_admin' | 'active' = 'pending_admin'
    ): Promise<Church> {
        const client = await pool.connect();

        try {
            const slug = this.generateSlug(data.name);

            const query = `
        INSERT INTO churches (
          name, slug, address, city, state, country,
          phone, email, website, timezone, currency,
          subscription_plan, subscription_status, setup_status,
          admin_setup_skipped, trial_ends_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;

            const values = [
                data.name.trim(),
                slug,
                data.address?.trim() || null,
                data.city?.trim() || null,
                data.state?.trim() || null,
                data.country?.trim() || null,
                data.phone?.trim() || null,
                data.email?.toLowerCase().trim() || null,
                data.website?.trim() || null,
                data.timezone || 'UTC',
                data.currency || 'USD',
                'free',
                'trialing',
                setupStatus,
                false,
                new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
            ];

            const result = await client.query(query, values);
            logger.info(`Church created: ${result.rows[0].id} (${data.name})`);
            return result.rows[0];
        } catch (error: any) {
            logger.error('Error in ChurchRepository.create:', error);

            // Handle unique constraint violations
            if (error.code === '23505') {
                if (error.constraint?.includes('slug')) {
                    throw new AppError('Church with similar name already exists', 409);
                }
                if (error.constraint?.includes('name')) {
                    throw new AppError('Church name already exists', 409);
                }
                throw new AppError('Church already exists', 409);
            }

            throw new AppError('Failed to create church', 500);
        } finally {
            client.release();
        }
    }

    // ==========================================================================
    // READ OPERATIONS
    // ==========================================================================

    /**
     * Find church by ID
     */
    async findById(id: string): Promise<Church | null> {
        const client = await pool.connect();

        try {
            const query = `
        SELECT * FROM churches 
        WHERE id = $1 AND deleted_at IS NULL
      `;
            const result = await client.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error in ChurchRepository.findById:', error);
            throw new AppError('Failed to fetch church', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Find church by slug
     */
    async findBySlug(slug: string): Promise<Church | null> {
        const client = await pool.connect();

        try {
            const query = `
        SELECT * FROM churches 
        WHERE slug = $1 AND deleted_at IS NULL
      `;
            const result = await client.query(query, [slug]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error in ChurchRepository.findBySlug:', error);
            throw new AppError('Failed to fetch church', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Find church by name (case-insensitive)
     */
    async findByName(name: string): Promise<Church | null> {
        const client = await pool.connect();

        try {
            const query = `
        SELECT * FROM churches
        WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL
      `;
            const result = await client.query(query, [name.trim()]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error in ChurchRepository.findByName:', error);
            throw new AppError('Failed to fetch church by name', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Find church by email (case-insensitive)
     */
    async findByEmail(email: string): Promise<Church | null> {
        const client = await pool.connect();

        try {
            const query = `
        SELECT * FROM churches
        WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL
      `;
            const result = await client.query(query, [email.trim()]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error in ChurchRepository.findByEmail:', error);
            throw new AppError('Failed to fetch church by email', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Find all churches with pagination and filters
     */
    async findAll(options: ChurchQueryOptions = {}): Promise<PaginatedChurches> {
        const client = await pool.connect();

        try {
            const {
                limit = 10,
                offset = 0,
                status,
                search,
                sortBy = 'created_at',
                sortOrder = 'DESC'
            } = options;

            // Build WHERE clause
            let whereClause = 'WHERE deleted_at IS NULL';
            const values: any[] = [];
            let paramCount = 1;

            if (status) {
                whereClause += ` AND setup_status = $${paramCount}`;
                values.push(status);
                paramCount++;
            }

            if (search) {
                whereClause += ` AND (
          LOWER(name) LIKE LOWER($${paramCount}) OR
          LOWER(email) LIKE LOWER($${paramCount}) OR
          LOWER(city) LIKE LOWER($${paramCount})
        )`;
                values.push(`%${search}%`);
                paramCount++;
            }

            // Count query
            const countQuery = `SELECT COUNT(*) FROM churches ${whereClause}`;
            const countResult = await client.query(countQuery, values);
            const total = parseInt(countResult.rows[0].count, 10);

            // Validate sort column
            const allowedSortColumns = ['created_at', 'updated_at', 'name', 'email', 'setup_status'];
            const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
            const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

            // Data query
            values.push(limit, offset);
            const query = `
        SELECT * FROM churches 
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

            const result = await client.query(query, values);

            const page = Math.floor(offset / limit) + 1;
            const totalPages = Math.ceil(total / limit);

            return {
                churches: result.rows,
                total,
                page,
                limit,
                totalPages
            };
        } catch (error) {
            logger.error('Error in ChurchRepository.findAll:', error);
            throw new AppError('Failed to fetch churches', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Check if church name exists
     */
    async nameExists(name: string, excludeId?: string): Promise<boolean> {
        const client = await pool.connect();

        try {
            let query = `
        SELECT EXISTS(
          SELECT 1 FROM churches 
          WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL
      `;
            const values: any[] = [name.trim()];

            if (excludeId) {
                query += ` AND id != $2`;
                values.push(excludeId);
            }

            query += `) as exists`;

            const result = await client.query(query, values);
            return result.rows[0].exists;
        } catch (error) {
            logger.error('Error in ChurchRepository.nameExists:', error);
            throw new AppError('Failed to check church name', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Check if church email exists
     */
    async emailExists(email: string, excludeId?: string): Promise<boolean> {
        const client = await pool.connect();

        try {
            let query = `
        SELECT EXISTS(
          SELECT 1 FROM churches 
          WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL
      `;
            const values: any[] = [email.trim()];

            if (excludeId) {
                query += ` AND id != $2`;
                values.push(excludeId);
            }

            query += `) as exists`;

            const result = await client.query(query, values);
            return result.rows[0].exists;
        } catch (error) {
            logger.error('Error in ChurchRepository.emailExists:', error);
            throw new AppError('Failed to check church email', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Count total churches
     */
    async count(status?: 'pending_admin' | 'active'): Promise<number> {
        const client = await pool.connect();

        try {
            let query = `SELECT COUNT(*) FROM churches WHERE deleted_at IS NULL`;
            const values: any[] = [];

            if (status) {
                query += ` AND setup_status = $1`;
                values.push(status);
            }

            const result = await client.query(query, values);
            return parseInt(result.rows[0].count, 10);
        } catch (error) {
            logger.error('Error in ChurchRepository.count:', error);
            throw new AppError('Failed to count churches', 500);
        } finally {
            client.release();
        }
    }

    // ==========================================================================
    // UPDATE OPERATIONS
    // ==========================================================================

    /**
     * Update church
     */
    async update(id: string, data: UpdateChurchDTO): Promise<Church | null> {
        const client = await pool.connect();

        try {
            const updates: string[] = [];
            const values: any[] = [];
            let paramCount = 1;

            // Field mappings for camelCase to snake_case
            const fieldMappings: Record<string, string> = {
                logoUrl: 'logo_url',
                subscriptionPlan: 'subscription_plan',
                subscriptionStatus: 'subscription_status',
                setupStatus: 'setup_status',
                adminSetupSkipped: 'admin_setup_skipped',
                trialEndsAt: 'trial_ends_at'
            };

            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined) {
                    const dbField = fieldMappings[key] || this.camelToSnake(key);
                    updates.push(`${dbField} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            });

            if (updates.length === 0) {
                return this.findById(id);
            }

            updates.push(`updated_at = NOW()`);
            values.push(id);

            const query = `
        UPDATE churches 
        SET ${updates.join(', ')} 
        WHERE id = $${paramCount} AND deleted_at IS NULL
        RETURNING *
      `;

            const result = await client.query(query, values);

            if (result.rows[0]) {
                logger.info(`Church updated: ${id}`);
            }

            return result.rows[0] || null;
        } catch (error: any) {
            logger.error('Error in ChurchRepository.update:', error);

            if (error.code === '23505') {
                throw new AppError('Church with this name or email already exists', 409);
            }

            throw new AppError('Failed to update church', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Update church setup status
     */
    async updateSetupStatus(
        id: string,
        status: 'pending_admin' | 'active'
    ): Promise<Church | null> {
        const client = await pool.connect();

        try {
            const query = `
        UPDATE churches
        SET setup_status = $1, updated_at = NOW()
        WHERE id = $2 AND deleted_at IS NULL
        RETURNING *
      `;
            const result = await client.query(query, [status, id]);

            if (result.rows[0]) {
                logger.info(`Church setup status updated to '${status}': ${id}`);
            }

            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error in ChurchRepository.updateSetupStatus:', error);
            throw new AppError('Failed to update church status', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Update subscription
     */
    async updateSubscription(
        id: string,
        plan: string,
        status: string,
        trialEndsAt?: Date
    ): Promise<Church | null> {
        const client = await pool.connect();

        try {
            let query = `
        UPDATE churches
        SET subscription_plan = $1, 
            subscription_status = $2,
            updated_at = NOW()
      `;
            const values: any[] = [plan, status];
            let paramCount = 3;

            if (trialEndsAt) {
                query += `, trial_ends_at = $${paramCount}`;
                values.push(trialEndsAt);
                paramCount++;
            }

            query += ` WHERE id = $${paramCount} AND deleted_at IS NULL RETURNING *`;
            values.push(id);

            const result = await client.query(query, values);

            if (result.rows[0]) {
                logger.info(`Church subscription updated: ${id} - ${plan}/${status}`);
            }

            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error in ChurchRepository.updateSubscription:', error);
            throw new AppError('Failed to update subscription', 500);
        } finally {
            client.release();
        }
    }

    // ==========================================================================
    // DELETE OPERATIONS
    // ==========================================================================

    /**
     * Soft delete church
     */
    async delete(id: string): Promise<boolean> {
        const client = await pool.connect();

        try {
            const query = `
        UPDATE churches 
        SET deleted_at = NOW(), updated_at = NOW() 
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;
            const result = await client.query(query, [id]);

            // ✅ FIX: Handle null rowCount
            const deleted = (result.rowCount ?? 0) > 0;

            if (deleted) {
                logger.info(`Church soft deleted: ${id}`);
            }

            return deleted;
        } catch (error) {
            logger.error('Error in ChurchRepository.delete:', error);
            throw new AppError('Failed to delete church', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Hard delete church (permanent - use with caution)
     */
    async hardDelete(id: string): Promise<boolean> {
        const client = await pool.connect();

        try {
            const query = `DELETE FROM churches WHERE id = $1 RETURNING id`;
            const result = await client.query(query, [id]);

            // ✅ FIX: Handle null rowCount
            const deleted = (result.rowCount ?? 0) > 0;

            if (deleted) {
                logger.warn(`Church permanently deleted: ${id}`);
            }

            return deleted;
        } catch (error) {
            logger.error('Error in ChurchRepository.hardDelete:', error);
            throw new AppError('Failed to permanently delete church', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Restore soft-deleted church
     */
    async restore(id: string): Promise<Church | null> {
        const client = await pool.connect();

        try {
            const query = `
        UPDATE churches 
        SET deleted_at = NULL, updated_at = NOW() 
        WHERE id = $1 AND deleted_at IS NOT NULL
        RETURNING *
      `;
            const result = await client.query(query, [id]);

            if (result.rows[0]) {
                logger.info(`Church restored: ${id}`);
            }

            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error in ChurchRepository.restore:', error);
            throw new AppError('Failed to restore church', 500);
        } finally {
            client.release();
        }
    }

    // ==========================================================================
    // STATISTICS
    // ==========================================================================

    /**
     * Get church statistics
     */
    async getStats(): Promise<{
        total: number;
        active: number;
        pending: number;
        byPlan: Record<string, number>;
        byStatus: Record<string, number>;
        recentlyCreated: number;
    }> {
        const client = await pool.connect();

        try {
            const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE setup_status = 'active') as active,
          COUNT(*) FILTER (WHERE setup_status = 'pending_admin') as pending,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recently_created
        FROM churches 
        WHERE deleted_at IS NULL
      `;

            const planQuery = `
        SELECT subscription_plan, COUNT(*) as count 
        FROM churches 
        WHERE deleted_at IS NULL 
        GROUP BY subscription_plan
      `;

            const statusQuery = `
        SELECT subscription_status, COUNT(*) as count 
        FROM churches 
        WHERE deleted_at IS NULL 
        GROUP BY subscription_status
      `;

            const [mainResult, planResult, statusResult] = await Promise.all([
                client.query(query),
                client.query(planQuery),
                client.query(statusQuery)
            ]);

            const byPlan: Record<string, number> = {};
            planResult.rows.forEach(row => {
                byPlan[row.subscription_plan] = parseInt(row.count, 10);
            });

            const byStatus: Record<string, number> = {};
            statusResult.rows.forEach(row => {
                byStatus[row.subscription_status] = parseInt(row.count, 10);
            });

            return {
                total: parseInt(mainResult.rows[0].total, 10),
                active: parseInt(mainResult.rows[0].active, 10),
                pending: parseInt(mainResult.rows[0].pending, 10),
                byPlan,
                byStatus,
                recentlyCreated: parseInt(mainResult.rows[0].recently_created, 10)
            };
        } catch (error) {
            logger.error('Error in ChurchRepository.getStats:', error);
            throw new AppError('Failed to get church statistics', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Get churches with expiring trials
     */
    async findExpiringTrials(daysUntilExpiry: number = 7): Promise<Church[]> {
        const client = await pool.connect();

        try {
            const query = `
        SELECT * FROM churches 
        WHERE deleted_at IS NULL
          AND subscription_status = 'trialing'
          AND trial_ends_at <= NOW() + INTERVAL '1 day' * $1
          AND trial_ends_at > NOW()
        ORDER BY trial_ends_at ASC
      `;

            const result = await client.query(query, [daysUntilExpiry]);
            return result.rows;
        } catch (error) {
            logger.error('Error in ChurchRepository.findExpiringTrials:', error);
            throw new AppError('Failed to fetch expiring trials', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Get churches with expired trials
     */
    async findExpiredTrials(): Promise<Church[]> {
        const client = await pool.connect();

        try {
            const query = `
        SELECT * FROM churches 
        WHERE deleted_at IS NULL
          AND subscription_status = 'trialing'
          AND trial_ends_at < NOW()
        ORDER BY trial_ends_at ASC
      `;

            const result = await client.query(query);
            return result.rows;
        } catch (error) {
            logger.error('Error in ChurchRepository.findExpiredTrials:', error);
            throw new AppError('Failed to fetch expired trials', 500);
        } finally {
            client.release();
        }
    }
}