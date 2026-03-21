"use strict";
// @/repositories/UserRepository.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const database_1 = require("@config/database");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
// ============================================================================
// REPOSITORY CLASS
// ============================================================================
class UserRepository {
    // ==========================================================================
    // CREATE OPERATIONS
    // ==========================================================================
    /**
     * Create a new user
     */
    async create(data) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                INSERT INTO users (
                    church_id,
                    email,
                    password_hash,
                    first_name,
                    last_name,
                    phone_number,
                    country,
                    membership_size,
                    role,
                    status,
                    profile_completed,
                    is_temporary_password,
                    must_reset_password,
                    email_verified,
                    profile_image_url
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    RETURNING *
            `;
            const values = [
                data.churchId,
                data.email.toLowerCase().trim(),
                data.passwordHash,
                data.firstName.trim(),
                data.lastName.trim(),
                data.phoneNumber?.trim() || null,
                data.country?.trim() || null,
                data.membershipSize || null,
                data.role || 'member',
                data.status || 'active',
                data.profileCompleted ?? false,
                data.isTemporaryPassword ?? false,
                data.mustResetPassword ?? false,
                data.emailVerified ?? false,
                data.profileImageUrl || null
            ];
            const result = await client.query(query, values);
            logger_1.default.info(`User created: ${result.rows[0].id} (${data.email})`);
            return result.rows[0];
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.create:', error);
            if (error.code === '23505') {
                if (error.constraint?.includes('email')) {
                    throw new AppError_1.AppError('Email already exists', 409);
                }
                throw new AppError_1.AppError('User already exists', 409);
            }
            if (error.code === '23503') {
                throw new AppError_1.AppError('Invalid church ID', 400);
            }
            throw new AppError_1.AppError('Failed to create user', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Bulk create users
     */
    async createMany(users) {
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            const createdUsers = [];
            for (const userData of users) {
                const query = `
                    INSERT INTO users (
                        church_id, email, password_hash, first_name, last_name,
                        phone_number, country, membership_size, role, status,
                        profile_completed, is_temporary_password, must_reset_password,
                        email_verified, profile_image_url
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                        RETURNING *
                `;
                const values = [
                    userData.churchId,
                    userData.email.toLowerCase().trim(),
                    userData.passwordHash,
                    userData.firstName.trim(),
                    userData.lastName.trim(),
                    userData.phoneNumber?.trim() || null,
                    userData.country?.trim() || null,
                    userData.membershipSize || null,
                    userData.role || 'member',
                    userData.status || 'active',
                    userData.profileCompleted ?? false,
                    userData.isTemporaryPassword ?? false,
                    userData.mustResetPassword ?? false,
                    userData.emailVerified ?? false,
                    userData.profileImageUrl || null
                ];
                const result = await client.query(query, values);
                createdUsers.push(result.rows[0]);
            }
            await client.query('COMMIT');
            logger_1.default.info(`Bulk created ${createdUsers.length} users`);
            return createdUsers;
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.default.error('Error in UserRepository.createMany:', error);
            if (error.code === '23505') {
                throw new AppError_1.AppError('One or more emails already exist', 409);
            }
            throw new AppError_1.AppError('Failed to create users', 500);
        }
        finally {
            client.release();
        }
    }
    // ==========================================================================
    // READ OPERATIONS
    // ==========================================================================
    /**
     * Find user by ID (includes password_hash)
     */
    async findById(id) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                SELECT * FROM users
                WHERE id = $1 AND deleted_at IS NULL
            `;
            const result = await client.query(query, [id]);
            return result.rows[0] || null;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.findById:', error);
            throw new AppError_1.AppError('Failed to fetch user', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Find user by ID (without password_hash)
     */
    async findByIdSafe(id) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                SELECT
                    id, church_id, email, first_name, last_name, phone_number,
                    country, membership_size, role, status, profile_completed,
                    is_temporary_password, must_reset_password, email_verified,
                    email_verified_at, last_login_at, profile_image_url,
                    created_at, updated_at, deleted_at
                FROM users
                WHERE id = $1 AND deleted_at IS NULL
            `;
            const result = await client.query(query, [id]);
            return result.rows[0] || null;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.findByIdSafe:', error);
            throw new AppError_1.AppError('Failed to fetch user', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Find user by email (includes password_hash for auth)
     */
    async findByEmail(email) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                SELECT * FROM users
                WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL
            `;
            const result = await client.query(query, [email.trim()]);
            return result.rows[0] || null;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.findByEmail:', error);
            throw new AppError_1.AppError('Failed to fetch user', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Find user by email (without password_hash)
     */
    async findByEmailSafe(email) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                SELECT
                    id, church_id, email, first_name, last_name, phone_number,
                    country, membership_size, role, status, profile_completed,
                    is_temporary_password, must_reset_password, email_verified,
                    email_verified_at, last_login_at, profile_image_url,
                    created_at, updated_at, deleted_at
                FROM users
                WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL
            `;
            const result = await client.query(query, [email.trim()]);
            return result.rows[0] || null;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.findByEmailSafe:', error);
            throw new AppError_1.AppError('Failed to fetch user', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Find users by church ID with pagination and filters
     */
    async findByChurchId(churchId, options = {}) {
        const client = await database_1.pool.connect();
        try {
            const { limit = 10, offset = 0, role, status, search, sortBy = 'created_at', sortOrder = 'DESC', emailVerified, profileCompleted } = options;
            let whereClause = 'WHERE church_id = $1 AND deleted_at IS NULL';
            const values = [churchId];
            let paramCount = 2;
            if (role) {
                if (Array.isArray(role)) {
                    whereClause += ` AND role = ANY($${paramCount})`;
                    values.push(role);
                }
                else {
                    whereClause += ` AND role = $${paramCount}`;
                    values.push(role);
                }
                paramCount++;
            }
            if (status) {
                if (Array.isArray(status)) {
                    whereClause += ` AND status = ANY($${paramCount})`;
                    values.push(status);
                }
                else {
                    whereClause += ` AND status = $${paramCount}`;
                    values.push(status);
                }
                paramCount++;
            }
            if (emailVerified !== undefined) {
                whereClause += ` AND email_verified = $${paramCount}`;
                values.push(emailVerified);
                paramCount++;
            }
            if (profileCompleted !== undefined) {
                whereClause += ` AND profile_completed = $${paramCount}`;
                values.push(profileCompleted);
                paramCount++;
            }
            if (search) {
                whereClause += ` AND (
          LOWER(first_name) LIKE LOWER($${paramCount}) OR
          LOWER(last_name) LIKE LOWER($${paramCount}) OR
          LOWER(email) LIKE LOWER($${paramCount}) OR
          LOWER(CONCAT(first_name, ' ', last_name)) LIKE LOWER($${paramCount})
        )`;
                values.push(`%${search}%`);
                paramCount++;
            }
            const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
            const countResult = await client.query(countQuery, values);
            const total = parseInt(countResult.rows[0].count, 10);
            const allowedSortColumns = [
                'created_at', 'updated_at', 'first_name', 'last_name',
                'email', 'role', 'status', 'last_login_at'
            ];
            const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
            const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
            values.push(limit, offset);
            const query = `
                SELECT
                    id, church_id, email, first_name, last_name, phone_number,
                    country, membership_size, role, status, profile_completed,
                    is_temporary_password, must_reset_password, email_verified,
                    email_verified_at, last_login_at, profile_image_url,
                    created_at, updated_at, deleted_at
                FROM users
                         ${whereClause}
                ORDER BY ${safeSortBy} ${safeSortOrder}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
            `;
            const result = await client.query(query, values);
            const page = Math.floor(offset / limit) + 1;
            const totalPages = Math.ceil(total / limit);
            return {
                users: result.rows,
                total,
                page,
                limit,
                totalPages
            };
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.findByChurchId:', error);
            throw new AppError_1.AppError('Failed to fetch users', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Find all admins and pastors for a church (without password)
     */
    async findAdminsByChurchId(churchId) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                SELECT
                    id, church_id, email, first_name, last_name, phone_number,
                    country, membership_size, role, status, profile_completed,
                    is_temporary_password, must_reset_password, email_verified,
                    email_verified_at, last_login_at, profile_image_url,
                    created_at, updated_at, deleted_at
                FROM users
                WHERE church_id = $1
                  AND role IN ('admin', 'pastor', 'super_admin')
                  AND deleted_at IS NULL
                ORDER BY
                    CASE role
                        WHEN 'super_admin' THEN 1
                        WHEN 'admin' THEN 2
                        WHEN 'pastor' THEN 3
                        END,
                    created_at ASC
            `;
            const result = await client.query(query, [churchId]);
            return result.rows;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.findAdminsByChurchId:', error);
            throw new AppError_1.AppError('Failed to fetch admins', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Find users by role
     */
    async findByRole(churchId, role) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                SELECT
                    id, church_id, email, first_name, last_name, phone_number,
                    country, membership_size, role, status, profile_completed,
                    is_temporary_password, must_reset_password, email_verified,
                    email_verified_at, last_login_at, profile_image_url,
                    created_at, updated_at, deleted_at
                FROM users
                WHERE church_id = $1 AND role = $2 AND deleted_at IS NULL
                ORDER BY first_name, last_name
            `;
            const result = await client.query(query, [churchId, role]);
            return result.rows;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.findByRole:', error);
            throw new AppError_1.AppError('Failed to fetch users by role', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Check if email exists
     */
    async emailExists(email, excludeUserId) {
        const client = await database_1.pool.connect();
        try {
            let query = `
                SELECT EXISTS(
                           SELECT 1 FROM users
                           WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL
            `;
            const values = [email.trim()];
            if (excludeUserId) {
                query += ` AND id != $2`;
                values.push(excludeUserId);
            }
            query += `) as exists`;
            const result = await client.query(query, values);
            return result.rows[0].exists;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.emailExists:', error);
            throw new AppError_1.AppError('Failed to check email', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Count users by church
     */
    async countByChurchId(churchId, options) {
        const client = await database_1.pool.connect();
        try {
            let query = `
                SELECT COUNT(*) FROM users
                WHERE church_id = $1 AND deleted_at IS NULL
            `;
            const values = [churchId];
            let paramCount = 2;
            if (options?.role) {
                query += ` AND role = $${paramCount}`;
                values.push(options.role);
                paramCount++;
            }
            if (options?.status) {
                query += ` AND status = $${paramCount}`;
                values.push(options.status);
            }
            const result = await client.query(query, values);
            return parseInt(result.rows[0].count, 10);
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.countByChurchId:', error);
            throw new AppError_1.AppError('Failed to count users', 500);
        }
        finally {
            client.release();
        }
    }
    // ==========================================================================
    // UPDATE OPERATIONS
    // ==========================================================================
    /**
     * Update user
     */
    async update(id, data) {
        const client = await database_1.pool.connect();
        try {
            const updates = [];
            const values = [];
            let paramCount = 1;
            const fieldMappings = {
                firstName: 'first_name',
                lastName: 'last_name',
                phoneNumber: 'phone_number',
                membershipSize: 'membership_size',
                profileCompleted: 'profile_completed',
                isTemporaryPassword: 'is_temporary_password',
                mustResetPassword: 'must_reset_password',
                emailVerified: 'email_verified',
                emailVerifiedAt: 'email_verified_at',
                lastLoginAt: 'last_login_at',
                profileImageUrl: 'profile_image_url'
            };
            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined) {
                    const dbField = fieldMappings[key] || key;
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
                UPDATE users
                SET ${updates.join(', ')}
                WHERE id = $${paramCount} AND deleted_at IS NULL
                    RETURNING *
            `;
            const result = await client.query(query, values);
            if (result.rows[0]) {
                logger_1.default.info(`User updated: ${id}`);
            }
            return result.rows[0] || null;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.update:', error);
            throw new AppError_1.AppError('Failed to update user', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Update user password
     */
    async updatePassword(id, hashedPassword) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                UPDATE users
                SET
                    password_hash = $1,
                    is_temporary_password = false,
                    must_reset_password = false,
                    updated_at = NOW()
                WHERE id = $2 AND deleted_at IS NULL
                    RETURNING id
            `;
            const result = await client.query(query, [hashedPassword, id]);
            if (result.rowCount && result.rowCount > 0) {
                logger_1.default.info(`Password updated for user: ${id}`);
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.updatePassword:', error);
            throw new AppError_1.AppError('Failed to update password', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Update last login timestamp
     */
    async updateLastLogin(id) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                UPDATE users
                SET last_login_at = NOW(), updated_at = NOW()
                WHERE id = $1 AND deleted_at IS NULL
            `;
            await client.query(query, [id]);
            logger_1.default.debug(`Last login updated for user: ${id}`);
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.updateLastLogin:', error);
        }
        finally {
            client.release();
        }
    }
    /**
     * Verify user email
     */
    async verifyEmail(id) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                UPDATE users
                SET
                    email_verified = true,
                    email_verified_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1 AND deleted_at IS NULL
                    RETURNING id
            `;
            const result = await client.query(query, [id]);
            if (result.rowCount && result.rowCount > 0) {
                logger_1.default.info(`Email verified for user: ${id}`);
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.verifyEmail:', error);
            throw new AppError_1.AppError('Failed to verify email', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Update user status
     */
    async updateStatus(id, status) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                UPDATE users
                SET status = $1, updated_at = NOW()
                WHERE id = $2 AND deleted_at IS NULL
                    RETURNING *
            `;
            const result = await client.query(query, [status, id]);
            if (result.rows[0]) {
                logger_1.default.info(`Status updated to '${status}' for user: ${id}`);
            }
            return result.rows[0] || null;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.updateStatus:', error);
            throw new AppError_1.AppError('Failed to update user status', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Update user role
     */
    async updateRole(id, role) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                UPDATE users
                SET role = $1, updated_at = NOW()
                WHERE id = $2 AND deleted_at IS NULL
                    RETURNING *
            `;
            const result = await client.query(query, [role, id]);
            if (result.rows[0]) {
                logger_1.default.info(`Role updated to '${role}' for user: ${id}`);
            }
            return result.rows[0] || null;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.updateRole:', error);
            throw new AppError_1.AppError('Failed to update user role', 500);
        }
        finally {
            client.release();
        }
    }
    // ==========================================================================
    // DELETE OPERATIONS
    // ==========================================================================
    /**
     * Soft delete user
     */
    async delete(id) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                UPDATE users
                SET deleted_at = NOW(), updated_at = NOW()
                WHERE id = $1 AND deleted_at IS NULL
                    RETURNING id
            `;
            const result = await client.query(query, [id]);
            if (result.rowCount && result.rowCount > 0) {
                logger_1.default.info(`User soft deleted: ${id}`);
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.delete:', error);
            throw new AppError_1.AppError('Failed to delete user', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Hard delete user (permanent)
     */
    async hardDelete(id) {
        const client = await database_1.pool.connect();
        try {
            const query = `DELETE FROM users WHERE id = $1 RETURNING id`;
            const result = await client.query(query, [id]);
            if (result.rowCount && result.rowCount > 0) {
                logger_1.default.warn(`User permanently deleted: ${id}`);
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.hardDelete:', error);
            throw new AppError_1.AppError('Failed to permanently delete user', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Restore soft-deleted user
     */
    async restore(id) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                UPDATE users
                SET deleted_at = NULL, updated_at = NOW()
                WHERE id = $1 AND deleted_at IS NOT NULL
                    RETURNING *
            `;
            const result = await client.query(query, [id]);
            if (result.rows[0]) {
                logger_1.default.info(`User restored: ${id}`);
            }
            return result.rows[0] || null;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.restore:', error);
            throw new AppError_1.AppError('Failed to restore user', 500);
        }
        finally {
            client.release();
        }
    }
    // ==========================================================================
    // SEARCH OPERATIONS
    // ==========================================================================
    /**
     * Search users by name or email
     */
    async search(churchId, searchTerm, limit = 10) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                SELECT
                    id, church_id, email, first_name, last_name, phone_number,
                    country, membership_size, role, status, profile_completed,
                    is_temporary_password, must_reset_password, email_verified,
                    email_verified_at, last_login_at, profile_image_url,
                    created_at, updated_at, deleted_at
                FROM users
                WHERE church_id = $1
                  AND deleted_at IS NULL
                  AND (
                    LOWER(first_name) LIKE LOWER($2) OR
                    LOWER(last_name) LIKE LOWER($2) OR
                    LOWER(email) LIKE LOWER($2) OR
                    LOWER(CONCAT(first_name, ' ', last_name)) LIKE LOWER($2)
                    )
                ORDER BY
                    CASE
                        WHEN LOWER(email) = LOWER($3) THEN 1
                        WHEN LOWER(email) LIKE LOWER($4) THEN 2
                        ELSE 3
                        END,
                    first_name, last_name
                    LIMIT $5
            `;
            const result = await client.query(query, [
                churchId,
                `%${searchTerm}%`,
                searchTerm,
                `${searchTerm}%`,
                limit
            ]);
            return result.rows;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.search:', error);
            throw new AppError_1.AppError('Failed to search users', 500);
        }
        finally {
            client.release();
        }
    }
    // ==========================================================================
    // UTILITY METHODS
    // ==========================================================================
    /**
     * Check if user belongs to church
     */
    async belongsToChurch(userId, churchId) {
        const client = await database_1.pool.connect();
        try {
            const query = `
                SELECT EXISTS(
                    SELECT 1 FROM users
                    WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
                ) as belongs
            `;
            const result = await client.query(query, [userId, churchId]);
            return result.rows[0].belongs;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.belongsToChurch:', error);
            throw new AppError_1.AppError('Failed to verify user church membership', 500);
        }
        finally {
            client.release();
        }
    }
    /**
     * Check if user has specific role
     */
    async hasRole(userId, roles) {
        const client = await database_1.pool.connect();
        try {
            const roleArray = Array.isArray(roles) ? roles : [roles];
            const query = `
                SELECT EXISTS(
                    SELECT 1 FROM users
                    WHERE id = $1 AND role = ANY($2) AND deleted_at IS NULL
                ) as has_role
            `;
            const result = await client.query(query, [userId, roleArray]);
            return result.rows[0].has_role;
        }
        catch (error) {
            logger_1.default.error('Error in UserRepository.hasRole:', error);
            throw new AppError_1.AppError('Failed to verify user role', 500);
        }
        finally {
            client.release();
        }
    }
}
exports.UserRepository = UserRepository;
//# sourceMappingURL=UserRepository.js.map