import { Request, Response, NextFunction } from 'express';
export declare class NotificationController {
    subscribe(req: Request, res: Response, next: NextFunction): Promise<void>;
    unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void>;
    getVapidKey(req: Request, res: Response, next: NextFunction): Promise<void>;
    sendToMember(req: Request, res: Response, next: NextFunction): Promise<void>;
    sendToChurch(req: Request, res: Response, next: NextFunction): Promise<void>;
    sendEventReminder(req: Request, res: Response, next: NextFunction): Promise<void>;
    sendProximityAlert(req: Request, res: Response, next: NextFunction): Promise<void>;
    sendEmail(req: Request, res: Response, next: NextFunction): Promise<void>;
    sendBulkEmail(req: Request, res: Response, next: NextFunction): Promise<void>;
    sendTemplateEmail(req: Request, res: Response, next: NextFunction): Promise<void>;
    verifyEmailConnection(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const notificationController: NotificationController;
//# sourceMappingURL=NotificationController.d.ts.map