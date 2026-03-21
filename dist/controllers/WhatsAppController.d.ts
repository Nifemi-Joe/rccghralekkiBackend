import { Request, Response } from 'express';
export declare class WhatsAppController {
    private whatsappService;
    constructor();
    createAccount: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getAccounts: (req: Request, res: Response, next: import("express").NextFunction) => void;
    setDefaultAccount: (req: Request, res: Response, next: import("express").NextFunction) => void;
    createTemplate: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getTemplates: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getApprovedTemplates: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getTemplateById: (req: Request, res: Response, next: import("express").NextFunction) => void;
    updateTemplate: (req: Request, res: Response, next: import("express").NextFunction) => void;
    deleteTemplate: (req: Request, res: Response, next: import("express").NextFunction) => void;
    syncTemplates: (req: Request, res: Response, next: import("express").NextFunction) => void;
    sendMessage: (req: Request, res: Response, next: import("express").NextFunction) => void;
    sendBulkMessage: (req: Request, res: Response, next: import("express").NextFunction) => void;
    composeCampaign: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getCampaigns: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getCampaignById: (req: Request, res: Response, next: import("express").NextFunction) => void;
    updateCampaign: (req: Request, res: Response, next: import("express").NextFunction) => void;
    deleteCampaign: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getDrafts: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getScheduled: (req: Request, res: Response, next: import("express").NextFunction) => void;
    cancelScheduled: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getCampaignReport: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getMessages: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getMessagesByCampaign: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getConversations: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
    handleWebhook: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=WhatsAppController.d.ts.map