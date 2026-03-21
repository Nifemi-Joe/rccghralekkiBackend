export type TicketCategory = 'general' | 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'account' | 'other';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export interface SupportTicket {
    id: string;
    church_id: string;
    user_id?: string;
    ticket_number: string;
    subject: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    status: TicketStatus;
    contact_email: string;
    contact_name: string;
    contact_phone?: string;
    assigned_to?: string;
    resolved_at?: Date;
    resolution_notes?: string;
    attachments: string[];
    created_at: Date;
    updated_at: Date;
}
export interface CreateTicketDTO {
    subject: string;
    description: string;
    category: TicketCategory;
    priority?: TicketPriority;
    contactEmail: string;
    contactName: string;
    contactPhone?: string;
    attachments?: string[];
}
export interface UpdateTicketDTO {
    subject?: string;
    description?: string;
    category?: TicketCategory;
    priority?: TicketPriority;
    status?: TicketStatus;
    assignedTo?: string;
    resolutionNotes?: string;
}
export interface TicketMessageDTO {
    message: string;
    attachments?: string[];
}
export interface TicketMessage {
    id: string;
    ticket_id: string;
    user_id?: string;
    message: string;
    is_staff_reply: boolean;
    attachments: string[];
    created_at: Date;
}
export interface TicketFilters {
    churchId: string;
    userId?: string;
    status?: TicketStatus | TicketStatus[];
    category?: TicketCategory;
    priority?: TicketPriority;
    search?: string;
    page?: number;
    limit?: number;
}
export interface PaginatedTickets {
    tickets: SupportTicket[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export interface FAQ {
    id: string;
    question: string;
    answer: string;
    category: string;
    order: number;
}
//# sourceMappingURL=support.types.d.ts.map