"use strict";
// src/controllers/SupportController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportController = void 0;
const SupportService_1 = require("@services/SupportService");
// Async handler wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
class SupportController {
    constructor() {
        this.createTicket = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id; // Changed from userId to id
            const ticket = await this.supportService.createTicket(churchId, userId, req.body);
            res.status(201).json({
                status: 'success',
                message: 'Support ticket created successfully',
                data: ticket,
            });
        });
        this.getTickets = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id; // Changed from userId to id
            const filters = {
                churchId,
                userId,
                status: req.query.status,
                category: req.query.category,
                priority: req.query.priority,
                search: req.query.search,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
            };
            const result = await this.supportService.getTickets(filters);
            res.json({
                status: 'success',
                data: result,
            });
        });
        this.getTicketById = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const { id } = req.params;
            const ticket = await this.supportService.getTicketById(id, churchId);
            res.json({
                status: 'success',
                data: ticket,
            });
        });
        this.updateTicket = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const { id } = req.params;
            const ticket = await this.supportService.updateTicket(id, churchId, req.body);
            res.json({
                status: 'success',
                message: 'Ticket updated successfully',
                data: ticket,
            });
        });
        this.addMessage = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id; // Changed from userId to id
            const { id } = req.params;
            const message = await this.supportService.addMessage(id, churchId, userId, req.body);
            res.status(201).json({
                status: 'success',
                message: 'Message added successfully',
                data: message,
            });
        });
        this.getTicketMessages = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const { id } = req.params;
            const messages = await this.supportService.getTicketMessages(id, churchId);
            res.json({
                status: 'success',
                data: messages,
            });
        });
        this.getFAQs = asyncHandler(async (req, res) => {
            const faqs = await this.supportService.getFAQs();
            res.json({
                status: 'success',
                data: faqs,
            });
        });
        this.supportService = new SupportService_1.SupportService();
    }
}
exports.SupportController = SupportController;
//# sourceMappingURL=SupportController.js.map