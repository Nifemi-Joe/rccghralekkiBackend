import { Request, Response } from 'express';
export declare class EmailController {
    private emailService;
    constructor();
    createConfiguration: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getConfigurations: (req: Request, res: Response, next: import("express").NextFunction) => void;
    setDefaultConfiguration: (req: Request, res: Response, next: import("express").NextFunction) => void;
    deleteConfiguration: (req: Request, res: Response, next: import("express").NextFunction) => void;
    createTemplate: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getTemplates: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getTemplateById: (req: Request, res: Response, next: import("express").NextFunction) => void;
    updateTemplate: (req: Request, res: Response, next: import("express").NextFunction) => void;
    deleteTemplate: (req: Request, res: Response, next: import("express").NextFunction) => void;
    composeEmail: (req: Request, res: Response, next: import("express").NextFunction) => void;
    sendSingleEmail: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getCampaigns: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getCampaignById: (req: Request, res: Response, next: import("express").NextFunction) => void;
    deleteCampaign: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getDrafts: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getScheduled: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getEmails: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getCampaignReport: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=EmailController.d.ts.map