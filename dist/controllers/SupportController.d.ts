import { Request, Response, NextFunction } from 'express';
export declare class SupportController {
    private supportService;
    constructor();
    createTicket: (req: Request, res: Response, next: NextFunction) => void;
    getTickets: (req: Request, res: Response, next: NextFunction) => void;
    getTicketById: (req: Request, res: Response, next: NextFunction) => void;
    updateTicket: (req: Request, res: Response, next: NextFunction) => void;
    addMessage: (req: Request, res: Response, next: NextFunction) => void;
    getTicketMessages: (req: Request, res: Response, next: NextFunction) => void;
    getFAQs: (req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=SupportController.d.ts.map