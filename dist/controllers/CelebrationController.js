"use strict";
// src/controllers/CelebrationController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.CelebrationController = void 0;
const CelebrationService_1 = require("@services/CelebrationService");
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
class CelebrationController {
    constructor() {
        this.getCelebrations = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const filters = {
                type: req.query.type,
                daysAhead: parseInt(req.query.daysAhead) || 30,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50,
            };
            const result = await this.celebrationService.getCelebrations(churchId, filters);
            res.json({
                status: 'success',
                data: result,
            });
        });
        this.getTodayCelebrations = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const celebrations = await this.celebrationService.getTodayCelebrations(churchId);
            res.json({
                status: 'success',
                data: celebrations,
            });
        });
        this.celebrationService = new CelebrationService_1.CelebrationService();
    }
}
exports.CelebrationController = CelebrationController;
//# sourceMappingURL=CelebrationController.js.map