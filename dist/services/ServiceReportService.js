"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceReportService = void 0;
const ServiceReportRepository_1 = require("@repositories/ServiceReportRepository");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
class ServiceReportService {
    constructor() {
        this.serviceReportRepository = new ServiceReportRepository_1.ServiceReportRepository();
    }
    async createReport(churchId, userId, data) {
        // Validate financial totals match payment channels
        const totalPaymentChannels = data.cash_amount + data.bank_transfer_amount + data.card_amount + (data.mobile_money_amount || 0);
        const totalIncome = data.offerings + data.tithes + data.donations + (data.other_income || 0);
        if (Math.abs(totalPaymentChannels - totalIncome) > 0.01) {
            throw new AppError_1.AppError('Payment channel totals must equal total income (offerings + tithes + donations)', 400);
        }
        const report = await this.serviceReportRepository.create(churchId, userId, data);
        logger_1.default.info(`Service report created for ${report.event_name} on ${report.service_date}`);
        return report;
    }
    async getAllReports(churchId, filters = {}) {
        return this.serviceReportRepository.findAll(churchId, filters);
    }
    async getReportById(churchId, reportId) {
        const report = await this.serviceReportRepository.findById(churchId, reportId);
        if (!report) {
            throw new AppError_1.AppError('Service report not found', 404);
        }
        return report;
    }
    async updateReport(churchId, reportId, data) {
        const report = await this.serviceReportRepository.update(churchId, reportId, data);
        if (!report) {
            throw new AppError_1.AppError('Service report not found', 404);
        }
        logger_1.default.info(`Service report updated: ${reportId}`);
        return report;
    }
    async deleteReport(churchId, reportId) {
        await this.serviceReportRepository.delete(churchId, reportId);
        logger_1.default.info(`Service report deleted: ${reportId}`);
    }
    async getReportSummary(churchId, startDate, endDate) {
        return this.serviceReportRepository.getSummary(churchId, startDate, endDate);
    }
}
exports.ServiceReportService = ServiceReportService;
//# sourceMappingURL=ServiceReportService.js.map