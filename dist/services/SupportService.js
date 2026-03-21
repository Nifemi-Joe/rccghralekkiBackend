"use strict";
// src/services/SupportService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportService = void 0;
const SupportRepository_1 = require("@repositories/SupportRepository");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
class SupportService {
    constructor() {
        this.supportRepository = new SupportRepository_1.SupportRepository();
    }
    async createTicket(churchId, userId, data) {
        try {
            const ticket = await this.supportRepository.createTicket(churchId, userId, data);
            logger_1.default.info(`Support ticket created: ${ticket.ticket_number}`);
            return ticket;
        }
        catch (error) {
            logger_1.default.error('Error creating support ticket:', error);
            throw error;
        }
    }
    async getTicketById(id, churchId) {
        const ticket = await this.supportRepository.findTicketById(id, churchId);
        if (!ticket) {
            throw new AppError_1.AppError('Ticket not found', 404);
        }
        return ticket;
    }
    async getTicketByNumber(ticketNumber) {
        const ticket = await this.supportRepository.findTicketByNumber(ticketNumber);
        if (!ticket) {
            throw new AppError_1.AppError('Ticket not found', 404);
        }
        return ticket;
    }
    async getTickets(filters) {
        return await this.supportRepository.findAllTickets(filters);
    }
    async updateTicket(id, churchId, data) {
        const ticket = await this.supportRepository.findTicketById(id, churchId);
        if (!ticket) {
            throw new AppError_1.AppError('Ticket not found', 404);
        }
        const updated = await this.supportRepository.updateTicket(id, churchId, data);
        if (!updated) {
            throw new AppError_1.AppError('Failed to update ticket', 500);
        }
        logger_1.default.info(`Support ticket updated: ${ticket.ticket_number}`);
        return updated;
    }
    async addMessage(ticketId, churchId, userId, data) {
        const ticket = await this.supportRepository.findTicketById(ticketId, churchId);
        if (!ticket) {
            throw new AppError_1.AppError('Ticket not found', 404);
        }
        const message = await this.supportRepository.addMessage(ticketId, userId, data, false);
        // Update ticket status if it was closed
        if (ticket.status === 'closed' || ticket.status === 'resolved') {
            await this.supportRepository.updateTicket(ticketId, churchId, { status: 'open' });
        }
        return message;
    }
    async getTicketMessages(ticketId, churchId) {
        const ticket = await this.supportRepository.findTicketById(ticketId, churchId);
        if (!ticket) {
            throw new AppError_1.AppError('Ticket not found', 404);
        }
        return await this.supportRepository.getTicketMessages(ticketId);
    }
    async getFAQs() {
        return await this.supportRepository.getFAQs();
    }
}
exports.SupportService = SupportService;
//# sourceMappingURL=SupportService.js.map