// src/services/CelebrationService.ts

import { CelebrationRepository } from '@repositories/CelebrationRepository';
import {
    Celebration,
    CelebrationFilters,
    PaginatedCelebrations,
} from '@/dtos/celebration.types';
import logger from '@config/logger';

export class CelebrationService {
    private celebrationRepository: CelebrationRepository;

    constructor() {
        this.celebrationRepository = new CelebrationRepository();
    }

    async getCelebrations(churchId: string, filters: CelebrationFilters = {}): Promise<PaginatedCelebrations> {
        try {
            return await this.celebrationRepository.getCelebrations(churchId, filters);
        } catch (error) {
            logger.error('Error in CelebrationService.getCelebrations:', error);
            throw error;
        }
    }

    async getTodayCelebrations(churchId: string): Promise<Celebration[]> {
        try {
            return await this.celebrationRepository.getTodayCelebrations(churchId);
        } catch (error) {
            logger.error('Error in CelebrationService.getTodayCelebrations:', error);
            throw error;
        }
    }
}