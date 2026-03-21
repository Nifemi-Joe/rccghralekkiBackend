import { Request, Response, NextFunction } from 'express';
export declare class EventController {
    private eventService;
    constructor();
    create: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAll: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    update: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    delete: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getQRCode: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getStatistics: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    startEvent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createInstance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getInstances: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getInstance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateInstance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getInstanceQRCode: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    register: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getRegistrations: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    cancelRegistration: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    processPayment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    checkIn: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    publicCheckIn: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    share: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTicketTypes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=EventController.d.ts.map