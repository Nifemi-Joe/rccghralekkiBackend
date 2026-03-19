import Joi from 'joi';

// New simplified church registration (just church name, email, password)
export const registerChurchOnlySchema = Joi.object({
  churchName: Joi.string().min(2).max(100).required()
    .messages({
      'string.empty': 'Church name is required',
      'string.min': 'Church name must be at least 2 characters'
    }),
  email: Joi.string().email().required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address'
    }),
  password: Joi.string().min(8).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, and number'
    })
});

// Verify OTP schema
export const verifyOTPSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required()
    .messages({
      'string.length': 'OTP must be 6 digits'
    })
});

// Setup admin after church registration
export const setupAdminSchema = Joi.object({
  churchId: Joi.string().uuid().required(),
  firstName: Joi.string().min(2).max(50).required()
    .messages({
      'string.empty': 'First name is required'
    }),
  lastName: Joi.string().min(2).max(50).required()
    .messages({
      'string.empty': 'Last name is required'
    }),
    phoneNumber: Joi.string().min(10).max(20).required(),
    country: Joi.string().min(2).max(100).required(),
    membershipSize: Joi.string().required()
});

// Legacy - Register church with admin (combined)
export const registerChurchSchema = Joi.object({
  church: Joi.object({
    name: Joi.string().min(2).max(100).required()
      .messages({
        'string.empty': 'Church name is required',
        'string.min': 'Church name must be at least 2 characters'
      }),
    address: Joi.string().max(255).optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(100).optional(),
    country: Joi.string().max(100).optional(),
    phone: Joi.string().max(20).optional(),
    email: Joi.string().email().optional(),
    website: Joi.string().uri().optional(),
    timezone: Joi.string().optional().default('UTC'),
    currency: Joi.string().length(3).optional().default('USD')
  }).required(),
  
  admin: Joi.object({
    email: Joi.string().email().required()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address'
      }),
    password: Joi.string().min(8).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain uppercase, lowercase, and number'
      }),
    firstName: Joi.string().min(2).max(50).required()
      .messages({
        'string.empty': 'First name is required'
      }),
    lastName: Joi.string().min(2).max(50).required()
      .messages({
        'string.empty': 'Last name is required'
      })
  }).required()
});

export const skipSetupSchema = Joi.object({
    churchId: Joi.string().uuid().required()
});

export const createAdditionalAdminSchema = Joi.object({
    firstName: Joi.string().min(2).max(100).required(),
    lastName: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().max(255).required(),
    phoneNumber: Joi.string().min(10).max(20).required(),
    role: Joi.string().valid('admin', 'pastor').required()
});

export const updateChurchSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  address: Joi.string().max(255).optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  country: Joi.string().max(100).optional(),
  phone: Joi.string().max(20).optional(),
  email: Joi.string().email().optional(),
  website: Joi.string().uri().optional(),
  timezone: Joi.string().optional(),
  currency: Joi.string().length(3).optional(),
  logo_url: Joi.string().uri().optional(),
  settings: Joi.object().optional()
});
