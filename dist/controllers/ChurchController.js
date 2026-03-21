"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChurchController = void 0;
const ChurchService_1 = require("@services/ChurchService");
const AppError_1 = require("@utils/AppError");
class ChurchController {
    constructor() {
        // =========================================================================
        // REGISTRATION FLOW
        // =========================================================================
        this.registerChurchOnly = async (req, res, next) => {
            try {
                const result = await this.churchService.registerChurchOnly(req.body);
                res.status(200).json({
                    success: true,
                    ...result
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.verifyOTP = async (req, res, next) => {
            try {
                const { email, otp } = req.body;
                const result = await this.churchService.verifyOTP(email, otp);
                res.status(200).json({
                    success: true,
                    ...result
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.resendOTP = async (req, res, next) => {
            try {
                const { email } = req.body;
                if (!email) {
                    throw new AppError_1.AppError('Email is required', 400);
                }
                const result = await this.churchService.resendOTP(email);
                res.status(200).json({
                    success: true,
                    ...result
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.setupAdmin = async (req, res, next) => {
            try {
                const { skipSetup, ...data } = req.body;
                const result = await this.churchService.setupAdmin(data, skipSetup === true);
                res.status(200).json({
                    success: true,
                    ...result
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.skipAdminSetup = async (req, res, next) => {
            try {
                const { churchId } = req.body;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID is required', 400);
                }
                const result = await this.churchService.setupAdmin({ churchId }, true);
                res.status(200).json({
                    success: true,
                    ...result
                });
            }
            catch (error) {
                next(error);
            }
        };
        // =========================================================================
        // ADDITIONAL ADMIN
        // =========================================================================
        this.createAdditionalAdmin = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const createdBy = req.user?.id;
                if (!churchId || !createdBy) {
                    throw new AppError_1.AppError('Unauthorized', 401);
                }
                const result = await this.churchService.createAdditionalAdmin(churchId, req.body, createdBy);
                res.status(201).json({
                    success: true,
                    ...result
                });
            }
            catch (error) {
                next(error);
            }
        };
        // =========================================================================
        // CHURCH CRUD
        // =========================================================================
        this.getChurch = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church not found', 404);
                }
                const church = await this.churchService.getChurchById(churchId);
                res.status(200).json({
                    success: true,
                    data: church
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.getChurchById = async (req, res, next) => {
            try {
                const { id } = req.params;
                const church = await this.churchService.getChurchById(id);
                res.status(200).json({
                    success: true,
                    data: church
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.getChurchBySlug = async (req, res, next) => {
            try {
                const { slug } = req.params;
                const church = await this.churchService.getChurchBySlug(slug);
                res.status(200).json({
                    success: true,
                    data: church
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateChurch = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church not found', 404);
                }
                const church = await this.churchService.updateChurch(churchId, req.body);
                res.status(200).json({
                    success: true,
                    data: church,
                    message: 'Church updated successfully'
                });
            }
            catch (error) {
                next(error);
            }
        };
        // =========================================================================
        // SPECIALIZED UPDATE ENDPOINTS
        // =========================================================================
        this.updateChurchAddress = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church not found', 404);
                }
                const { address, city, state, postalCode, country, latitude, longitude } = req.body;
                const church = await this.churchService.updateChurch(churchId, {
                    address,
                    city,
                    state,
                    postalCode,
                    country,
                    latitude,
                    longitude
                });
                res.status(200).json({
                    success: true,
                    data: church,
                    message: 'Church address updated successfully'
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateChurchCurrency = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church not found', 404);
                }
                const { currency } = req.body;
                if (!currency) {
                    throw new AppError_1.AppError('Currency is required', 400);
                }
                const church = await this.churchService.updateChurch(churchId, { currency });
                res.status(200).json({
                    success: true,
                    data: church,
                    message: 'Church currency updated successfully'
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateChurchSettings = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church not found', 404);
                }
                const { settings } = req.body;
                if (!settings || typeof settings !== 'object') {
                    throw new AppError_1.AppError('Settings object is required', 400);
                }
                const church = await this.churchService.updateChurch(churchId, { settings });
                res.status(200).json({
                    success: true,
                    data: church,
                    message: 'Church settings updated successfully'
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteChurch = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church not found', 404);
                }
                await this.churchService.deleteChurch(churchId);
                res.status(200).json({
                    success: true,
                    message: 'Church deleted successfully'
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.churchService = new ChurchService_1.ChurchService();
    }
}
exports.ChurchController = ChurchController;
//# sourceMappingURL=ChurchController.js.map