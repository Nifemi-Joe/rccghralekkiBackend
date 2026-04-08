"use strict";
// src/controllers/FollowUpController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowUpController = void 0;
const FollowUpService_1 = require("@services/FollowUpService");
class FollowUpController {
    constructor() {
        // ============================================================================
        // DEPARTMENT
        // ============================================================================
        this.getDepartment = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const department = await this.followUpService.getDepartment(churchId);
                res.json(department);
            }
            catch (error) {
                next(error);
            }
        };
        this.updateDepartmentSettings = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const department = await this.followUpService.updateDepartmentSettings(churchId, req.body);
                res.json(department);
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // MEMBERS
        // ============================================================================
        this.getMembers = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { search, status } = req.query;
                const members = await this.followUpService.getMembers(churchId, {
                    search: search,
                    status: status,
                });
                res.json(members);
            }
            catch (error) {
                next(error);
            }
        };
        this.addMember = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const userId = req.user.id;
                const member = await this.followUpService.addMember(churchId, userId, req.body);
                res.status(201).json(member);
            }
            catch (error) {
                next(error);
            }
        };
        this.updateMember = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { memberId } = req.params;
                const member = await this.followUpService.updateMember(churchId, memberId, req.body);
                res.json(member);
            }
            catch (error) {
                next(error);
            }
        };
        this.removeMember = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { memberId } = req.params;
                await this.followUpService.removeMember(churchId, memberId);
                res.status(204).send();
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // ASSIGNMENTS
        // ============================================================================
        this.getAssignments = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const filters = {
                    search: req.query.search,
                    status: req.query.status,
                    priority: req.query.priority,
                    assignedMemberId: req.query.assignedMemberId,
                    dateFrom: req.query.dateFrom,
                    dateTo: req.query.dateTo,
                    overdue: req.query.overdue === 'true',
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 20,
                };
                const result = await this.followUpService.getAssignments(churchId, filters);
                res.json(result);
            }
            catch (error) {
                next(error);
            }
        };
        this.getAssignment = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { assignmentId } = req.params;
                const assignment = await this.followUpService.getAssignmentById(churchId, assignmentId);
                res.json(assignment);
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Fixed: added explicit Promise<void> return type and removed early-return
         * `return res.xxx()` pattern — instead we use a single code path so TypeScript
         * is satisfied that every branch either calls next() or ends with res.xxx().
         */
        this.getAssignmentByFirstTimer = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { firstTimerId } = req.params;
                const assignment = await this.followUpService.getAssignmentByFirstTimer(churchId, firstTimerId);
                if (!assignment) {
                    res.status(404).json({ message: 'No active assignment found' });
                    return;
                }
                res.json(assignment);
            }
            catch (error) {
                next(error);
            }
        };
        this.createAssignment = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const userId = req.user.id;
                const assignment = await this.followUpService.createAssignment(churchId, userId, req.body);
                res.status(201).json(assignment);
            }
            catch (error) {
                next(error);
            }
        };
        this.bulkCreateAssignments = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const userId = req.user.id;
                const result = await this.followUpService.bulkCreateAssignments(churchId, userId, req.body);
                res.status(201).json(result);
            }
            catch (error) {
                next(error);
            }
        };
        this.updateAssignment = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { assignmentId } = req.params;
                const assignment = await this.followUpService.updateAssignment(churchId, assignmentId, req.body);
                res.json(assignment);
            }
            catch (error) {
                next(error);
            }
        };
        this.completeAssignment = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const userId = req.user.id;
                const { assignmentId } = req.params;
                const assignment = await this.followUpService.completeAssignment(churchId, userId, assignmentId, req.body.notes);
                res.json(assignment);
            }
            catch (error) {
                next(error);
            }
        };
        this.reassignMember = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { assignmentId } = req.params;
                const assignment = await this.followUpService.reassignMember(churchId, assignmentId, req.body);
                res.json(assignment);
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // ACTIVITIES
        // ============================================================================
        this.getActivities = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { assignmentId } = req.params;
                const filters = {
                    channel: req.query.channel,
                    activityType: req.query.activityType,
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 20,
                };
                const result = await this.followUpService.getActivities(churchId, assignmentId, filters);
                res.json(result);
            }
            catch (error) {
                next(error);
            }
        };
        this.sendMessage = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const userId = req.user.id;
                const result = await this.followUpService.sendMessage(churchId, userId, req.body);
                res.status(201).json(result);
            }
            catch (error) {
                next(error);
            }
        };
        this.recordActivity = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const userId = req.user.id;
                const activity = await this.followUpService.recordActivity(churchId, userId, req.body);
                res.status(201).json(activity);
            }
            catch (error) {
                next(error);
            }
        };
        this.recordResponse = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { activityId } = req.params;
                const activity = await this.followUpService.recordResponse(churchId, activityId, req.body.response);
                res.json(activity);
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // TEMPLATES
        // ============================================================================
        this.getTemplates = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { channel } = req.query;
                const templates = await this.followUpService.getTemplates(churchId, channel);
                res.json(templates);
            }
            catch (error) {
                next(error);
            }
        };
        this.createTemplate = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const userId = req.user.id;
                const template = await this.followUpService.createTemplate(churchId, userId, req.body);
                res.status(201).json(template);
            }
            catch (error) {
                next(error);
            }
        };
        this.updateTemplate = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { templateId } = req.params;
                const template = await this.followUpService.updateTemplate(churchId, templateId, req.body);
                res.json(template);
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteTemplate = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { templateId } = req.params;
                await this.followUpService.deleteTemplate(churchId, templateId);
                res.status(204).send();
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
                const churchId = req.user.churchId;
                const statistics = await this.followUpService.getStatistics(churchId);
                res.json(statistics);
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // MY ASSIGNMENTS
        // ============================================================================
        this.getMyAssignments = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const userId = req.user.id;
                const filters = {
                    search: req.query.search,
                    status: req.query.status,
                    priority: req.query.priority,
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 20,
                };
                const result = await this.followUpService.getMyAssignments(churchId, userId, filters);
                res.json(result);
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // UNASSIGNED FIRST TIMERS
        // ============================================================================
        this.getUnassignedFirstTimers = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const firstTimers = await this.followUpService.getUnassignedFirstTimers(churchId);
                res.json(firstTimers);
            }
            catch (error) {
                next(error);
            }
        };
        this.followUpService = new FollowUpService_1.FollowUpService();
    }
}
exports.FollowUpController = FollowUpController;
//# sourceMappingURL=FollowUpController.js.map