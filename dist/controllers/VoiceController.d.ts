import { Request, Response } from 'express';
export declare class VoiceController {
    private voiceService;
    constructor();
    sendVoiceCall: (req: Request, res: Response, next: import("express").NextFunction) => void;
    sendVoiceOTP: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getVoiceCalls: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=VoiceController.d.ts.map