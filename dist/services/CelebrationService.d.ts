import { Celebration, CelebrationFilters, PaginatedCelebrations } from '@/dtos/celebration.types';
export declare class CelebrationService {
    private celebrationRepository;
    constructor();
    getCelebrations(churchId: string, filters?: CelebrationFilters): Promise<PaginatedCelebrations>;
    getTodayCelebrations(churchId: string): Promise<Celebration[]>;
}
//# sourceMappingURL=CelebrationService.d.ts.map