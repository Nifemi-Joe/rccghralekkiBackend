import { CreateChurchDTO, UpdateChurchDTO } from '@/dtos/church.types';
export interface Church {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logo_url: string | null;
    timezone: string;
    currency: string;
    subscription_plan: string;
    subscription_status: string;
    setup_status: 'pending_admin' | 'active';
    admin_setup_skipped: boolean;
    trial_ends_at: Date;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}
export interface ChurchQueryOptions {
    limit?: number;
    offset?: number;
    status?: 'pending_admin' | 'active';
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}
export interface PaginatedChurches {
    churches: Church[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare class ChurchRepository {
    /**
     * Generate unique slug from church name
     */
    private generateSlug;
    /**
     * Convert camelCase to snake_case
     */
    private camelToSnake;
    /**
     * Create a new church
     */
    create(data: CreateChurchDTO, setupStatus?: 'pending_admin' | 'active'): Promise<Church>;
    /**
     * Find church by ID
     */
    findById(id: string): Promise<Church | null>;
    /**
     * Find church by slug
     */
    findBySlug(slug: string): Promise<Church | null>;
    /**
     * Find church by name (case-insensitive)
     */
    findByName(name: string): Promise<Church | null>;
    /**
     * Find church by email (case-insensitive)
     */
    findByEmail(email: string): Promise<Church | null>;
    /**
     * Find all churches with pagination and filters
     */
    findAll(options?: ChurchQueryOptions): Promise<PaginatedChurches>;
    /**
     * Check if church name exists
     */
    nameExists(name: string, excludeId?: string): Promise<boolean>;
    /**
     * Check if church email exists
     */
    emailExists(email: string, excludeId?: string): Promise<boolean>;
    /**
     * Count total churches
     */
    count(status?: 'pending_admin' | 'active'): Promise<number>;
    /**
     * Update church
     */
    update(id: string, data: UpdateChurchDTO): Promise<Church | null>;
    /**
     * Update church setup status
     */
    updateSetupStatus(id: string, status: 'pending_admin' | 'active'): Promise<Church | null>;
    /**
     * Update subscription
     */
    updateSubscription(id: string, plan: string, status: string, trialEndsAt?: Date): Promise<Church | null>;
    /**
     * Soft delete church
     */
    delete(id: string): Promise<boolean>;
    /**
     * Hard delete church (permanent - use with caution)
     */
    hardDelete(id: string): Promise<boolean>;
    /**
     * Restore soft-deleted church
     */
    restore(id: string): Promise<Church | null>;
    /**
     * Get church statistics
     */
    getStats(): Promise<{
        total: number;
        active: number;
        pending: number;
        byPlan: Record<string, number>;
        byStatus: Record<string, number>;
        recentlyCreated: number;
    }>;
    /**
     * Get churches with expiring trials
     */
    findExpiringTrials(daysUntilExpiry?: number): Promise<Church[]>;
    /**
     * Get churches with expired trials
     */
    findExpiredTrials(): Promise<Church[]>;
}
//# sourceMappingURL=ChurchRepository.d.ts.map