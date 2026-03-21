import { FirstTimer, CreateFirstTimerDTO, UpdateFirstTimerDTO, FirstTimerFilters, PaginatedFirstTimers, FirstTimerStatistics } from '@/dtos/firstTimer.types';
export declare class FirstTimerRepository {
    create(data: CreateFirstTimerDTO): Promise<FirstTimer>;
    findById(id: string, churchId: string): Promise<FirstTimer | null>;
    findByEmail(email: string, churchId: string): Promise<FirstTimer | null>;
    findByPhone(phone: string, churchId: string): Promise<FirstTimer | null>;
    findAll(filters: FirstTimerFilters): Promise<PaginatedFirstTimers>;
    update(id: string, churchId: string, data: UpdateFirstTimerDTO): Promise<FirstTimer | null>;
    delete(id: string, churchId: string): Promise<boolean>;
    recordVisit(id: string, churchId: string, visitDate?: Date): Promise<FirstTimer | null>;
    recordContactAttempt(id: string, churchId: string, notes?: string): Promise<FirstTimer | null>;
    markAsConverted(id: string, churchId: string, memberId: string): Promise<FirstTimer | null>;
    getConversionEligible(churchId: string): Promise<FirstTimer[]>;
    getPendingFollowUps(churchId: string): Promise<FirstTimer[]>;
    getStatistics(churchId: string): Promise<FirstTimerStatistics>;
    getConversionPeriod(churchId: string): Promise<number>;
    setConversionPeriod(churchId: string, days: number): Promise<void>;
    private mapToFirstTimer;
}
//# sourceMappingURL=FirstTimerRepository.d.ts.map