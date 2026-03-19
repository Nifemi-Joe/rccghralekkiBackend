import Joi from 'joi';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export const registerSchema = Joi.object({
  churchId: Joi.string().uuid().required()
    .messages({
      'string.empty': 'Church ID is required',
      'string.uuid': 'Invalid church ID format'
    }),
  
  email: Joi.string().email().required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address'
    }),
  
  password: Joi.string().min(8).required()
    .pattern(passwordPattern)
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
  
  firstName: Joi.string().min(2).max(50).required()
    .messages({
      'string.empty': 'First name is required',
      'string.min': 'First name must be at least 2 characters'
    }),
  
  lastName: Joi.string().min(2).max(50).required()
    .messages({
      'string.empty': 'Last name is required',
      'string.min': 'Last name must be at least 2 characters'
    }),
  
  role: Joi.string().valid('admin', 'staff', 'member').optional()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address'
    }),
  
  password: Joi.string().required()
    .messages({
      'string.empty': 'Password is required'
    })
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address'
    })
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required()
    .messages({
      'string.empty': 'Reset token is required'
    }),
  
  password: Joi.string().min(8).required()
    .pattern(passwordPattern)
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    })
});

// Verify Reset OTP
export const verifyResetOTPSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
        'string.length': 'OTP must be 6 digits',
        'string.pattern.base': 'OTP must contain only numbers',
        'any.required': 'OTP is required'
    })
});

export const firstLoginResetPasswordSchema = Joi.object({
    userId: Joi.string().uuid().required(),
    oldPassword: Joi.string().required(),
    newPassword: Joi.string()
        .min(8)
        .pattern(/[A-Z]/, 'uppercase')
        .pattern(/[a-z]/, 'lowercase')
        .pattern(/[0-9]/, 'number')
        .pattern(/[^A-Za-z0-9]/, 'special character')
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.pattern.name': 'Password must contain at least one {#name}'
        })
});

export const verifyEmailSchema = Joi.object({
  token: Joi.string().required()
    .messages({
      'string.empty': 'Verification token is required'
    })
});
