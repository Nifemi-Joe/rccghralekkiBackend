// src/repositories/AuditLogRepository.ts

import { pool } from '@config/database';
import {
    AuditLog,
    CreateAuditLogDTO,
    AuditLogFilters,
    PaginatedAuditLogs,
    AuditLogStats,
} from '@/dtos/auditLog.types';
import logger from '@config/logger';

export class AuditLogRepository {

    async create(data: CreateAuditLogDTO): Promise<AuditLog> {
        const query = `
            INSERT INTO audit_logs (
                church_id, user_id, user_email, user_name,
                action, action_type, description,
                entity_type, entity_id, entity_name,
                old_values, new_values, changes,
                ip_address, user_agent, request_method, request_path,
                metadata, status, error_message
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *
        `;

        const values = [
            data.churchId,
            data.userId || null,
            data.userEmail || null,
            data.userName || null,
            data.action,
            data.actionType,
            data.description || null,
            data.entityType,
            data.entityId || null,
            data.entityName || null,
            data.oldValues ? JSON.stringify(data.oldValues) : null,
            data.newValues ? JSON.stringify(data.newValues) : null,
            data.changes ? JSON.stringify(data.changes) : null,
            data.ipAddress || null,
            data.userAgent || null,
            data.requestMethod || null,
            data.requestPath || null,
            JSON.stringify(data.metadata || {}),
            data.status || 'success',
            data.errorMessage || null,
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    async findById(id: string, churchId: string): Promise<AuditLog | null> {
        const query = `
            SELECT * FROM audit_logs
            WHERE id = $1 AND church_id = $2
        `;
        const result = await pool.query(query, [id, churchId]);
        return result.rows[0] || null;
    }

    async findAll(filters: AuditLogFilters): Promise<PaginatedAuditLogs> {
        let whereClause = 'WHERE a.church_id = $1';
        const values: any[] = [filters.churchId];
        let paramCount = 1;

        if (filters.userId) {
            paramCount++;
            whereClause += ` AND a.user_id = $${paramCount}`;
            values.push(filters.userId);
        }

        if (filters.action) {
            paramCount++;
            if (Array.isArray(filters.action)) {
                whereClause += ` AND a.action = ANY($${paramCount})`;
                values.push(filters.action);
            } else {
                whereClause += ` AND a.action = $${paramCount}`;
                values.push(filters.action);
            }
        }

        if (filters.actionType) {
            paramCount++;
            if (Array.isArray(filters.actionType)) {
                whereClause += ` AND a.action_type = ANY($${paramCount})`;
                values.push(filters.actionType);
            } else {
                whereClause += ` AND a.action_type = $${paramCount}`;
                values.push(filters.actionType);
            }
        }

        if (filters.entityType) {
            paramCount++;
            whereClause += ` AND a.entity_type = $${paramCount}`;
            values.push(filters.entityType);
        }

        if (filters.entityId) {
            paramCount++;
            whereClause += ` AND a.entity_id = $${paramCount}`;
            values.push(filters.entityId);
        }

        if (filters.status) {
            paramCount++;
            whereClause += ` AND a.status = $${paramCount}`;
            values.push(filters.status);
        }

        if (filters.startDate) {
            paramCount++;
            whereClause += ` AND a.created_at >= $${paramCount}`;
            values.push(filters.startDate);
        }

        if (filters.endDate) {
            paramCount++;
            whereClause += ` AND a.created_at <= $${paramCount}`;
            values.push(filters.endDate);
        }

        if (filters.search) {
            paramCount++;
            whereClause += ` AND (
                a.user_name ILIKE $${paramCount} OR
                a.user_email ILIKE $${paramCount} OR
                a.description ILIKE $${paramCount} OR
                a.entity_name ILIKE $${paramCount}
            )`;
            values.push(`%${filters.search}%`);
        }

        // Count query
        const countQuery = `SELECT COUNT(*) FROM audit_logs a ${whereClause}`;
        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count);

        // Sorting
        const sortBy = filters.sortBy || 'created_at';
        const sortOrder = filters.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const sortColumn = {
            'createdAt': 'a.created_at',
            'created_at': 'a.created_at',
            'action': 'a.action',
            'actionType': 'a.action_type',
            'entityType': 'a.entity_type',
            'userName': 'a.user_name',
        }[sortBy] || 'a.created_at';

        // Data query
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const offset = (page - 1) * limit;

        const dataQuery = `
            SELECT a.*
            FROM audit_logs a
            ${whereClause}
            ORDER BY ${sortColumn} ${sortOrder}
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;

        values.push(limit, offset);
        const dataResult = await pool.query(dataQuery, values);

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

    async getStats(churchId: string): Promise<AuditLogStats> {
        const query = `
            WITH stats AS (
                SELECT 
                    COUNT(*) as total_logs,
                    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_logs
                FROM audit_logs
                WHERE church_id = $1
            ),
            by_action AS (
                SELECT action, COUNT(*) as count
                FROM audit_logs
                WHERE church_id = $1
                GROUP BY action
            ),
            by_action_type AS (
                SELECT action_type, COUNT(*) as count
                FROM audit_logs
                WHERE church_id = $1
                GROUP BY action_type
            ),
            by_user AS (
                SELECT user_id, user_name, COUNT(*) as count
                FROM audit_logs
                WHERE church_id = $1 AND user_id IS NOT NULL
                GROUP BY user_id, user_name
                ORDER BY count DESC
                LIMIT 10
            ),
            recent AS (
                SELECT *
                FROM audit_logs
                WHERE church_id = $1
                ORDER BY created_at DESC
                LIMIT 10
            )
            SELECT 
                s.total_logs,
                s.today_logs,
                COALESCE(jsonb_object_agg(ba.action, ba.count) FILTER (WHERE ba.action IS NOT NULL), '{}') as by_action,
                COALESCE(jsonb_object_agg(bat.action_type, bat.count) FILTER (WHERE bat.action_type IS NOT NULL), '{}') as by_action_type,
                COALESCE(jsonb_agg(DISTINCT jsonb_build_object('userId', bu.user_id, 'userName', bu.user_name, 'count', bu.count)) FILTER (WHERE bu.user_id IS NOT NULL), '[]') as by_user,
                COALESCE(jsonb_agg(r.*) FILTER (WHERE r.id IS NOT NULL), '[]') as recent_activity
            FROM stats s
            LEFT JOIN by_action ba ON true
            LEFT JOIN by_action_type bat ON true
            LEFT JOIN by_user bu ON true
            LEFT JOIN recent r ON true
            GROUP BY s.total_logs, s.today_logs
        `;

        const result = await pool.query(query, [churchId]);
        const row = result.rows[0];

        return {
            totalLogs: parseInt(row?.total_logs || 0),
            todayLogs: parseInt(row?.today_logs || 0),
            byAction: row?.by_action || {},
            byActionType: row?.by_action_type || {},
            byUser: row?.by_user || [],
            recentActivity: row?.recent_activity || [],
        };
    }

    async getEntityHistory(churchId: string, entityType: string, entityId: string): Promise<AuditLog[]> {
        const query = `
            SELECT * FROM audit_logs
            WHERE church_id = $1 AND entity_type = $2 AND entity_id = $3
            ORDER BY created_at DESC
            LIMIT 100
        `;
        const result = await pool.query(query, [churchId, entityType, entityId]);
        return result.rows;
    }

    async deleteOld(churchId: string, daysOld: number = 90): Promise<number> {
        const result = await pool.query(
            `DELETE FROM audit_logs 
             WHERE church_id = $1 AND created_at < NOW() - INTERVAL '${daysOld} days'`,
            [churchId]
        );
        return result.rowCount || 0;
    }
}