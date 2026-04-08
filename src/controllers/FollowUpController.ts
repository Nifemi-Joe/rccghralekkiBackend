// src/controllers/FollowUpController.ts

import { Request, Response, NextFunction } from 'express';
import { FollowUpService } from '@services/FollowUpService';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

export class FollowUpController {
    private followUpService: FollowUpService;

    constructor() {
        this.followUpService = new FollowUpService();
    }

    // ============================================================================
    // DEPARTMENT
    // ============================================================================

    getDepartment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const department = await this.followUpService.getDepartment(churchId);
            res.json(department);
        } catch (error) {
            next(error);
        }
    };

    updateDepartmentSettings = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const department = await this.followUpService.updateDepartmentSettings(churchId, req.body);
            res.json(department);
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // MEMBERS
    // ============================================================================

    getMembers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { search, status } = req.query;

            const members = await this.followUpService.getMembers(churchId, {
                search: search as string,
                status: status as string,
            });

            res.json(members);
        } catch (error) {
            next(error);
        }
    };

    addMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const userId = req.user!.id;

            const member = await this.followUpService.addMember(churchId, userId, req.body);
            res.status(201).json(member);
        } catch (error) {
            next(error);
        }
    };

    updateMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { memberId } = req.params;

            const member = await this.followUpService.updateMember(churchId, memberId, req.body);
            res.json(member);
        } catch (error) {
            next(error);
        }
    };

    removeMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { memberId } = req.params;

            await this.followUpService.removeMember(churchId, memberId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // ASSIGNMENTS
    // ============================================================================

    getAssignments = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const filters = {
                search: req.query.search as string,
                status: req.query.status as any,
                priority: req.query.priority as any,
                assignedMemberId: req.query.assignedMemberId as string,
                dateFrom: req.query.dateFrom as string,
                dateTo: req.query.dateTo as string,
                overdue: req.query.overdue === 'true',
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 20,
            };

            const result = await this.followUpService.getAssignments(churchId, filters);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    getAssignment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { assignmentId } = req.params;

            const assignment = await this.followUpService.getAssignmentById(churchId, assignmentId);
            res.json(assignment);
        } catch (error) {
            next(error);
        }
    };

    getAssignmentByFirstTimer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { firstTimerId } = req.params;

            const assignment = await this.followUpService.getAssignmentByFirstTimer(churchId, firstTimerId);

            if (!assignment) {
                return res.status(404).json({ message: 'No active assignment found' });
            }

            res.json(assignment);
        } catch (error) {
            next(error);
        }
    };

    createAssignment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const userId = req.user!.id;

            const assignment = await this.followUpService.createAssignment(churchId, userId, req.body);
            res.status(201).json(assignment);
        } catch (error) {
            next(error);
        }
    };

    bulkCreateAssignments = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const userId = req.user!.id;

            const result = await this.followUpService.bulkCreateAssignments(churchId, userId, req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    };

    updateAssignment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { assignmentId } = req.params;

            const assignment = await this.followUpService.updateAssignment(churchId, assignmentId, req.body);
            res.json(assignment);
        } catch (error) {
            next(error);
        }
    };

    completeAssignment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const userId = req.user!.id;
            const { assignmentId } = req.params;

            const assignment = await this.followUpService.completeAssignment(
                churchId,
                userId,
                assignmentId,
                req.body.notes
            );
            res.json(assignment);
        } catch (error) {
            next(error);
        }
    };

    reassignMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { assignmentId } = req.params;

            const assignment = await this.followUpService.reassignMember(churchId, assignmentId, req.body);
            res.json(assignment);
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // ACTIVITIES
    // ============================================================================

    getActivities = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { assignmentId } = req.params;

            const filters = {
                channel: req.query.channel as any,
                activityType: req.query.activityType as any,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 20,
            };

            const result = await this.followUpService.getActivities(churchId, assignmentId, filters);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    sendMessage = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const userId = req.user!.id;

            const result = await this.followUpService.sendMessage(churchId, userId, req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    };

    recordActivity = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const userId = req.user!.id;

            const activity = await this.followUpService.recordActivity(churchId, userId, req.body);
            res.status(201).json(activity);
        } catch (error) {
            next(error);
        }
    };

    recordResponse = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { activityId } = req.params;

            const activity = await this.followUpService.recordResponse(
                churchId,
                activityId,
                req.body.response
            );
            res.json(activity);
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // TEMPLATES
    // ============================================================================

    getTemplates = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { channel } = req.query;

            const templates = await this.followUpService.getTemplates(churchId, channel as string);
            res.json(templates);
        } catch (error) {
            next(error);
        }
    };

    createTemplate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const userId = req.user!.id;

            const template = await this.followUpService.createTemplate(churchId, userId, req.body);
            res.status(201).json(template);
        } catch (error) {
            next(error);
        }
    };

    updateTemplate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { templateId } = req.params;

            const template = await this.followUpService.updateTemplate(churchId, templateId, req.body);
            res.json(template);
        } catch (error) {
            next(error);
        }
    };

    deleteTemplate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { templateId } = req.params;

            await this.followUpService.deleteTemplate(churchId, templateId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // STATISTICS
    // ============================================================================

    getStatistics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;

            const statistics = await this.followUpService.getStatistics(churchId);
            res.json(statistics);
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // MY ASSIGNMENTS
    // ============================================================================

    getMyAssignments = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const userId = req.user!.id;

            const filters = {
                search: req.query.search as string,
                status: req.query.status as any,
                priority: req.query.priority as any,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 20,
            };

            const result = await this.followUpService.getMyAssignments(churchId, userId, filters);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // UNASSIGNED FIRST TIMERS
    // ============================================================================

    getUnassignedFirstTimers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;

            const firstTimers = await this.followUpService.getUnassignedFirstTimers(churchId);
            res.json(firstTimers);
        } catch (error) {
            next(error);
        }
    };
}