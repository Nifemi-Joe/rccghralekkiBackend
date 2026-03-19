import Joi from 'joi';

export const subscribeSchema = Joi.object({
  subscription: Joi.object({
    endpoint: Joi.string().uri().required(),
    keys: Joi.object({
      p256dh: Joi.string().required(),
      auth: Joi.string().required(),
    }).required(),
  }).required(),
  locationEnabled: Joi.boolean().default(false),
});

export const unsubscribeSchema = Joi.object({
  endpoint: Joi.string().uri().optional(),
});

export const notificationPayloadSchema = Joi.object({
  title: Joi.string().max(100).required(),
  body: Joi.string().max(500).required(),
  icon: Joi.string().uri().optional(),
  badge: Joi.string().uri().optional(),
  image: Joi.string().uri().optional(),
  data: Joi.object().optional(),
  actions: Joi.array().items(
    Joi.object({
      action: Joi.string().required(),
      title: Joi.string().required(),
      icon: Joi.string().uri().optional(),
    })
  ).max(3).optional(),
  tag: Joi.string().max(50).optional(),
  requireInteraction: Joi.boolean().optional(),
});

export const sendToMemberSchema = Joi.object({
  payload: notificationPayloadSchema.required(),
});

export const sendToChurchSchema = Joi.object({
  payload: notificationPayloadSchema.required(),
});

export const eventReminderSchema = Joi.object({
  eventName: Joi.string().max(200).required(),
  eventTime: Joi.string().required(),
  eventId: Joi.string().uuid().required(),
});

export const proximityAlertSchema = Joi.object({
  message: Joi.string().max(500).required(),
});

// Email validators
export const sendEmailSchema = Joi.object({
  to: Joi.alternatives().try(
    Joi.string().email(),
    Joi.array().items(Joi.string().email()).min(1).max(50)
  ).required(),
  subject: Joi.string().max(200).required(),
  html: Joi.string().required(),
  text: Joi.string().optional(),
  replyTo: Joi.string().email().optional(),
});

export const bulkEmailSchema = Joi.object({
  recipients: Joi.array().items(Joi.string().email()).min(1).max(1000).required(),
  subject: Joi.string().max(200).required(),
  html: Joi.string().required(),
  text: Joi.string().optional(),
  batchSize: Joi.number().min(1).max(100).default(50),
});

export const templateEmailSchema = Joi.object({
  template: Joi.string().valid('welcome', 'event_reminder', 'birthday', 'anniversary', 'first_timer').required(),
  recipientEmail: Joi.string().email().required(),
  recipientName: Joi.string().max(100).required(),
  data: Joi.object().required(),
});
