"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirstTimerController = void 0;
const FirstTimerService_1 = require("@services/FirstTimerService");
const responseHandler_1 = require("@utils/responseHandler");
const AppError_1 = require("@utils/AppError");
class FirstTimerController {
    constructor() {
        this.createFirstTimer = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const firstTimerData = {
                    ...req.body,
                    churchId,
                    createdBy: req.user?.id,
                };
                const firstTimer = await this.firstTimerService.createFirstTimer(firstTimerData);
                (0, responseHandler_1.successResponse)(res, firstTimer, 'First timer registered successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.getAllFirstTimers = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const filters = {
                    churchId,
                    search: req.query.search,
                    status: req.query.status,
                    followUpStatus: req.query.followUpStatus,
                    wantsFollowUp: req.query.wantsFollowUp === 'true' ? true : req.query.wantsFollowUp === 'false' ? false : undefined,
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                    conversionEligible: req.query.conversionEligible === 'true',
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 20,
                    sortBy: req.query.sortBy,
                    sortOrder: req.query.sortOrder,
                };
                const result = await this.firstTimerService.getAllFirstTimers(filters);
                (0, responseHandler_1.successResponse)(res, result, 'First timers retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getFirstTimerById = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const firstTimer = await this.firstTimerService.getFirstTimerById(id, churchId);
                (0, responseHandler_1.successResponse)(res, firstTimer, 'First timer retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.updateFirstTimer = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const updateData = {
                    ...req.body,
                    updatedBy: req.user?.id,
                };
                const firstTimer = await this.firstTimerService.updateFirstTimer(id, churchId, updateData);
                (0, responseHandler_1.successResponse)(res, firstTimer, 'First timer updated successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteFirstTimer = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                await this.firstTimerService.deleteFirstTimer(id, churchId);
                (0, responseHandler_1.successResponse)(res, null, 'First timer deleted successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.recordVisit = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                const { visitDate } = req.body;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const firstTimer = await this.firstTimerService.recordVisit(id, churchId, visitDate);
                (0, responseHandler_1.successResponse)(res, firstTimer, 'Visit recorded successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.recordContactAttempt = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                const { notes } = req.body;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const firstTimer = await this.firstTimerService.recordContactAttempt(id, churchId, notes);
                (0, responseHandler_1.successResponse)(res, firstTimer, 'Contact attempt recorded successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.convertToMember = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const result = await this.firstTimerService.convertToMember(id, churchId, { firstTimerId: id, additionalData: req.body.additionalData }, req.user?.id);
                (0, responseHandler_1.successResponse)(res, result, 'First timer converted to member successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.getStatistics = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const statistics = await this.firstTimerService.getStatistics(churchId);
                (0, responseHandler_1.successResponse)(res, statistics, 'Statistics retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getConversionEligible = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const eligible = await this.firstTimerService.getConversionEligible(churchId);
                (0, responseHandler_1.successResponse)(res, eligible, 'Conversion eligible first timers retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getPendingFollowUps = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const pending = await this.firstTimerService.getPendingFollowUps(churchId);
                (0, responseHandler_1.successResponse)(res, pending, 'Pending follow-ups retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getConversionSettings = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const settings = await this.firstTimerService.getConversionSettings(churchId);
                (0, responseHandler_1.successResponse)(res, settings, 'Conversion settings retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.updateConversionSettings = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const { conversionPeriodDays } = req.body;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const settings = await this.firstTimerService.updateConversionSettings(churchId, conversionPeriodDays);
                (0, responseHandler_1.successResponse)(res, settings, 'Conversion settings updated successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.firstTimerService = new FirstTimerService_1.FirstTimerService();
    }
}
exports.FirstTimerController = FirstTimerController;
//# sourceMappingURL=FirstTimerController.js.map