export type NotificationType = 'expense_pending_approval' | 'expense_approved' | 'expense_rejected' | 'profile_update_link' | 'profile_completed' | 'member_welcome' | 'member_birthday' | 'member_anniversary' | 'event_reminder' | 'event_registration' | 'attendance_reminder' | 'password_reset' | 'account_verification' | 'general';
export interface NotificationData {
    churchId: string;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
}
export interface EmailOptions {
    to: string;
    subject: string;
    template?: string;
    text?: string;
    html?: string;
    data?: Record<string, any>;
}
export interface SMSOptions {
    to: string;
    message: string;
}
export interface WhatsAppOptions {
    to: string;
    message: string;
    templateName?: string;
    templateData?: Record<string, any>;
}
interface SendNotificationOptions {
    userId?: string;
    email?: string;
    phone?: string;
    channels: ('email' | 'sms' | 'whatsapp' | 'in_app')[];
    data: NotificationData;
    templateData?: Record<string, any>;
}
interface NotificationResult {
    sent: string[];
    failed: string[];
    errors: Record<string, string>;
}
export declare class NotificationService {
    private emailTransporter;
    private twilioClient;
    private isEmailConfigured;
    private isSMSConfigured;
    constructor();
    private initializeEmailTransporter;
    private initializeTwilioClient;
    /**
     * Send notification via multiple channels
     */
    sendNotification(options: SendNotificationOptions): Promise<NotificationResult>;
    /**
     * Send notification to all admins of a church
     */
    notifyChurchAdmins(data: NotificationData): Promise<void>;
    /**
     * Notify the expense submitter
     */
    notifyExpenseSubmitter(userId: string, churchId: string, data: Omit<NotificationData, 'churchId'>): Promise<void>;
    /**
     * Send profile update link notification
     */
    sendProfileUpdateLink(options: {
        email?: string;
        phone?: string;
        firstName: string;
        lastName: string;
        link: string;
        expiresAt: Date;
        churchName?: string;
        channels: string[];
    }): Promise<NotificationResult>;
    /**
     * Send birthday/anniversary wishes
     */
    sendCelebrationWishes(options: {
        email?: string;
        phone?: string;
        firstName: string;
        lastName: string;
        type: 'birthday' | 'anniversary';
        churchName?: string;
        channels: string[];
    }): Promise<NotificationResult>;
    /**
     * Send event reminder notification
     */
    sendEventReminder(options: {
        email?: string;
        phone?: string;
        firstName: string;
        eventName: string;
        eventDate: Date;
        eventLocation?: string;
        churchName?: string;
        channels: string[];
    }): Promise<NotificationResult>;
    /**
     * Send email notification
     */
    sendEmail(options: EmailOptions): Promise<void>;
    /**
     * Send SMS notification via Twilio
     */
    sendSMS(options: SMSOptions): Promise<void>;
    /**
     * Send WhatsApp message
     */
    sendWhatsApp(options: WhatsAppOptions): Promise<void>;
    /**
     * Generate WhatsApp click-to-chat link
     */
    generateWhatsAppLink(phone: string, message: string): string;
    /**
     * Create in-app notification
     */
    createInAppNotification(userId: string, data: NotificationData): Promise<void>;
    /**
     * Get user notifications
     */
    getUserNotifications(userId: string, options?: {
        unreadOnly?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        notifications: any[];
        unreadCount: number;
    }>;
    /**
     * Mark notification as read
     */
    markAsRead(notificationId: string, userId: string): Promise<void>;
    /**
     * Mark all notifications as read
     */
    markAllAsRead(userId: string): Promise<void>;
    private sendEmailNotification;
    private getSubjectForType;
    private formatSMSMessage;
    private formatPhoneNumber;
    private stripHtml;
    private renderEmailTemplate;
    private getBaseTemplate;
    private profileUpdateLinkTemplate;
    private memberWelcomeTemplate;
    private birthdayTemplate;
    private anniversaryTemplate;
    private eventReminderTemplate;
    private eventRegistrationTemplate;
    private expenseTemplate;
    private passwordResetTemplate;
    private accountVerificationTemplate;
    private generalTemplate;
    private formatMetadata;
    private getFullUrl;
    /**
     * Verify email configuration
     */
    verifyEmailConfiguration(): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Get notification service status
     */
    getServiceStatus(): {
        email: {
            configured: boolean;
        };
        sms: {
            configured: boolean;
        };
        whatsapp: {
            configured: boolean;
        };
    };
}
export declare const notificationService: NotificationService;
export {};
//# sourceMappingURL=NotificationService.d.ts.map