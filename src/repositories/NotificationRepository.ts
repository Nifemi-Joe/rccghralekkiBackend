// src/repositories/NotificationRepository.ts

import { pool } from '@config/database';
import {
    Notification,
    CreateNotificationDTO,
    NotificationFilters,
    PaginatedNotifications,
    NotificationStats,
} from '@/dtos/notification.types';
import logger from '@config/logger';

export class NotificationRepository {

    async create(data: CreateNotificationDTO): Promise<Notification> {
        const query = `
            INSERT INTO notifications (
                church_id, user_id, type, title, message,
                action_type, action_url, entity_type, entity_id,
                data, actor_id, actor_name
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;

        const values = [
            data.churchId,
            data.userId || null,
            data.type,
            data.title,
            data.message,
            data.actionType || null,
            data.actionUrl || null,
            data.entityType || null,
            data.entityId || null,
            JSON.stringify(data.data || {}),
            data.actorId || null,
            data.actorName || null,
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    async createBulk(notifications: CreateNotificationDTO[]): Promise<Notification[]> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const created: Notification[] = [];
            for (const data of notifications) {
                const query = `
                    INSERT INTO notifications (
                        church_id, user_id, type, title, message,
                        action_type, action_url, entity_type, entity_id,
                        data, actor_id, actor_name
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING *
                `;

                const values = [
                    data.churchId,
                    data.userId || null,
                    data.type,
                    data.title,
                    data.message,
                    data.actionType || null,
                    data.actionUrl || null,
                    data.entityType || null,
                    data.entityId || null,
                    JSON.stringify(data.data || {}),
                    data.actorId || null,
                    data.actorName || null,
                ];

                const result = await client.query(query, values);
                created.push(result.rows[0]);
            }

            await client.query('COMMIT');
            return created;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async findById(id: string, churchId: string): Promise<Notification | null> {
        const query = `
            SELECT * FROM notifications
            WHERE id = $1 AND church_id = $2
        `;
        const result = await pool.query(query, [id, churchId]);
        return result.rows[0] || null;
    }

    async findAll(filters: NotificationFilters): Promise<PaginatedNotifications> {
        let whereClause = 'WHERE n.church_id = $1';
        const values: any[] = [filters.churchId];
        let paramCount = 1;

        if (filters.userId) {
            paramCount++;
            whereClause += ` AND (n.user_id = $${paramCount} OR n.user_id IS NULL)`;
            values.push(filters.userId);
        }

        if (filters.type) {
            paramCount++;
            if (Array.isArray(filters.type)) {
                whereClause += ` AND n.type = ANY($${paramCount})`;
                values.push(filters.type);
            } else {
                whereClause += ` AND n.type = $${paramCount}`;
                values.push(filters.type);
            }
        }

        if (filters.isRead !== undefined) {
            paramCount++;
            whereClause += ` AND n.is_read = $${paramCount}`;
            values.push(filters.isRead);
        }

        if (filters.entityType) {
            paramCount++;
            whereClause += ` AND n.entity_type = $${paramCount}`;
            values.push(filters.entityType);
        }

        if (filters.startDate) {
            paramCount++;
            whereClause += ` AND n.created_at >= $${paramCount}`;
            values.push(filters.startDate);
        }

        if (filters.endDate) {
            paramCount++;
            whereClause += ` AND n.created_at <= $${paramCount}`;
            values.push(filters.endDate);
        }

        // Count query
        const countQuery = `SELECT COUNT(*) FROM notifications n ${whereClause}`;
        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count);

        // Unread count
        const unreadQuery = `SELECT COUNT(*) FROM notifications n ${whereClause} AND n.is_read = false`;
        const unreadResult = await pool.query(unreadQuery, values);
        const unreadCount = parseInt(unreadResult.rows[0].count);

        // Data query
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        const dataQuery = `
            SELECT n.*
            FROM notifications n
            ${whereClause}
            ORDER BY n.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;

        values.push(limit, offset);
        const dataResult = await pool.query(dataQuery, values);

        return {
            notifications: dataResult.rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            unreadCount,
        };
    }

    async markAsRead(id: string, churchId: string): Promise<Notification | null> {
        const query = `
            UPDATE notifications
            SET is_read = true, read_at = NOW(), updated_at = NOW()
            WHERE id = $1 AND church_id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [id, churchId]);
        return result.rows[0] || null;
    }

    async markAllAsRead(churchId: string, userId?: string): Promise<number> {
        let query = `
            UPDATE notifications
            SET is_read = true, read_at = NOW(), updated_at = NOW()
            WHERE church_id = $1 AND is_read = false
        `;
        const values: any[] = [churchId];

        if (userId) {
            query += ` AND (user_id = $2 OR user_id IS NULL)`;
            values.push(userId);
        }

        const result = await pool.query(query, values);
        return result.rowCount || 0;
    }

    async delete(id: string, churchId: string): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM notifications WHERE id = $1 AND church_id = $2',
            [id, churchId]
        );
        return (result.rowCount || 0) > 0;
    }

    async deleteOld(churchId: string, daysOld: number = 30): Promise<number> {
        const result = await pool.query(
            `DELETE FROM notifications 
             WHERE church_id = $1 AND created_at < NOW() - INTERVAL '${daysOld} days'`,
            [churchId]
        );
        return result.rowCount || 0;
    }

    async getStats(churchId: string, userId?: string): Promise<NotificationStats> {
        let whereClause = 'WHERE church_id = $1';
        const values: any[] = [churchId];

        if (userId) {
            whereClause += ` AND (user_id = $2 OR user_id IS NULL)`;
            values.push(userId);
        }

        const query = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE is_read = false) as unread,
                jsonb_object_agg(type, type_count) as by_type
            FROM (
                SELECT type, COUNT(*) as type_count
                FROM notifications
                ${whereClause}
                GROUP BY type
            ) t
            CROSS JOIN (
                SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_read = false) as unread
                FROM notifications
                ${whereClause}
            ) s
        `;

        const result = await pool.query(query, values);
        const row = result.rows[0];

        return {
            total: parseInt(row?.total || 0),
            unread: parseInt(row?.unread || 0),
            byType: row?.by_type || {},
        };
    }

    async getUnreadCount(churchId: string, userId?: string): Promise<number> {
        let query = 'SELECT COUNT(*) FROM notifications WHERE church_id = $1 AND is_read = false';
        const values: any[] = [churchId];

        if (userId) {
            query += ' AND (user_id = $2 OR user_id IS NULL)';
            values.push(userId);
        }

        const result = await pool.query(query, values);
        return parseInt(result.rows[0].count);
    }
}