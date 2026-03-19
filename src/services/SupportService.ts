// src/services/SupportService.ts

import { SupportRepository } from '@repositories/SupportRepository';
import { AppError } from '@utils/AppError';
import {
    SupportTicket,
    CreateTicketDTO,
    UpdateTicketDTO,
    TicketMessage,
    TicketMessageDTO,
    TicketFilters,
    PaginatedTickets,
    FAQ,
} from '@/dtos/support.types';
import logger from '@config/logger';

export class SupportService {
    private supportRepository: SupportRepository;

    constructor() {
        this.supportRepository = new SupportRepository();
    }

    async createTicket(churchId: string, userId: string | undefined, data: CreateTicketDTO): Promise<SupportTicket> {
        try {
            const ticket = await this.supportRepository.createTicket(churchId, userId, data);
            logger.info(`Support ticket created: ${ticket.ticket_number}`);
            return ticket;
        } catch (error) {
            logger.error('Error creating support ticket:', error);
            throw error;
        }
    }

    async getTicketById(id: string, churchId: string): Promise<SupportTicket> {
        const ticket = await this.supportRepository.findTicketById(id, churchId);
        if (!ticket) {
            throw new AppError('Ticket not found', 404);
        }
        return ticket;
    }

    async getTicketByNumber(ticketNumber: string): Promise<SupportTicket> {
        const ticket = await this.supportRepository.findTicketByNumber(ticketNumber);
        if (!ticket) {
            throw new AppError('Ticket not found', 404);
        }
        return ticket;
    }

    async getTickets(filters: TicketFilters): Promise<PaginatedTickets> {
        return await this.supportRepository.findAllTickets(filters);
    }

    async updateTicket(id: string, churchId: string, data: UpdateTicketDTO): Promise<SupportTicket> {
        const ticket = await this.supportRepository.findTicketById(id, churchId);
        if (!ticket) {
            throw new AppError('Ticket not found', 404);
        }

        const updated = await this.supportRepository.updateTicket(id, churchId, data);
        if (!updated) {
            throw new AppError('Failed to update ticket', 500);
        }

        logger.info(`Support ticket updated: ${ticket.ticket_number}`);
        return updated;
    }

    async addMessage(ticketId: string, churchId: string, userId: string | undefined, data: TicketMessageDTO): Promise<TicketMessage> {
        const ticket = await this.supportRepository.findTicketById(ticketId, churchId);
        if (!ticket) {
            throw new AppError('Ticket not found', 404);
        }

        const message = await this.supportRepository.addMessage(ticketId, userId, data, false);

        // Update ticket status if it was closed
        if (ticket.status === 'closed' || ticket.status === 'resolved') {
            await this.supportRepository.updateTicket(ticketId, churchId, { status: 'open' });
        }

        return message;
    }

    async getTicketMessages(ticketId: string, churchId: string): Promise<TicketMessage[]> {
        const ticket = await this.supportRepository.findTicketById(ticketId, churchId);
        if (!ticket) {
            throw new AppError('Ticket not found', 404);
        }

        return await this.supportRepository.getTicketMessages(ticketId);
    }

    async getFAQs(): Promise<FAQ[]> {
        return await this.supportRepository.getFAQs();
    }
}