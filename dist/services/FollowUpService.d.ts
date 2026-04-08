import { FollowUpDepartment, FollowUpMember, FollowUpAssignment, FollowUpActivity, MessageTemplate, FollowUpStatistics, CreateFollowUpMemberDTO, UpdateFollowUpMemberDTO, CreateAssignmentDTO, BulkCreateAssignmentsDTO, UpdateAssignmentDTO, SendMessageDTO, RecordActivityDTO, CreateTemplateDTO, UpdateTemplateDTO, UpdateDepartmentSettingsDTO, FollowUpFilters, ActivityFilters, PaginatedAssignments, PaginatedActivities, SendMessageResult, BulkAssignmentResult } from '@/dtos/followup.types';
export declare class FollowUpService {
    private followUpRepository;
    private smsService;
    private notificationService;
    constructor();
    getDepartment(churchId: string): Promise<FollowUpDepartment>;
    updateDepartmentSettings(churchId: string, settings: UpdateDepartmentSettingsDTO): Promise<FollowUpDepartment>;
    getMembers(churchId: string, filters?: {
        search?: string;
        status?: string;
    }): Promise<FollowUpMember[]>;
    addMember(churchId: string, userId: string, data: CreateFollowUpMemberDTO): Promise<FollowUpMember>;
    updateMember(churchId: string, followUpMemberId: string, data: UpdateFollowUpMemberDTO): Promise<FollowUpMember>;
    removeMember(churchId: string, followUpMemberId: string): Promise<void>;
    getAssignments(churchId: string, filters: FollowUpFilters): Promise<PaginatedAssignments>;
    getAssignmentById(churchId: string, assignmentId: string): Promise<FollowUpAssignment>;
    getAssignmentByFirstTimer(churchId: string, firstTimerId: string): Promise<FollowUpAssignment | null>;
    createAssignment(churchId: string, userId: string, data: CreateAssignmentDTO): Promise<FollowUpAssignment>;
    bulkCreateAssignments(churchId: string, userId: string, data: BulkCreateAssignmentsDTO): Promise<BulkAssignmentResult>;
    updateAssignment(churchId: string, assignmentId: string, data: UpdateAssignmentDTO): Promise<FollowUpAssignment>;
    completeAssignment(churchId: string, userId: string, assignmentId: string, notes?: string): Promise<FollowUpAssignment>;
    reassignMember(churchId: string, assignmentId: string, data: {
        removeMemberId?: string;
        addMemberId?: string;
        makePrimary?: boolean;
    }): Promise<FollowUpAssignment>;
    getActivities(churchId: string, assignmentId: string, filters: ActivityFilters): Promise<PaginatedActivities>;
    sendMessage(churchId: string, userId: string, data: SendMessageDTO): Promise<SendMessageResult>;
    private sendFollowUpEmail;
    recordActivity(churchId: string, userId: string, data: RecordActivityDTO): Promise<FollowUpActivity>;
    recordResponse(churchId: string, activityId: string, response: string): Promise<FollowUpActivity>;
    getTemplates(churchId: string, channel?: string): Promise<MessageTemplate[]>;
    createTemplate(churchId: string, userId: string, data: CreateTemplateDTO): Promise<MessageTemplate>;
    updateTemplate(churchId: string, templateId: string, data: UpdateTemplateDTO): Promise<MessageTemplate>;
    deleteTemplate(churchId: string, templateId: string): Promise<void>;
    getStatistics(churchId: string): Promise<FollowUpStatistics>;
    getUnassignedFirstTimers(churchId: string): Promise<any[]>;
    getMyAssignments(churchId: string, userId: string, filters: FollowUpFilters): Promise<PaginatedAssignments>;
    processDeadlineReminders(): Promise<void>;
}
//# sourceMappingURL=FollowUpService.d.ts.map