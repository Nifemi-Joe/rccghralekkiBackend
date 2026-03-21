"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkCheckinSchema = exports.manualCheckinSchema = exports.qrCheckinSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.qrCheckinSchema = joi_1.default.object({
    member_id: joi_1.default.string().uuid().optional()
        .messages({
        'string.uuid': 'Invalid member ID'
    }),
    guest_name: joi_1.default.string().min(2).max(100).optional()
        .messages({
        'string.min': 'Name must be at least 2 characters'
    }),
    guest_email: joi_1.default.string().email().optional()
        .messages({
        'string.email': 'Invalid email address'
    }),
    guest_phone: joi_1.default.string().max(20).optional(),
    checkin_type: joi_1.default.string()
        .valid('qr_scan', 'self_checkin', 'guest_signup')
        .optional()
        .default('qr_scan'),
    notes: joi_1.default.string().max(255).optional()
}).or('member_id', 'guest_name')
    .messages({
    'object.missing': 'Either member ID or guest name is required'
});
exports.manualCheckinSchema = joi_1.default.object({
    event_instance_id: joi_1.default.string().uuid().required()
        .messages({
        'string.uuid': 'Invalid event instance ID',
        'any.required': 'Event instance ID is required'
    }),
    member_id: joi_1.default.string().uuid().optional(),
    guest_name: joi_1.default.string().min(2).max(100).optional(),
    guest_email: joi_1.default.string().email().optional(),
    guest_phone: joi_1.default.string().max(20).optional(),
    checkin_type: joi_1.default.string()
        .valid('manual', 'qr_scan')
        .optional()
        .default('manual'),
    notes: joi_1.default.string().max(255).optional()
}).or('member_id', 'guest_name')
    .messages({
    'object.missing': 'Either member ID or guest name is required'
});
exports.bulkCheckinSchema = joi_1.default.object({
    event_instance_id: joi_1.default.string().uuid().required()
        .messages({
        'string.uuid': 'Invalid event instance ID',
        'any.required': 'Event instance ID is required'
    }),
    member_ids: joi_1.default.array()
        .items(joi_1.default.string().uuid())
        .min(1)
        .max(100)
        .required()
        .messages({
        'array.min': 'At least one member is required',
        'array.max': 'Maximum 100 members per bulk check-in'
    })
});
//# sourceMappingURL=attendance.validator.js.map