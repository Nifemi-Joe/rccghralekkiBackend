import Joi from 'joi';

export const qrCheckinSchema = Joi.object({
  member_id: Joi.string().uuid().optional()
    .messages({
      'string.uuid': 'Invalid member ID'
    }),
  
  guest_name: Joi.string().min(2).max(100).optional()
    .messages({
      'string.min': 'Name must be at least 2 characters'
    }),
  
  guest_email: Joi.string().email().optional()
    .messages({
      'string.email': 'Invalid email address'
    }),
  
  guest_phone: Joi.string().max(20).optional(),
  
  checkin_type: Joi.string()
    .valid('qr_scan', 'self_checkin', 'guest_signup')
    .optional()
    .default('qr_scan'),
  
  notes: Joi.string().max(255).optional()
}).or('member_id', 'guest_name')
  .messages({
    'object.missing': 'Either member ID or guest name is required'
  });

export const manualCheckinSchema = Joi.object({
  event_instance_id: Joi.string().uuid().required()
    .messages({
      'string.uuid': 'Invalid event instance ID',
      'any.required': 'Event instance ID is required'
    }),
  
  member_id: Joi.string().uuid().optional(),
  
  guest_name: Joi.string().min(2).max(100).optional(),
  
  guest_email: Joi.string().email().optional(),
  
  guest_phone: Joi.string().max(20).optional(),
  
  checkin_type: Joi.string()
    .valid('manual', 'qr_scan')
    .optional()
    .default('manual'),
  
  notes: Joi.string().max(255).optional()
}).or('member_id', 'guest_name')
  .messages({
    'object.missing': 'Either member ID or guest name is required'
  });

export const bulkCheckinSchema = Joi.object({
  event_instance_id: Joi.string().uuid().required()
    .messages({
      'string.uuid': 'Invalid event instance ID',
      'any.required': 'Event instance ID is required'
    }),
  
  member_ids: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one member is required',
      'array.max': 'Maximum 100 members per bulk check-in'
    })
});
