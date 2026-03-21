import { FirstTimer, CreateFirstTimerDTO, UpdateFirstTimerDTO, FirstTimerFilters, PaginatedFirstTimers, FirstTimerStatistics, ConvertToMemberDTO } from '@/dtos/firstTimer.types';
import { Member } from '@/dtos/member.types';
export declare class FirstTimerService {
    private firstTimerRepository;
    private memberRepository;
    constructor();
    createFirstTimer(data: CreateFirstTimerDTO): Promise<FirstTimer>;
    getAllFirstTimers(filters: FirstTimerFilters): Promise<PaginatedFirstTimers>;
    getFirstTimerById(id: string, churchId: string): Promise<FirstTimer>;
    updateFirstTimer(id: string, churchId: string, data: UpdateFirstTimerDTO): Promise<FirstTimer>;
    deleteFirstTimer(id: string, churchId: string): Promise<void>;
    recordVisit(id: string, churchId: string, visitDate?: Date): Promise<FirstTimer>;
    recordContactAttempt(id: string, churchId: string, notes?: string): Promise<FirstTimer>;
    convertToMember(id: string, churchId: string, data: ConvertToMemberDTO, userId?: string): Promise<{
        member: Member;
        firstTimer: FirstTimer;
    }>;
    getStatistics(churchId: string): Promise<FirstTimerStatistics>;
    getConversionEligible(churchId: string): Promise<FirstTimer[]>;
    getPendingFollowUps(churchId: string): Promise<FirstTimer[]>;
    getConversionSettings(churchId: string): Promise<{
        conversionPeriodDays: number;
    }>;
    updateConversionSettings(churchId: string, days: number): Promise<{
        conversionPeriodDays: number;
    }>;
}
//# sourceMappingURL=FirstTimerService.d.ts.map