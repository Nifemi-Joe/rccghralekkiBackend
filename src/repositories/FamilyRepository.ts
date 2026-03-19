// src/repositories/FamilyRepository.ts
import { pool } from '@config/database';
import {
    Family,
    FamilyMember,
    CreateFamilyDTO,
    UpdateFamilyDTO,
    FamilyFilters,
    AddFamilyMemberDTO,
    FamilyStatistics,
    PaginatedFamilies
} from '@/dtos/family.types';
import logger from '@config/logger';

export class FamilyRepository {

    // ============================================================================
    // FAMILY CRUD
    // ============================================================================

    async create(churchId: string, data: CreateFamilyDTO, createdBy?: string): Promise<Family> {
        const query = `
      INSERT INTO families (
        church_id, name, head_id, address, city, state, postal_code, 
        country, home_phone, email, wedding_anniversary, notes, 
        profile_image_url, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

        const values = [
            churchId,
            data.name,
            data.headId || null,
            data.address || null,
            data.city || null,
            data.state || null,
            data.postalCode || null,
            data.country || 'Ghana',
            data.homePhone || null,
            data.email || null,
            data.weddingAnniversary || null,
            data.notes || null,
            data.profileImageUrl || null,
            createdBy || null,
        ];

        const result = await pool.query(query, values);
        return this.mapToFamily(result.rows[0]);
    }

    async findById(id: string, churchId?: string): Promise<Family | null> {
        let query = `
      SELECT f.*, 
             m.first_name || ' ' || m.last_name as head_name,
             (SELECT COUNT(*) FROM members WHERE family_id = f.id AND deleted_at IS NULL) as member_count
      FROM families f
      LEFT JOIN members m ON f.head_id = m.id
      WHERE f.id = $1
    `;

        const values: any[] = [id];

        if (churchId) {
            query += ` AND f.church_id = $2`;
            values.push(churchId);
        }

        const result = await pool.query(query, values);
        return result.rows[0] ? this.mapToFamily(result.rows[0]) : null;
    }

    async findAll(filters: FamilyFilters): Promise<PaginatedFamilies> {
        let whereClause = 'WHERE f.church_id = $1';
        const values: any[] = [filters.churchId];
        let paramCount = 1;

        if (filters.search) {
            paramCount++;
            whereClause += ` AND (
        f.name ILIKE $${paramCount} OR
        f.address ILIKE $${paramCount} OR
        f.city ILIKE $${paramCount}
      )`;
            values.push(`%${filters.search}%`);
        }

        if (filters.isActive !== undefined) {
            paramCount++;
            whereClause += ` AND f.is_active = $${paramCount}`;
            values.push(filters.isActive);
        }

        const countQuery = `
      SELECT COUNT(*) as total
      FROM families f
      ${whereClause}
    `;

        const dataQuery = `
      SELECT f.*, 
             m.first_name || ' ' || m.last_name as head_name,
             (SELECT COUNT(*) FROM members WHERE family_id = f.id AND deleted_at IS NULL) as member_count
      FROM families f
      LEFT JOIN members m ON f.head_id = m.id
      ${whereClause}
      ORDER BY f.name ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

        const countValues = values.slice();
        values.push(filters.limit, (filters.page - 1) * filters.limit);

        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, countValues),
            pool.query(dataQuery, values)
        ]);

        const total = parseInt(countResult.rows[0].total);

        return {
            families: dataResult.rows.map(row => this.mapToFamily(row)),
            pagination: {
                total,
                page: filters.page,
                limit: filters.limit,
                totalPages: Math.ceil(total / filters.limit),
            },
        };
    }

    async update(id: string, churchId: string, data: UpdateFamilyDTO): Promise<Family | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 0;

        const fieldMappings: Record<string, string> = {
            name: 'name',
            headId: 'head_id',
            address: 'address',
            city: 'city',
            state: 'state',
            postalCode: 'postal_code',
            country: 'country',
            homePhone: 'home_phone',
            email: 'email',
            weddingAnniversary: 'wedding_anniversary',
            notes: 'notes',
            profileImageUrl: 'profile_image_url',
            isActive: 'is_active',
        };

        for (const [key, dbField] of Object.entries(fieldMappings)) {
            if (data[key as keyof UpdateFamilyDTO] !== undefined) {
                paramCount++;
                fields.push(`${dbField} = $${paramCount}`);
                values.push(data[key as keyof UpdateFamilyDTO] || null);
            }
        }

        if (fields.length === 0) {
            return this.findById(id, churchId);
        }

        paramCount++;
        values.push(id);
        paramCount++;
        values.push(churchId);

        const query = `
      UPDATE families
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount - 1} AND church_id = $${paramCount}
      RETURNING *
    `;

        const result = await pool.query(query, values);

        if (result.rows[0]) {
            return this.findById(id, churchId);
        }
        return null;
    }

    async delete(id: string, churchId: string): Promise<boolean> {
        // First, remove family_id from all members in this family
        await pool.query(`
      UPDATE members 
      SET family_id = NULL, family_role = NULL, family_role_other = NULL, updated_at = NOW()
      WHERE family_id = $1
    `, [id]);

        const result = await pool.query(
            'DELETE FROM families WHERE id = $1 AND church_id = $2',
            [id, churchId]
        );
        return result.rowCount !== null && result.rowCount > 0;
    }

    // ============================================================================
    // FAMILY MEMBERS
    // ============================================================================

    async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
        const query = `
      SELECT 
        m.id,
        m.id as member_id,
        m.family_id,
        m.first_name,
        m.last_name,
        m.family_role,
        m.family_role_other,
        m.email,
        m.phone,
        m.gender,
        m.date_of_birth,
        m.profile_image_url,
        CASE WHEN f.head_id = m.id THEN true ELSE false END as is_head
      FROM members m
      LEFT JOIN families f ON m.family_id = f.id
      WHERE m.family_id = $1 AND m.deleted_at IS NULL
      ORDER BY 
        CASE WHEN f.head_id = m.id THEN 0 ELSE 1 END,
        CASE m.family_role 
          WHEN 'father' THEN 1 
          WHEN 'mother' THEN 2 
          WHEN 'son' THEN 3 
          WHEN 'daughter' THEN 4 
          ELSE 5 
        END,
        m.date_of_birth ASC NULLS LAST,
        m.first_name ASC
    `;

        const result = await pool.query(query, [familyId]);
        return result.rows.map(row => this.mapToFamilyMember(row));
    }

    async addMember(familyId: string, data: AddFamilyMemberDTO): Promise<boolean> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Update the member's family information
            const updateQuery = `
        UPDATE members
        SET family_id = $1, 
            family_role = $2, 
            family_role_other = $3,
            updated_at = NOW()
        WHERE id = $4 AND deleted_at IS NULL
        RETURNING id
      `;

            const result = await client.query(updateQuery, [
                familyId,
                data.familyRole,
                data.familyRoleOther || null,
                data.memberId,
            ]);

            if (result.rowCount === 0) {
                await client.query('ROLLBACK');
                return false;
            }

            // If this member is the head, update the family's head_id
            if (data.isHead) {
                await client.query(
                    'UPDATE families SET head_id = $1, updated_at = NOW() WHERE id = $2',
                    [data.memberId, familyId]
                );
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async removeMember(familyId: string, memberId: string): Promise<boolean> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Check if member is the head
            const familyResult = await client.query(
                'SELECT head_id FROM families WHERE id = $1',
                [familyId]
            );

            if (familyResult.rows[0]?.head_id === memberId) {
                // Clear head_id from family
                await client.query(
                    'UPDATE families SET head_id = NULL, updated_at = NOW() WHERE id = $1',
                    [familyId]
                );
            }

            // Remove member from family
            const result = await client.query(`
        UPDATE members
        SET family_id = NULL, family_role = NULL, family_role_other = NULL, updated_at = NOW()
        WHERE id = $1 AND family_id = $2
      `, [memberId, familyId]);

            await client.query('COMMIT');
            return result.rowCount !== null && result.rowCount > 0;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updateMember(familyId: string, memberId: string, data: {
        familyRole?: string;
        familyRoleOther?: string;
        isHead?: boolean;
    }): Promise<boolean> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const fields: string[] = [];
            const values: any[] = [];
            let paramCount = 0;

            if (data.familyRole !== undefined) {
                paramCount++;
                fields.push(`family_role = $${paramCount}`);
                values.push(data.familyRole);
            }

            if (data.familyRoleOther !== undefined) {
                paramCount++;
                fields.push(`family_role_other = $${paramCount}`);
                values.push(data.familyRoleOther || null);
            }

            if (fields.length > 0) {
                paramCount++;
                values.push(memberId);
                paramCount++;
                values.push(familyId);

                await client.query(`
          UPDATE members
          SET ${fields.join(', ')}, updated_at = NOW()
          WHERE id = $${paramCount - 1} AND family_id = $${paramCount}
        `, values);
            }

            // Handle head status
            if (data.isHead === true) {
                await client.query(
                    'UPDATE families SET head_id = $1, updated_at = NOW() WHERE id = $2',
                    [memberId, familyId]
                );
            } else if (data.isHead === false) {
                // Only clear if this member is currently the head
                await client.query(
                    'UPDATE families SET head_id = NULL, updated_at = NOW() WHERE id = $1 AND head_id = $2',
                    [familyId, memberId]
                );
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // STATISTICS
    // ============================================================================

    async getStatistics(churchId: string): Promise<FamilyStatistics> {
        const query = `
      WITH family_stats AS (
        SELECT 
          f.id,
          COUNT(m.id) as member_count,
          COUNT(CASE WHEN m.family_role = 'father' THEN 1 END) as has_father,
          COUNT(CASE WHEN m.family_role = 'mother' THEN 1 END) as has_mother
        FROM families f
        LEFT JOIN members m ON f.id = m.family_id AND m.deleted_at IS NULL
        WHERE f.church_id = $1
        GROUP BY f.id
      )
      SELECT 
        COUNT(DISTINCT f.id) as total_families,
        COUNT(DISTINCT CASE WHEN f.is_active = true THEN f.id END) as active_families,
        COALESCE(SUM(fs.member_count), 0) as total_family_members,
        COALESCE(AVG(NULLIF(fs.member_count, 0)), 0) as average_family_size,
        COUNT(DISTINCT CASE WHEN fs.has_father > 0 AND fs.has_mother > 0 THEN f.id END) as families_with_both_parents,
        COUNT(DISTINCT CASE WHEN (fs.has_father > 0 OR fs.has_mother > 0) AND NOT (fs.has_father > 0 AND fs.has_mother > 0) THEN f.id END) as single_parent_families,
        COUNT(DISTINCT CASE WHEN f.created_at > NOW() - INTERVAL '30 days' THEN f.id END) as recently_added
      FROM families f
      LEFT JOIN family_stats fs ON f.id = fs.id
      WHERE f.church_id = $1
    `;

        const result = await pool.query(query, [churchId]);
        const row = result.rows[0];

        return {
            totalFamilies: parseInt(row.total_families) || 0,
            activeFamilies: parseInt(row.active_families) || 0,
            totalFamilyMembers: parseInt(row.total_family_members) || 0,
            averageFamilySize: parseFloat(row.average_family_size) || 0,
            familiesWithBothParents: parseInt(row.families_with_both_parents) || 0,
            singleParentFamilies: parseInt(row.single_parent_families) || 0,
            recentlyAdded: parseInt(row.recently_added) || 0,
        };
    }

    // ============================================================================
    // HELPERS
    // ============================================================================

    private mapToFamily(row: any): Family {
        return {
            id: row.id,
            churchId: row.church_id,
            name: row.name,
            headId: row.head_id,
            headName: row.head_name,
            address: row.address,
            city: row.city,
            state: row.state,
            postalCode: row.postal_code,
            country: row.country,
            homePhone: row.home_phone,
            email: row.email,
            weddingAnniversary: row.wedding_anniversary,
            notes: row.notes,
            profileImageUrl: row.profile_image_url,
            isActive: row.is_active,
            memberCount: row.member_count ? parseInt(row.member_count) : 0,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    private mapToFamilyMember(row: any): FamilyMember {
        return {
            id: row.id,
            memberId: row.member_id,
            familyId: row.family_id,
            firstName: row.first_name,
            lastName: row.last_name,
            familyRole: row.family_role,
            familyRoleOther: row.family_role_other,
            email: row.email,
            phone: row.phone,
            gender: row.gender,
            dateOfBirth: row.date_of_birth,
            profileImageUrl: row.profile_image_url,
            isHead: row.is_head || false,
        };
    }
}