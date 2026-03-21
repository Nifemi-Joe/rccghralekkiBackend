"use strict";
// src/services/CelebrationService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CelebrationService = void 0;
const CelebrationRepository_1 = require("@repositories/CelebrationRepository");
const logger_1 = __importDefault(require("@config/logger"));
class CelebrationService {
    constructor() {
        this.celebrationRepository = new CelebrationRepository_1.CelebrationRepository();
    }
    async getCelebrations(churchId, filters = {}) {
        try {
            return await this.celebrationRepository.getCelebrations(churchId, filters);
        }
        catch (error) {
            logger_1.default.error('Error in CelebrationService.getCelebrations:', error);
            throw error;
        }
    }
    async getTodayCelebrations(churchId) {
        try {
            return await this.celebrationRepository.getTodayCelebrations(churchId);
        }
        catch (error) {
            logger_1.default.error('Error in CelebrationService.getTodayCelebrations:', error);
            throw error;
        }
    }
}
exports.CelebrationService = CelebrationService;
//# sourceMappingURL=CelebrationService.js.map