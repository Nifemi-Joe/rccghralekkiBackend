"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateEmailSchema = exports.bulkEmailSchema = exports.sendEmailSchema = exports.proximityAlertSchema = exports.eventReminderSchema = exports.sendToChurchSchema = exports.sendToMemberSchema = exports.notificationPayloadSchema = exports.unsubscribeSchema = exports.subscribeSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.subscribeSchema = joi_1.default.object({
    subscription: joi_1.default.object({
        endpoint: joi_1.default.string().uri().required(),
        keys: joi_1.default.object({
            p256dh: joi_1.default.string().required(),
            auth: joi_1.default.string().required(),
        }).required(),
    }).required(),
    locationEnabled: joi_1.default.boolean().default(false),
});
exports.unsubscribeSchema = joi_1.default.object({
    endpoint: joi_1.default.string().uri().optional(),
});
exports.notificationPayloadSchema = joi_1.default.object({
    title: joi_1.default.string().max(100).required(),
    body: joi_1.default.string().max(500).required(),
    icon: joi_1.default.string().uri().optional(),
    badge: joi_1.default.string().uri().optional(),
    image: joi_1.default.string().uri().optional(),
    data: joi_1.default.object().optional(),
    actions: joi_1.default.array().items(joi_1.default.object({
        action: joi_1.default.string().required(),
        title: joi_1.default.string().required(),
        icon: joi_1.default.string().uri().optional(),
    })).max(3).optional(),
    tag: joi_1.default.string().max(50).optional(),
    requireInteraction: joi_1.default.boolean().optional(),
});
exports.sendToMemberSchema = joi_1.default.object({
    payload: exports.notificationPayloadSchema.required(),
});
exports.sendToChurchSchema = joi_1.default.object({
    payload: exports.notificationPayloadSchema.required(),
});
exports.eventReminderSchema = joi_1.default.object({
    eventName: joi_1.default.string().max(200).required(),
    eventTime: joi_1.default.string().required(),
    eventId: joi_1.default.string().uuid().required(),
});
exports.proximityAlertSchema = joi_1.default.object({
    message: joi_1.default.string().max(500).required(),
});
// Email validators
exports.sendEmailSchema = joi_1.default.object({
    to: joi_1.default.alternatives().try(joi_1.default.string().email(), joi_1.default.array().items(joi_1.default.string().email()).min(1).max(50)).required(),
    subject: joi_1.default.string().max(200).required(),
    html: joi_1.default.string().required(),
    text: joi_1.default.string().optional(),
    replyTo: joi_1.default.string().email().optional(),
});
exports.bulkEmailSchema = joi_1.default.object({
    recipients: joi_1.default.array().items(joi_1.default.string().email()).min(1).max(1000).required(),
    subject: joi_1.default.string().max(200).required(),
    html: joi_1.default.string().required(),
    text: joi_1.default.string().optional(),
    batchSize: joi_1.default.number().min(1).max(100).default(50),
});
exports.templateEmailSchema = joi_1.default.object({
    template: joi_1.default.string().valid('welcome', 'event_reminder', 'birthday', 'anniversary', 'first_timer').required(),
    recipientEmail: joi_1.default.string().email().required(),
    recipientName: joi_1.default.string().max(100).required(),
    data: joi_1.default.object().required(),
});
//# sourceMappingURL=notification.validator.js.map