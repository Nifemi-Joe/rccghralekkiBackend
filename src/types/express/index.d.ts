// src/types/express/index.d.ts
import { Express } from 'express-serve-static-core';

declare global {
    namespace Express {
        interface Request {
            file?: Multer.File;
            files?: { [fieldname: string]: Multer.File[] } | Multer.File[];
        }
        namespace Multer {
            interface File {
                fieldname: string;
                originalname: string;
                encoding: string;
                mimetype: string;
                size: number;
                destination: string;
                filename: string;
                path: string;
                buffer: Buffer;
            }
        }
    }
}