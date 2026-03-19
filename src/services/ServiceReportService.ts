import { ServiceReportRepository } from '@repositories/ServiceReportRepository';
import { AppError } from '@utils/AppError';
import { CreateServiceReportDTO, UpdateServiceReportDTO, ServiceReportFilters } from '@/dtos/serviceReport.types';
import logger from '@config/logger';

export class ServiceReportService {
  private serviceReportRepository: ServiceReportRepository;

  constructor() {
    this.serviceReportRepository = new ServiceReportRepository();
  }

  async createReport(churchId: string, userId: string, data: CreateServiceReportDTO) {
    // Validate financial totals match payment channels
    const totalPaymentChannels = data.cash_amount + data.bank_transfer_amount + data.card_amount + (data.mobile_money_amount || 0);
    const totalIncome = data.offerings + data.tithes + data.donations + (data.other_income || 0);

    if (Math.abs(totalPaymentChannels - totalIncome) > 0.01) {
      throw new AppError('Payment channel totals must equal total income (offerings + tithes + donations)', 400);
    }

    const report = await this.serviceReportRepository.create(churchId, userId, data);
    logger.info(`Service report created for ${report.event_name} on ${report.service_date}`);
    return report;
  }

  async getAllReports(churchId: string, filters: ServiceReportFilters = {}) {
    return this.serviceReportRepository.findAll(churchId, filters);
  }

  async getReportById(churchId: string, reportId: string) {
    const report = await this.serviceReportRepository.findById(churchId, reportId);
    if (!report) {
      throw new AppError('Service report not found', 404);
    }
    return report;
  }

  async updateReport(churchId: string, reportId: string, data: UpdateServiceReportDTO) {
    const report = await this.serviceReportRepository.update(churchId, reportId, data);
    if (!report) {
      throw new AppError('Service report not found', 404);
    }
    logger.info(`Service report updated: ${reportId}`);
    return report;
  }

  async deleteReport(churchId: string, reportId: string) {
    await this.serviceReportRepository.delete(churchId, reportId);
    logger.info(`Service report deleted: ${reportId}`);
  }

  async getReportSummary(churchId: string, startDate?: string, endDate?: string) {
    return this.serviceReportRepository.getSummary(churchId, startDate, endDate);
  }
}
