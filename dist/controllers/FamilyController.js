"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamilyController = void 0;
const FamilyService_1 = require("@services/FamilyService");
const responseHandler_1 = require("@utils/responseHandler");
class FamilyController {
    constructor() {
        // ============================================================================
        // FAMILY CRUD
        // ============================================================================
        this.createFamily = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const family = await this.familyService.createFamily(churchId, req.body, userId);
                (0, responseHandler_1.successResponse)(res, family, 'Family created successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.getFamily = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const family = await this.familyService.getFamilyById(id, churchId);
                (0, responseHandler_1.successResponse)(res, family);
            }
            catch (error) {
                next(error);
            }
        };
        this.getAllFamilies = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const filters = {
                    churchId,
                    search: req.query.search,
                    isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 20,
                };
                const result = await this.familyService.getAllFamilies(filters);
                (0, responseHandler_1.successResponse)(res, result);
            }
            catch (error) {
                next(error);
            }
        };
        this.updateFamily = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const family = await this.familyService.updateFamily(id, churchId, req.body);
                (0, responseHandler_1.successResponse)(res, family, 'Family updated successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteFamily = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                await this.familyService.deleteFamily(id, churchId);
                (0, responseHandler_1.successResponse)(res, null, 'Family deleted successfully');
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // FAMILY MEMBERS
        // ============================================================================
        this.getFamilyMembers = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const members = await this.familyService.getFamilyMembers(id, churchId);
                (0, responseHandler_1.successResponse)(res, members);
            }
            catch (error) {
                next(error);
            }
        };
        this.addMember = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const members = await this.familyService.addMember(id, churchId, req.body);
                (0, responseHandler_1.successResponse)(res, members, 'Member added to family successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.removeMember = async (req, res, next) => {
            try {
                const { id, memberId } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const members = await this.familyService.removeMember(id, memberId, churchId);
                (0, responseHandler_1.successResponse)(res, members, 'Member removed from family successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.updateMember = async (req, res, next) => {
            try {
                const { id, memberId } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const members = await this.familyService.updateMember(id, memberId, churchId, req.body);
                (0, responseHandler_1.successResponse)(res, members, 'Family member updated successfully');
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // STATISTICS
        // ============================================================================
        this.getStatistics = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const statistics = await this.familyService.getStatistics(churchId);
                (0, responseHandler_1.successResponse)(res, statistics);
            }
            catch (error) {
                next(error);
            }
        };
        this.familyService = new FamilyService_1.FamilyService();
    }
}
exports.FamilyController = FamilyController;
//# sourceMappingURL=FamilyController.js.map