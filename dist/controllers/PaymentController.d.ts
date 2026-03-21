import { Request, Response } from 'express';
export declare class PaymentController {
    private paymentService;
    constructor();
    getPaystackPublicKey: (req: Request, res: Response, next: import("express").NextFunction) => void;
    initiatePurchase: (req: Request, res: Response, next: import("express").NextFunction) => void;
    verifyPayment: (req: Request, res: Response, next: import("express").NextFunction) => void;
    handleWebhook: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getPaymentHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=PaymentController.d.ts.map