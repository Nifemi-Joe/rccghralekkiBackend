// src/controllers/SupportController.ts

import { Request, Response, NextFunction } from 'express';
import { SupportService } from '@services/SupportService';
import { TicketFilters } from '@/dtos/support.types';

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export class SupportController {
    private supportService: SupportService;

    constructor() {
        this.supportService = new SupportService();
    }

    createTicket = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id; // Changed from userId to id

        const ticket = await this.supportService.createTicket(churchId, userId, req.body);

        res.status(201).json({
            status: 'success',
            message: 'Support ticket created successfully',
            data: ticket,
        });
    });

    getTickets = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id; // Changed from userId to id

        const filters: TicketFilters = {
            churchId,
            userId,
            status: req.query.status as any,
            category: req.query.category as any,
            priority: req.query.priority as any,
            search: req.query.search as string,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 20,
        };

        const result = await this.supportService.getTickets(filters);

        res.json({
            status: 'success',
            data: result,
        });
    });

    getTicketById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;
        const { id } = req.params;

        const ticket = await this.supportService.getTicketById(id, churchId);

        res.json({
            status: 'success',
            data: ticket,
        });
    });

    updateTicket = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;
        const { id } = req.params;

        const ticket = await this.supportService.updateTicket(id, churchId, req.body);

        res.json({
            status: 'success',
            message: 'Ticket updated successfully',
            data: ticket,
        });
    });

    addMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id; // Changed from userId to id
        const { id } = req.params;

        const message = await this.supportService.addMessage(id, churchId, userId, req.body);

        res.status(201).json({
            status: 'success',
            message: 'Message added successfully',
            data: message,
        });
    });

    getTicketMessages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;
        const { id } = req.params;

        const messages = await this.supportService.getTicketMessages(id, churchId);

        res.json({
            status: 'success',
            data: messages,
        });
    });

    getFAQs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const faqs = await this.supportService.getFAQs();

        res.json({
            status: 'success',
            data: faqs,
        });
    });
}