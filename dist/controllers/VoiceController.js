"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceController = void 0;
const VoiceService_1 = require("@services/VoiceService");
const catchAsync_1 = require("@utils/catchAsync");
const AppError_1 = require("@utils/AppError");
class VoiceController {
    constructor() {
        this.sendVoiceCall = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
            const { phoneNumber, code, recipientName } = req.body;
            if (!phoneNumber || !code) {
                throw new AppError_1.AppError('Phone number and code are required', 400);
            }
            const result = await this.voiceService.sendVoiceCall(churchId, { phoneNumber, code, recipientName }, userId);
            res.status(200).json({
                success: true,
                message: 'Voice call initiated successfully',
                data: result,
            });
        });
        this.sendVoiceOTP = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
            const { phoneNumber, pinLength, pinAttempts, pinTimeToLive } = req.body;
            if (!phoneNumber) {
                throw new AppError_1.AppError('Phone number is required', 400);
            }
            const result = await this.voiceService.sendVoiceOTP(churchId, { phoneNumber, pinLength, pinAttempts, pinTimeToLive }, userId);
            res.status(200).json({
                success: true,
                message: 'Voice OTP sent successfully',
                data: result,
            });
        });
        this.getVoiceCalls = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { status, page, limit } = req.query;
            const result = await this.voiceService.getVoiceCalls(churchId, {
                status: status,
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
            });
            res.status(200).json({
                success: true,
                data: result.data,
                pagination: {
                    total: result.total,
                    page: parseInt(page) || 1,
                    limit: parseInt(limit) || 20,
                },
            });
        });
        this.voiceService = new VoiceService_1.VoiceService();
    }
}
exports.VoiceController = VoiceController;
//# sourceMappingURL=VoiceController.js.map