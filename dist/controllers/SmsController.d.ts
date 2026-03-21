import { Request, Response } from 'express';
export declare class SmsController {
    private smsService;
    constructor();
    requestSenderId: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getSenderIds: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getApprovedSenderIds: (req: Request, res: Response, next: import("express").NextFunction) => void;
    syncSenderIds: (req: Request, res: Response, next: import("express").NextFunction) => void;
    setDefaultSenderId: (req: Request, res: Response, next: import("express").NextFunction) => void;
    deleteSenderId: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getBalance: (req: Request, res: Response, next: import("express").NextFunction) => void;
    composeSms: (req: Request, res: Response, next: import("express").NextFunction) => void;
    sendSingleSms: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getCampaigns: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getCampaignById: (req: Request, res: Response, next: import("express").NextFunction) => void;
    updateCampaign: (req: Request, res: Response, next: import("express").NextFunction) => void;
    deleteCampaign: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getDrafts: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getScheduled: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getCampaignReport: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getMessages: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getMessagesByCampaign: (req: Request, res: Response, next: import("express").NextFunction) => void;
    syncMessageStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getReplies: (req: Request, res: Response, next: import("express").NextFunction) => void;
    markReplyAsRead: (req: Request, res: Response, next: import("express").NextFunction) => void;
    markAllRepliesAsRead: (req: Request, res: Response, next: import("express").NextFunction) => void;
    replyToMessage: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getContactLists: (req: Request, res: Response, next: import("express").NextFunction) => void;
    createContactList: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getContactListById: (req: Request, res: Response, next: import("express").NextFunction) => void;
    updateContactList: (req: Request, res: Response, next: import("express").NextFunction) => void;
    deleteContactList: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getContactListItems: (req: Request, res: Response, next: import("express").NextFunction) => void;
    addContactsToList: (req: Request, res: Response, next: import("express").NextFunction) => void;
    removeContactFromList: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getSMSHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=SmsController.d.ts.map