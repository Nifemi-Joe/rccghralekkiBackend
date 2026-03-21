import { SupportTicket, CreateTicketDTO, UpdateTicketDTO, TicketMessage, TicketMessageDTO, TicketFilters, PaginatedTickets, FAQ } from '@/dtos/support.types';
export declare class SupportRepository {
    private generateTicketNumber;
    createTicket(churchId: string, userId: string | undefined, data: CreateTicketDTO): Promise<SupportTicket>;
    findTicketById(id: string, churchId: string): Promise<SupportTicket | null>;
    findTicketByNumber(ticketNumber: string): Promise<SupportTicket | null>;
    findAllTickets(filters: TicketFilters): Promise<PaginatedTickets>;
    updateTicket(id: string, churchId: string, data: UpdateTicketDTO): Promise<SupportTicket | null>;
    addMessage(ticketId: string, userId: string | undefined, data: TicketMessageDTO, isStaffReply?: boolean): Promise<TicketMessage>;
    getTicketMessages(ticketId: string): Promise<TicketMessage[]>;
    getFAQs(): Promise<FAQ[]>;
}
//# sourceMappingURL=SupportRepository.d.ts.map