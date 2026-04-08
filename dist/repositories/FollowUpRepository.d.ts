import { FollowUpDepartment, FollowUpMember, FollowUpAssignment, FollowUpActivity, MessageTemplate, FollowUpStatistics, FollowUpFilters, ActivityFilters, PaginatedAssignments, PaginatedActivities, CreateFollowUpMemberDTO, CreateAssignmentDTO, UpdateAssignmentDTO, RecordActivityDTO, CreateTemplateDTO, UpdateTemplateDTO, UpdateDepartmentSettingsDTO, FollowUpChannel } from '@/dtos/followup.types';
export declare class FollowUpRepository {
    getOrCreateDepartment(churchId: string): Promise<FollowUpDepartment>;
    updateDepartmentSettings(churchId: string, settings: UpdateDepartmentSettingsDTO): Promise<FollowUpDepartment>;
    getMembers(churchId: string, filters?: {
        search?: string;
        status?: string;
    }): Promise<FollowUpMember[]>;
    getMemberById(churchId: string, followUpMemberId: string): Promise<FollowUpMember | null>;
    addMember(churchId: string, data: CreateFollowUpMemberDTO, userId?: string): Promise<FollowUpMember>;
    updateMember(churchId: string, followUpMemberId: string, data: {
        role?: string;
        status?: string;
    }): Promise<FollowUpMember | null>;
    removeMember(churchId: string, followUpMemberId: string): Promise<boolean>;
    getAssignments(churchId: string, filters: FollowUpFilters): Promise<PaginatedAssignments>;
    getAssignmentById(churchId: string, assignmentId: string): Promise<FollowUpAssignment | null>;
    getAssignmentByFirstTimer(churchId: string, firstTimerId: string): Promise<FollowUpAssignment | null>;
    createAssignment(churchId: string, data: CreateAssignmentDTO, userId: string): Promise<FollowUpAssignment>;
    updateAssignment(churchId: string, assignmentId: string, data: UpdateAssignmentDTO): Promise<FollowUpAssignment | null>;
    completeAssignment(churchId: string, assignmentId: string, notes?: string): Promise<FollowUpAssignment | null>;
    private getAssignedMembers;
    getActivities(churchId: string, assignmentId: string, filters: ActivityFilters): Promise<PaginatedActivities>;
    createActivity(churchId: string, userId: string, data: RecordActivityDTO): Promise<FollowUpActivity>;
    createMessageActivity(churchId: string, userId: string, data: {
        assignmentId: string;
        firstTimerId: string;
        channel: FollowUpChannel;
        subject?: string;
        content: string;
        status: string;
        externalMessageId?: string;
        deliveryStatus?: string;
        scheduledAt?: string;
    }): Promise<FollowUpActivity>;
    updateActivityDeliveryStatus(activityId: string, deliveryStatus: string, externalMessageId?: string): Promise<void>;
    recordResponse(churchId: string, activityId: string, response: string): Promise<FollowUpActivity | null>;
    getTemplates(churchId: string, channel?: string): Promise<MessageTemplate[]>;
    createTemplate(churchId: string, userId: string, data: CreateTemplateDTO): Promise<MessageTemplate>;
    updateTemplate(churchId: string, templateId: string, data: UpdateTemplateDTO): Promise<MessageTemplate | null>;
    deleteTemplate(churchId: string, templateId: string): Promise<boolean>;
    getStatistics(churchId: string): Promise<FollowUpStatistics>;
    getUnassignedFirstTimers(churchId: string): Promise<any[]>;
    private mapDepartment;
    private mapMemberWithStats;
    private mapAssignment;
    private mapActivity;
    private mapTemplate;
}
//# sourceMappingURL=FollowUpRepository.d.ts.map