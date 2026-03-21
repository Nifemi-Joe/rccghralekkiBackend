interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    image?: string;
    data?: Record<string, any>;
    actions?: Array<{
        action: string;
        title: string;
        icon?: string;
    }>;
    tag?: string;
    requireInteraction?: boolean;
}
export declare class PushNotificationService {
    constructor();
    static generateVapidKeys(): {
        publicKey: string;
        privateKey: string;
    };
    subscribe(churchId: string, memberId: string, subscription: {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
    }, locationEnabled?: boolean): Promise<string>;
    unsubscribe(memberId: string, endpoint?: string): Promise<boolean>;
    sendToMember(memberId: string, payload: NotificationPayload): Promise<{
        success: boolean;
        error?: string;
    }>;
    sendToChurch(churchId: string, payload: NotificationPayload): Promise<{
        sent: number;
        failed: number;
    }>;
    sendToLocationEnabled(churchId: string, payload: NotificationPayload): Promise<{
        sent: number;
        failed: number;
    }>;
    private sendNotification;
    sendEventReminder(churchId: string, eventName: string, eventTime: string, eventId: string): Promise<{
        sent: number;
        failed: number;
    }>;
    sendProximityAlert(churchId: string, message: string): Promise<{
        sent: number;
        failed: number;
    }>;
    sendBirthdayNotification(memberId: string, memberName: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    sendNewMemberAlert(churchId: string, memberName: string): Promise<{
        sent: number;
        failed: number;
    }>;
    getPublicVapidKey(): Promise<string | null>;
}
export declare const pushNotificationService: PushNotificationService;
export {};
//# sourceMappingURL=PushNotificationService.d.ts.map