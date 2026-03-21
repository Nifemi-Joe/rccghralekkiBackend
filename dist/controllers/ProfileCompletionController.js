"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileCompletionController = void 0;
const ProfileCompletionService_1 = require("@services/ProfileCompletionService");
const responseHandler_1 = require("@utils/responseHandler");
const AppError_1 = require("@utils/AppError");
class ProfileCompletionController {
    constructor() {
        /**
         * Get profile completion form data (public - no auth required)
         */
        this.getProfileForm = async (req, res, next) => {
            try {
                const { token } = req.params;
                if (!token) {
                    throw new AppError_1.AppError('Token is required', 400);
                }
                const formData = await this.profileService.getProfileFormData(token);
                (0, responseHandler_1.successResponse)(res, formData, 'Profile form data retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Submit completed profile (public - no auth required)
         */
        this.submitProfile = async (req, res, next) => {
            try {
                const { token } = req.params;
                if (!token) {
                    throw new AppError_1.AppError('Token is required', 400);
                }
                const result = await this.profileService.submitProfileCompletion(token, req.body);
                (0, responseHandler_1.successResponse)(res, result, 'Profile updated successfully');
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Upload profile completion via file (CSV/Excel)
         */
        this.uploadProfileFile = async (req, res, next) => {
            try {
                const { token } = req.params;
                const file = req.file;
                if (!token) {
                    throw new AppError_1.AppError('Token is required', 400);
                }
                if (!file) {
                    throw new AppError_1.AppError('File is required', 400);
                }
                const result = await this.profileService.processProfileFile(token, file);
                (0, responseHandler_1.successResponse)(res, result, 'Profile updated successfully from file');
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Download profile completion template
         */
        this.downloadTemplate = async (req, res, next) => {
            try {
                const { format } = req.params; // 'csv' or 'xlsx'
                const { type = 'member' } = req.query; // 'member' or 'first_timer'
                if (!format || !['csv', 'xlsx'].includes(format)) {
                    throw new AppError_1.AppError('Format must be "csv" or "xlsx"', 400);
                }
                const template = await this.profileService.generateTemplate(format, type);
                res.setHeader('Content-Type', template.contentType);
                res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
                res.send(template.data);
            }
            catch (error) {
                next(error);
            }
        };
        this.profileService = new ProfileCompletionService_1.ProfileCompletionService();
    }
}
exports.ProfileCompletionController = ProfileCompletionController;
//# sourceMappingURL=ProfileCompletionController.js.map