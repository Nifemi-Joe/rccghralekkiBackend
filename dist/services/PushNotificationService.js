"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushNotificationService = exports.PushNotificationService = void 0;
const web_push_1 = __importDefault(require("web-push"));
const database_1 = require("@config/database");
const logger_1 = __importDefault(require("@config/logger"));
class PushNotificationService {
    constructor() {
        // Configure web-push with VAPID keys
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidEmail = process.env.VAPID_EMAIL || 'mailto:support@churchplus.com';
        if (vapidPublicKey && vapidPrivateKey) {
            web_push_1.default.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
            logger_1.default.info('Push notification service initialized');
        }
        else {
            logger_1.default.warn('VAPID keys not configured - push notifications disabled');
        }
    }
    // Generate VAPID keys (run once and save to environment)
    static generateVapidKeys() {
        return web_push_1.default.generateVAPIDKeys();
    }
    async subscribe(churchId, memberId, subscription, locationEnabled = false) {
        const result = await database_1.pool.query(`INSERT INTO notification_subscriptions
             (church_id, member_id, push_endpoint, push_p256dh, push_auth, location_enabled)
             VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (member_id, push_endpoint) 
       DO UPDATE SET push_p256dh = $4, push_auth = $5, location_enabled = $6, updated_at = NOW()
                               RETURNING id`, [churchId, memberId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, locationEnabled]);
        logger_1.default.info(`Push subscription saved for member ${memberId}`);
        return result.rows[0].id;
    }
    async unsubscribe(memberId, endpoint) {
        let query = 'DELETE FROM notification_subscriptions WHERE member_id = $1';
        const params = [memberId];
        if (endpoint) {
            query += ' AND push_endpoint = $2';
            params.push(endpoint);
        }
        const result = await database_1.pool.query(query, params);
        logger_1.default.info(`Push subscription removed for member ${memberId}`);
        return (result.rowCount ?? 0) > 0;
    }
    async sendToMember(memberId, payload) {
        try {
            const result = await database_1.pool.query('SELECT * FROM notification_subscriptions WHERE member_id = $1', [memberId]);
            if (result.rows.length === 0) {
                return { success: false, error: 'No subscription found' };
            }
            const promises = result.rows.map((sub) => this.sendNotification(sub, payload));
            await Promise.all(promises);
            return { success: true };
        }
        catch (error) {
            logger_1.default.error(`Failed to send notification to member ${memberId}`, { error: error.message });
            return { success: false, error: error.message };
        }
    }
    async sendToChurch(churchId, payload) {
        const result = await database_1.pool.query('SELECT * FROM notification_subscriptions WHERE church_id = $1', [churchId]);
        let sent = 0;
        let failed = 0;
        const promises = result.rows.map(async (sub) => {
            const success = await this.sendNotification(sub, payload);
            if (success)
                sent++;
            else
                failed++;
        });
        await Promise.all(promises);
        logger_1.default.info(`Church notification sent: ${sent} success, ${failed} failed`);
        return { sent, failed };
    }
    async sendToLocationEnabled(churchId, payload) {
        const result = await database_1.pool.query('SELECT * FROM notification_subscriptions WHERE church_id = $1 AND location_enabled = true', [churchId]);
        let sent = 0;
        let failed = 0;
        const promises = result.rows.map(async (sub) => {
            const success = await this.sendNotification(sub, payload);
            if (success)
                sent++;
            else
                failed++;
        });
        await Promise.all(promises);
        return { sent, failed };
    }
    async sendNotification(subscription, payload) {
        const pushSubscription = {
            endpoint: subscription.push_endpoint,
            keys: {
                p256dh: subscription.push_p256dh,
                auth: subscription.push_auth,
            },
        };
        try {
            await web_push_1.default.sendNotification(pushSubscription, JSON.stringify(payload));
            return true;
        }
        catch (error) {
            logger_1.default.error('Push notification failed', { error: error.message, endpoint: subscription.push_endpoint });
            // Remove invalid subscriptions (410 Gone)
            if (error.statusCode === 410) {
                await database_1.pool.query('DELETE FROM notification_subscriptions WHERE id = $1', [subscription.id]);
                logger_1.default.info(`Removed expired subscription ${subscription.id}`);
            }
            return false;
        }
    }
    // Template notifications
    async sendEventReminder(churchId, eventName, eventTime, eventId) {
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
    async sendProximityAlert(churchId, message) {
        return this.sendToLocationEnabled(churchId, {
            title: 'Welcome! 🙏',
            body: message,
            icon: '/icons/church.png',
            data: { type: 'proximity_alert' },
            requireInteraction: true,
        });
    }
    async sendBirthdayNotification(memberId, memberName) {
        return this.sendToMember(memberId, {
            title: '🎂 Happy Birthday!',
            body: `Wishing you a blessed birthday, ${memberName}!`,
            icon: '/icons/birthday.png',
            data: { type: 'birthday' },
        });
    }
    async sendNewMemberAlert(churchId, memberName) {
        // This would typically go to admins only
        return this.sendToChurch(churchId, {
            title: 'New Member! 🎉',
            body: `${memberName} has joined the church`,
            icon: '/icons/member.png',
            data: { type: 'new_member' },
        });
    }
    async getPublicVapidKey() {
        return process.env.VAPID_PUBLIC_KEY || null;
    }
}
exports.PushNotificationService = PushNotificationService;
exports.pushNotificationService = new PushNotificationService();
//# sourceMappingURL=PushNotificationService.js.map