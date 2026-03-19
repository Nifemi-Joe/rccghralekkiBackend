// src/controllers/VoiceController.ts
import { Request, Response } from 'express';
import { VoiceService } from '@services/VoiceService';
import { catchAsync } from '@utils/catchAsync';
import { AppError } from '@utils/AppError';

export class VoiceController {
    private voiceService: VoiceService;

    constructor() {
        this.voiceService = new VoiceService();
    }

    sendVoiceCall = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;
        const { phoneNumber, code, recipientName } = req.body;

        if (!phoneNumber || !code) {
            throw new AppError('Phone number and code are required', 400);
        }

        const result = await this.voiceService.sendVoiceCall(
            churchId,
            { phoneNumber, code, recipientName },
            userId
        );

        res.status(200).json({
            success: true,
            message: 'Voice call initiated successfully',
            data: result,
        });
    });

    sendVoiceOTP = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;
        const { phoneNumber, pinLength, pinAttempts, pinTimeToLive } = req.body;

        if (!phoneNumber) {
            throw new AppError('Phone number is required', 400);
        }

        const result = await this.voiceService.sendVoiceOTP(
            churchId,
            { phoneNumber, pinLength, pinAttempts, pinTimeToLive },
            userId
        );

        res.status(200).json({
            success: true,
            message: 'Voice OTP sent successfully',
            data: result,
        });
    });

    getVoiceCalls = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { status, page, limit } = req.query;

        const result = await this.voiceService.getVoiceCalls(churchId, {
            status: status as string,
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
        });

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: {
                total: result.total,
                page: parseInt(page as string) || 1,
                limit: parseInt(limit as string) || 20,
            },
        });
    });
}
