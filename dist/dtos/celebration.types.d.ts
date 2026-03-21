export type CelebrationType = 'birthday' | 'anniversary';
export interface Celebration {
    id: string;
    memberId: string;
    memberName: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    profileImageUrl?: string;
    date: string;
    dayLabel: string;
    type: CelebrationType;
    age?: number;
    yearsMarried?: number;
    daysUntil: number;
}
export interface CelebrationFilters {
    type?: CelebrationType;
    startDate?: string;
    endDate?: string;
    daysAhead?: number;
    page?: number;
    limit?: number;
}
export interface PaginatedCelebrations {
    celebrations: Celebration[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    summary: {
        todayBirthdays: number;
        todayAnniversaries: number;
        thisWeekBirthdays: number;
        thisWeekAnniversaries: number;
        thisMonthBirthdays: number;
        thisMonthAnniversaries: number;
    };
}
//# sourceMappingURL=celebration.types.d.ts.map