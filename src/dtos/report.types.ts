// src/dtos/report.types.ts

export interface ReportFilters {
    startDate: string;
    endDate: string;
    granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    eventType?: string;
    eventId?: string;
    branchId?: string;
    groupId?: string;
}

export interface DashboardStats {
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
    newMembersThisMonth: number;
    newMembersThisWeek: number;
    memberGrowthRate: number;
    totalFamilies: number;
    totalFirstTimers: number;
    firstTimersThisMonth: number;
    firstTimersThisWeek: number;
    conversionRate: number;
    pendingFollowUps: number;
    totalGroups: number;
    activeGroups: number;
    totalEvents: number;
    upcomingEvents: number;
    averageAttendance: number;
    attendanceThisWeek: number;
    attendanceLastWeek: number;
    attendanceGrowth: number;
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    revenueThisMonth: number;
    expensesThisMonth: number;
}

export interface AttendanceTrendReport {
    period: string;
    totalAttendance: number;
    memberAttendance: number;
    guestAttendance: number;
    uniqueMembers: number;
    averageAttendance: number;
    eventCount: number;
    attendanceRate: number;
}

export interface MemberGrowthReport {
    period: string;
    newMembers: number;
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
    growthRate: number;
    retentionRate: number;
}

export interface FirstTimerConversionReport {
    period: string;
    totalFirstTimers: number;
    converted: number;
    conversionRate: number;
    averageDaysToConvert: number;
    pendingConversion: number;
    followUpRate: number;
}

export interface FinancialSummaryReport {
    period: string;
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    tithes: number;
    offerings: number;
    donations: number;
    pledges: number;
    otherIncome: number;
    operationalExpenses: number;
    projectExpenses: number;
    otherExpenses: number;
}

export interface EventPerformanceReport {
    eventId: string;
    eventName: string;
    eventType: string;
    instanceCount: number;
    totalAttendance: number;
    averageAttendance: number;
    uniqueAttendees: number;
    attendanceRate: number;
    guestCount: number;
    memberCount: number;
    revenue: number;
    lastHeldDate: string;
}

export interface InactiveMemberReport {
    memberId: string;
    memberName: string;
    email: string;
    phone: string;
    lastAttended: string | null;
    daysInactive: number;
    totalAttendanceCount: number;
    membershipDate: string | null;
    profilePhoto: string | null;
    status: string;
    membershipType: string;
}

export interface FamilyAttendanceReport {
    familyId: string;
    familyName: string;
    totalMembers: number;
    activeMembers: number;
    attendanceRate: number;
    lastAttendedDate: string | null;
    consecutiveAbsences: number;
}

export interface GroupActivityReport {
    groupId: string;
    groupName: string;
    groupType: string;
    memberCount: number;
    activeMemberCount: number;
    meetingCount: number;
    averageAttendance: number;
    attendanceRate: number;
    lastMeetingDate: string | null;
}

export interface ServiceReport {
    instanceId: string;
    eventName: string;
    instanceDate: string;
    totalAttendance: number;
    memberAttendance: number;
    guestAttendance: number;
    childrenCount: number;
    menCount: number;
    womenCount: number;
    firstTimersCount: number;
    newConvertsCount: number;
    salvations: number;
    baptisms: number;
    offerings: number;
    notes: string;
}

export interface FullReport {
    reportPeriod: {
        startDate: string;
        endDate: string;
        granularity: string;
    };
    dashboardStats: DashboardStats;
    attendanceTrends: AttendanceTrendReport[];
    memberGrowth: MemberGrowthReport[];
    firstTimerConversion: FirstTimerConversionReport[];
    financialSummary: FinancialSummaryReport[];
    eventPerformance: EventPerformanceReport[];
    inactiveMembers: InactiveMemberReport[];
    familyAttendance: FamilyAttendanceReport[];
    generatedAt: string;
}

export interface InactiveMemberFilters {
    daysThreshold?: number;
    includeStatusInactive?: boolean;
    includeNeverAttended?: boolean;
    limit?: number;
}