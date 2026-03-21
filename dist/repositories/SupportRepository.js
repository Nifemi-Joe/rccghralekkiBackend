"use strict";
// src/repositories/SupportRepository.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportRepository = void 0;
const database_1 = require("@config/database");
class SupportRepository {
    generateTicketNumber() {
        const prefix = 'TKT';
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${timestamp}${random}`;
    }
    async createTicket(churchId, userId, data) {
        const ticketNumber = this.generateTicketNumber();
        const query = `
            INSERT INTO support_tickets (
                church_id, user_id, ticket_number, subject, description,
                category, priority, contact_email, contact_name, contact_phone,
                attachments
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        const values = [
            churchId,
            userId || null,
            ticketNumber,
            data.subject,
            data.description,
            data.category,
            data.priority || 'medium',
            data.contactEmail,
            data.contactName,
            data.contactPhone || null,
            JSON.stringify(data.attachments || []),
        ];
        const result = await database_1.pool.query(query, values);
        return result.rows[0];
    }
    async findTicketById(id, churchId) {
        const query = `
            SELECT * FROM support_tickets
            WHERE id = $1 AND church_id = $2
        `;
        const result = await database_1.pool.query(query, [id, churchId]);
        return result.rows[0] || null;
    }
    async findTicketByNumber(ticketNumber) {
        const query = `SELECT * FROM support_tickets WHERE ticket_number = $1`;
        const result = await database_1.pool.query(query, [ticketNumber]);
        return result.rows[0] || null;
    }
    async findAllTickets(filters) {
        let whereClause = 'WHERE t.church_id = $1';
        const values = [filters.churchId];
        let paramCount = 1;
        if (filters.userId) {
            paramCount++;
            whereClause += ` AND t.user_id = $${paramCount}`;
            values.push(filters.userId);
        }
        if (filters.status) {
            paramCount++;
            if (Array.isArray(filters.status)) {
                whereClause += ` AND t.status = ANY($${paramCount})`;
                values.push(filters.status);
            }
            else {
                whereClause += ` AND t.status = $${paramCount}`;
                values.push(filters.status);
            }
        }
        if (filters.category) {
            paramCount++;
            whereClause += ` AND t.category = $${paramCount}`;
            values.push(filters.category);
        }
        if (filters.priority) {
            paramCount++;
            whereClause += ` AND t.priority = $${paramCount}`;
            values.push(filters.priority);
        }
        if (filters.search) {
            paramCount++;
            whereClause += ` AND (
                t.subject ILIKE $${paramCount} OR
                t.description ILIKE $${paramCount} OR
                t.ticket_number ILIKE $${paramCount}
            )`;
            values.push(`%${filters.search}%`);
        }
        // Count query
        const countQuery = `SELECT COUNT(*) FROM support_tickets t ${whereClause}`;
        const countResult = await database_1.pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count);
        // Data query
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;
        const dataQuery = `
            SELECT t.*
            FROM support_tickets t
            ${whereClause}
            ORDER BY 
                CASE t.priority 
                    WHEN 'urgent' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    ELSE 4 
                END,
                t.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        values.push(limit, offset);
        const dataResult = await database_1.pool.query(dataQuery, values);
        return {
            tickets: dataResult.rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async updateTicket(id, churchId, data) {
        const fields = [];
        const values = [];
        let paramCount = 0;
        const fieldMappings = {
            subject: 'subject',
            description: 'description',
            category: 'category',
            priority: 'priority',
            status: 'status',
            assignedTo: 'assigned_to',
            resolutionNotes: 'resolution_notes',
        };
        for (const [key, dbField] of Object.entries(fieldMappings)) {
            const value = data[key];
            if (value !== undefined) {
                paramCount++;
                fields.push(`${dbField} = $${paramCount}`);
                values.push(value);
            }
        }
        // Handle resolved_at
        if (data.status === 'resolved' || data.status === 'closed') {
            paramCount++;
            fields.push(`resolved_at = $${paramCount}`);
            values.push(new Date());
        }
        if (fields.length === 0) {
            return this.findTicketById(id, churchId);
        }
        paramCount++;
        values.push(id);
        paramCount++;
        values.push(churchId);
        const query = `
            UPDATE support_tickets
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = $${paramCount - 1} AND church_id = $${paramCount}
            RETURNING *
        `;
        const result = await database_1.pool.query(query, values);
        return result.rows[0] || null;
    }
    async addMessage(ticketId, userId, data, isStaffReply = false) {
        const query = `
            INSERT INTO support_ticket_messages (ticket_id, user_id, message, is_staff_reply, attachments)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [
            ticketId,
            userId || null,
            data.message,
            isStaffReply,
            JSON.stringify(data.attachments || []),
        ];
        const result = await database_1.pool.query(query, values);
        return result.rows[0];
    }
    async getTicketMessages(ticketId) {
        const query = `
            SELECT m.*, u.first_name, u.last_name, u.email as user_email
            FROM support_ticket_messages m
            LEFT JOIN users u ON m.user_id = u.id
            WHERE m.ticket_id = $1
            ORDER BY m.created_at ASC
        `;
        const result = await database_1.pool.query(query, [ticketId]);
        return result.rows;
    }
    async getFAQs() {
        // Return static FAQs for now
        return [
            {
                id: '1',
                question: 'How do I add a new member?',
                answer: 'Go to Members > Add Member, fill in the required information, and click Save.',
                category: 'members',
                order: 1,
            },
            {
                id: '2',
                question: 'How do I record offerings?',
                answer: 'Navigate to Finances > Record Offering, select the event (optional), add the offering details, and submit.',
                category: 'finances',
                order: 2,
            },
            {
                id: '3',
                question: 'How do I create a new event?',
                answer: 'Go to Events > Create Event, fill in the event details including date, time, and location, then save.',
                category: 'events',
                order: 3,
            },
            {
                id: '4',
                question: 'How do I track attendance?',
                answer: 'During or after an event, go to Events > Select Event > Attendance, and mark members as present.',
                category: 'events',
                order: 4,
            },
            {
                id: '5',
                question: 'How do I convert a first timer to a member?',
                answer: 'Go to First Timers, find the person, click the menu, and select "Convert to Member".',
                category: 'first_timers',
                order: 5,
            },
            {
                id: '6',
                question: 'How do I add staff members?',
                answer: 'Go to Profile > Staff Management > Add Staff, enter their details and select their role.',
                category: 'settings',
                order: 6,
            },
            {
                id: '7',
                question: 'How do I generate reports?',
                answer: 'Navigate to Reports, select the report type, set the date range, and click Generate.',
                category: 'reports',
                order: 7,
            },
            {
                id: '8',
                question: 'How do I change my password?',
                answer: 'Go to Profile > Security, enter your current password and new password, then save.',
                category: 'account',
                order: 8,
            },
        ];
    }
}
exports.SupportRepository = SupportRepository;
//# sourceMappingURL=SupportRepository.js.map