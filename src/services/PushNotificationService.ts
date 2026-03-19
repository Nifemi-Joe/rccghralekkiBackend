import webpush from 'web-push';
import {pool} from '@config/database';
import logger from '@config/logger';

interface PushSubscription {
    id: string;
    church_id: string;
    member_id: string;
    push_endpoint: string;
    push_p256dh: string;
    push_auth: string;
    location_enabled: boolean;
}

interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    image?: string;
    data?: Record<string, any>;
    actions?: Array<{ action: string; title: string; icon?: string }>;
    tag?: string;
    requireInteraction?: boolean;
}

export class PushNotificationService {
    constructor() {
        // Configure web-push with VAPID keys
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidEmail = process.env.VAPID_EMAIL || 'mailto:support@churchplus.com';

        if (vapidPublicKey && vapidPrivateKey) {
            webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
            logger.info('Push notification service initialized');
        } else {
            logger.warn('VAPID keys not configured - push notifications disabled');
        }
    }

    // Generate VAPID keys (run once and save to environment)
    static generateVapidKeys(): { publicKey: string; privateKey: string } {
        return webpush.generateVAPIDKeys();
    }

    async subscribe(
        churchId: string,
        memberId: string,
        subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
        locationEnabled: boolean = false
    ): Promise<string> {
        const result = await pool.query(
            `INSERT INTO notification_subscriptions
             (church_id, member_id, push_endpoint, push_p256dh, push_auth, location_enabled)
             VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (member_id, push_endpoint) 
       DO UPDATE SET push_p256dh = $4, push_auth = $5, location_enabled = $6, updated_at = NOW()
                               RETURNING id`,
            [churchId, memberId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, locationEnabled]
        );

        logger.info(`Push subscription saved for member ${memberId}`);
        return result.rows[0].id;
    }

    async unsubscribe(memberId: string, endpoint?: string): Promise<boolean> {
        let query = 'DELETE FROM notification_subscriptions WHERE member_id = $1';
        const params: any[] = [memberId];

        if (endpoint) {
            query += ' AND push_endpoint = $2';
            params.push(endpoint);
        }

        const result = await pool.query(query, params);
        logger.info(`Push subscription removed for member ${memberId}`);
        return (result.rowCount ?? 0) > 0;
    }

    async sendToMember(memberId: string, payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
        try {
            const result = await pool.query(
                'SELECT * FROM notification_subscriptions WHERE member_id = $1',
                [memberId]
            );

            if (result.rows.length === 0) {
                return { success: false, error: 'No subscription found' };
            }

            const promises = result.rows.map((sub: PushSubscription) =>
                this.sendNotification(sub, payload)
            );

            await Promise.all(promises);
            return { success: true };
        } catch (error: any) {
            logger.error(`Failed to send notification to member ${memberId}`, { error: error.message });
            return { success: false, error: error.message };
        }
    }

    async sendToChurch(churchId: string, payload: NotificationPayload): Promise<{ sent: number; failed: number }> {
        const result = await pool.query(
            'SELECT * FROM notification_subscriptions WHERE church_id = $1',
            [churchId]
        );

        let sent = 0;
        let failed = 0;

        const promises = result.rows.map(async (sub: PushSubscription) => {
            const success = await this.sendNotification(sub, payload);
            if (success) sent++;
            else failed++;
        });

        await Promise.all(promises);
        logger.info(`Church notification sent: ${sent} success, ${failed} failed`);
        return { sent, failed };
    }

    async sendToLocationEnabled(churchId: string, payload: NotificationPayload): Promise<{ sent: number; failed: number }> {
        const result = await pool.query(
            'SELECT * FROM notification_subscriptions WHERE church_id = $1 AND location_enabled = true',
            [churchId]
        );

        let sent = 0;
        let failed = 0;

        const promises = result.rows.map(async (sub: PushSubscription) => {
            const success = await this.sendNotification(sub, payload);
            if (success) sent++;
            else failed++;
        });

        await Promise.all(promises);
        return { sent, failed };
    }

    private async sendNotification(subscription: PushSubscription, payload: NotificationPayload): Promise<boolean> {
        const pushSubscription = {
            endpoint: subscription.push_endpoint,
            keys: {
                p256dh: subscription.push_p256dh,
                auth: subscription.push_auth,
            },
        };

        try {
            await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
            return true;
        } catch (error: any) {
            logger.error('Push notification failed', { error: error.message, endpoint: subscription.push_endpoint });

            // Remove invalid subscriptions (410 Gone)
            if (error.statusCode === 410) {
                await pool.query('DELETE FROM notification_subscriptions WHERE id = $1', [subscription.id]);
                logger.info(`Removed expired subscription ${subscription.id}`);
            }

            return false;
        }
    }

    // Template notifications
    async sendEventReminder(
        churchId: string,
        eventName: string,
        eventTime: string,
        eventId: string
    ): Promise<{ sent: number; failed: number }> {
        return this.sendToChurch(churchId, {
            title: 'Event Reminder 📅',
            body: `${eventName} starts ${eventTime}`,
            icon: '/icons/calendar.png',
            data: { type: 'event_reminder', eventId },
            actions: [
                { action: 'view', title: 'View Event' },
                { action: 'dismiss', title: 'Dismiss' },
            ],
            tag: `event-${eventId}`,
        });
    }

    async sendProximityAlert(
        churchId: string,
        message: string
    ): Promise<{ sent: number; failed: number }> {
        return this.sendToLocationEnabled(churchId, {
            title: 'Welcome! 🙏',
            body: message,
            icon: '/icons/church.png',
            data: { type: 'proximity_alert' },
            requireInteraction: true,
        });
    }

    async sendBirthdayNotification(
        memberId: string,
        memberName: string
    ): Promise<{ success: boolean; error?: string }> {
        return this.sendToMember(memberId, {
            title: '🎂 Happy Birthday!',
            body: `Wishing you a blessed birthday, ${memberName}!`,
            icon: '/icons/birthday.png',
            data: { type: 'birthday' },
        });
    }

    async sendNewMemberAlert(
        churchId: string,
        memberName: string
    ): Promise<{ sent: number; failed: number }> {
        // This would typically go to admins only
        return this.sendToChurch(churchId, {
            title: 'New Member! 🎉',
            body: `${memberName} has joined the church`,
            icon: '/icons/member.png',
            data: { type: 'new_member' },
        });
    }

    async getPublicVapidKey(): Promise<string | null> {
        return process.env.VAPID_PUBLIC_KEY || null;
    }
}

export const pushNotificationService = new PushNotificationService();