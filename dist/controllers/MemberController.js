"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberController = void 0;
const MemberService_1 = require("@services/MemberService");
const responseHandler_1 = require("@utils/responseHandler");
const AppError_1 = require("@utils/AppError");
class MemberController {
    constructor() {
        this.createMember = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const memberData = {
                    ...req.body,
                    churchId,
                    createdBy: req.user?.id,
                };
                const result = await this.memberService.createMember(memberData, {
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                });
                (0, responseHandler_1.successResponse)(res, result, 'Member created successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.generateProfileLink = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const profileLink = await this.memberService.generateProfileUpdateLink(id, churchId, req.user?.id, req.ip, req.get('user-agent'));
                (0, responseHandler_1.successResponse)(res, profileLink, 'Profile update link generated successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.sendProfileLink = async (req, res, next) => {
            try {
                const { id } = req.params;
                const { channels } = req.body;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                if (!channels || !Array.isArray(channels) || channels.length === 0) {
                    throw new AppError_1.AppError('At least one channel (email or sms) is required', 400);
                }
                const result = await this.memberService.sendProfileUpdateLink(id, churchId, channels, req.user?.id, req.ip, req.get('user-agent'));
                (0, responseHandler_1.successResponse)(res, result, 'Profile update link sent successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.updateMemberViaToken = async (req, res, next) => {
            try {
                const { token } = req.params;
                const member = await this.memberService.updateMemberViaToken(token, req.body, req.ip, req.get('user-agent'));
                (0, responseHandler_1.successResponse)(res, member, 'Profile updated successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getMemberAuditLogs = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 20;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const result = await this.memberService.getAuditLogs(id, churchId, { page, limit });
                (0, responseHandler_1.successResponse)(res, result, 'Audit logs retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getAllMembers = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const filters = {
                    churchId,
                    search: req.query.search,
                    status: req.query.status,
                    gender: req.query.gender,
                    maritalStatus: req.query.maritalStatus,
                    profileCompleted: req.query.profileCompleted === 'true' ? true : req.query.profileCompleted === 'false' ? false : undefined,
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 20,
                    sortBy: req.query.sortBy,
                    sortOrder: req.query.sortOrder,
                };
                const result = await this.memberService.getAllMembers(filters);
                (0, responseHandler_1.successResponse)(res, result, 'Members retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getCelebrations = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const filters = {
                    type: req.query.type,
                    period: req.query.period,
                    days: req.query.days ? parseInt(req.query.days) : undefined,
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 20,
                };
                const result = await this.memberService.getCelebrations(churchId, filters);
                (0, responseHandler_1.successResponse)(res, result, 'Celebrations retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getMemberById = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const member = await this.memberService.getMemberById(id, churchId);
                (0, responseHandler_1.successResponse)(res, member, 'Member retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.updateMember = async (req, res, next) => {
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
                const member = await this.memberService.updateMember(id, churchId, updateData, req.user?.id, req.ip, req.get('user-agent'));
                (0, responseHandler_1.successResponse)(res, member, 'Member updated successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteMember = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                await this.memberService.deleteMember(id, churchId, req.user?.id, req.ip, req.get('user-agent'));
                (0, responseHandler_1.successResponse)(res, null, 'Member deleted successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getMemberStatistics = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const statistics = await this.memberService.getMemberStatistics(churchId);
                (0, responseHandler_1.successResponse)(res, statistics, 'Statistics retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.searchMembers = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const query = req.query.q;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                if (!query) {
                    throw new AppError_1.AppError('Search query is required', 400);
                }
                const members = await this.memberService.searchMembers(query, churchId);
                (0, responseHandler_1.successResponse)(res, members, 'Search results retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.registerViaQR = async (req, res, next) => {
            try {
                const { churchId, ...memberData } = req.body;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID is required', 400);
                }
                const member = await this.memberService.registerViaQR({
                    ...memberData,
                    churchId,
                });
                (0, responseHandler_1.successResponse)(res, member, 'Registration successful', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.getMemberByToken = async (req, res, next) => {
            try {
                const { token } = req.params;
                if (!token) {
                    throw new AppError_1.AppError('Token is required', 400);
                }
                const member = await this.memberService.getMemberByToken(token);
                (0, responseHandler_1.successResponse)(res, member, 'Member retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.memberService = new MemberService_1.MemberService();
    }
}
exports.MemberController = MemberController;
//# sourceMappingURL=MemberController.js.map