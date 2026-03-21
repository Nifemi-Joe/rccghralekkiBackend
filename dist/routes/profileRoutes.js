"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/profileRoutes.ts
const express_1 = require("express");
const ProfileCompletionController_1 = require("@controllers/ProfileCompletionController");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const controller = new ProfileCompletionController_1.ProfileCompletionController();
// Configure multer
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        if (allowedMimes.includes(file.mimetype) ||
            file.originalname.endsWith('.csv') ||
            file.originalname.endsWith('.xlsx')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only CSV and Excel files are allowed'));
        }
    }
});
// Wrapper to handle multer with proper typing - ADD : void RETURN TYPE
const uploadMiddleware = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    res.status(400).json({
                        status: 'error',
                        message: 'File size too large. Maximum size is 5MB.'
                    });
                    return;
                }
                res.status(400).json({
                    status: 'error',
                    message: err.message
                });
                return;
            }
            res.status(400).json({
                status: 'error',
                message: err.message || 'Error uploading file'
            });
            return;
        }
        next();
    });
};
// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================
// Get profile completion form data
router.get('/complete-profile/:token', controller.getProfileForm);
// Submit profile completion
router.post('/complete-profile/:token', controller.submitProfile);
// Upload profile file
router.post('/complete-profile/:token/upload', uploadMiddleware, controller.uploadProfileFile);
// Download template
router.get('/templates/profile-completion.:format', controller.downloadTemplate);
exports.default = router;
//# sourceMappingURL=profileRoutes.js.map