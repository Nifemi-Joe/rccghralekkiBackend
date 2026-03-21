"use strict";
// src/controllers/ProfileController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileController = void 0;
const ProfileService_1 = require("@services/ProfileService");
const AppError_1 = require("@utils/AppError");
class ProfileController {
    constructor() {
        // ============================================================================
        // PROFILE ENDPOINTS
        // ============================================================================
        this.getProfile = async (req, res, next) => {
            try {
                const userId = req.user?.id;
                if (!userId)
                    throw new AppError_1.AppError('Authentication required', 401);
                const profile = await this.profileService.getProfile(userId);
                res.json({ success: true, data: profile });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateProfile = async (req, res, next) => {
            try {
                const userId = req.user?.id;
                if (!userId)
                    throw new AppError_1.AppError('Authentication required', 401);
                const user = await this.profileService.updateProfile(userId, req.body);
                res.json({ success: true, data: user });
            }
            catch (error) {
                next(error);
            }
        };
        this.changePassword = async (req, res, next) => {
            try {
                const userId = req.user?.id;
                if (!userId)
                    throw new AppError_1.AppError('Authentication required', 401);
                const result = await this.profileService.changePassword(userId, req.body);
                res.json({ success: true, ...result });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateProfileImage = async (req, res, next) => {
            try {
                const userId = req.user?.id;
                if (!userId)
                    throw new AppError_1.AppError('Authentication required', 401);
                const { imageUrl } = req.body;
                if (!imageUrl)
                    throw new AppError_1.AppError('Image URL is required', 400);
                const result = await this.profileService.updateProfileImage(userId, imageUrl);
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // STAFF MANAGEMENT ENDPOINTS
        // ============================================================================
        this.getStaffMembers = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const options = {
                    page: req.query.page ? parseInt(req.query.page) : 1,
                    limit: req.query.limit ? parseInt(req.query.limit) : 50,
                    search: req.query.search,
                    role: req.query.role,
                    status: req.query.status,
                };
                const result = await this.profileService.getStaffMembers(churchId, options);
                res.json({ success: true, ...result });
            }
            catch (error) {
                next(error);
            }
        };
        this.getStaffMember = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const staff = await this.profileService.getStaffMember(churchId, req.params.id);
                res.json({ success: true, data: staff });
            }
            catch (error) {
                next(error);
            }
        };
        this.createStaffMember = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                if (!churchId || !userId)
                    throw new AppError_1.AppError('Authentication required', 401);
                const result = await this.profileService.createStaffMember(churchId, req.body, userId);
                res.status(201).json({ success: true, ...result });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateStaffMember = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                if (!churchId || !userId)
                    throw new AppError_1.AppError('Authentication required', 401);
                const staff = await this.profileService.updateStaffMember(churchId, req.params.id, req.body, userId);
                res.json({ success: true, data: staff });
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteStaffMember = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                if (!churchId || !userId)
                    throw new AppError_1.AppError('Authentication required', 401);
                const result = await this.profileService.deleteStaffMember(churchId, req.params.id, userId);
                res.json({ success: true, ...result });
            }
            catch (error) {
                next(error);
            }
        };
        this.resendInvitation = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const result = await this.profileService.resendInvitation(churchId, req.params.id);
                res.json({ success: true, ...result });
            }
            catch (error) {
                next(error);
            }
        };
        this.getAvailablePermissions = async (req, res, next) => {
            try {
                const result = await this.profileService.getAvailablePermissions();
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.profileService = new ProfileService_1.ProfileService();
    }
}
exports.ProfileController = ProfileController;
//# sourceMappingURL=ProfileController.js.map