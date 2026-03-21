export interface ChurchAddress {
    street?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
}
export interface ChurchSettings {
    notificationRadius?: number;
    proximityNotificationsEnabled?: boolean;
    welcomeMessage?: string;
    [key: string]: any;
}
export interface Church {
    id: string;
    name: string;
    slug: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    email?: string;
    website?: string;
    logo_url?: string;
    timezone: string;
    currency: string;
    settings?: ChurchSettings;
    subscription_plan: 'free' | 'basic' | 'professional' | 'enterprise';
    subscription_status: 'active' | 'past_due' | 'canceled' | 'trialing';
    setup_status: 'pending_admin' | 'active';
    admin_setup_skipped?: boolean;
    trial_ends_at?: Date;
    created_at: Date;
    updated_at: Date;
}
export interface CreateChurchDTO {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    email?: string;
    website?: string;
    timezone?: string;
    currency?: string;
    adminSetupSkipped?: boolean;
}
export interface UpdateChurchDTO {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    email?: string;
    website?: string;
    timezone?: string;
    currency?: string;
    logo_url?: string;
    settings?: ChurchSettings;
    adminSetupSkipped?: boolean;
}
//# sourceMappingURL=church.types.d.ts.map