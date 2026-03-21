import { SupportTicket, CreateTicketDTO, UpdateTicketDTO, TicketMessage, TicketMessageDTO, TicketFilters, PaginatedTickets, FAQ } from '@/dtos/support.types';
export declare class SupportService {
    private supportRepository;
    constructor();
    createTicket(churchId: string, userId: string | undefined, data: CreateTicketDTO): Promise<SupportTicket>;
    getTicketById(id: string, churchId: string): Promise<SupportTicket>;
    getTicketByNumber(ticketNumber: string): Promise<SupportTicket>;
    getTickets(filters: TicketFilters): Promise<PaginatedTickets>;
    updateTicket(id: string, churchId: string, data: UpdateTicketDTO): Promise<SupportTicket>;
    addMessage(ticketId: string, churchId: string, userId: string | undefined, data: TicketMessageDTO): Promise<TicketMessage>;
    getTicketMessages(ticketId: string, churchId: string): Promise<TicketMessage[]>;
    getFAQs(): Promise<FAQ[]>;
}
//# sourceMappingURL=SupportService.d.ts.map