// src/routes/profileRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { ProfileCompletionController } from '@controllers/ProfileCompletionController';
import multer, { Multer } from 'multer';

const router = Router();
const controller = new ProfileCompletionController();

// Configure multer
const upload: Multer = multer({
    storage: multer.memoryStorage(),
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
        } else {
            cb(new Error('Only CSV and Excel files are allowed'));
        }
    }
});

// Wrapper to handle multer with proper typing - ADD : void RETURN TYPE
const uploadMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    upload.single('file')(req, res, (err: any) => {
        if (err) {
            if (err instanceof multer.MulterError) {
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
router.post(
    '/complete-profile/:token/upload',
    uploadMiddleware,
    controller.uploadProfileFile
);

// Download template
router.get('/templates/profile-completion.:format', controller.downloadTemplate);


export default router;