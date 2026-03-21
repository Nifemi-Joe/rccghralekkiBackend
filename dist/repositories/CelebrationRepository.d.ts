import { Celebration, CelebrationFilters, PaginatedCelebrations } from '@/dtos/celebration.types';
export declare class CelebrationRepository {
    getCelebrations(churchId: string, filters?: CelebrationFilters): Promise<PaginatedCelebrations>;
    getTodayCelebrations(churchId: string): Promise<Celebration[]>;
}
//# sourceMappingURL=CelebrationRepository.d.ts.map