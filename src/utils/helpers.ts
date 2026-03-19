// src/utils/helpers.ts
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export function generateQRCode(): string {
    return crypto.randomBytes(16).toString('hex');
}

export function generateUUID(): string {
    return uuidv4();
}

export function generateConfirmationCode(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

export function formatDateTime(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString();
}

export function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

export function camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function convertKeysToCamel<T>(obj: any): T {
    if (Array.isArray(obj)) {
        return obj.map(v => convertKeysToCamel<any>(v)) as any;
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            (result as any)[snakeToCamel(key)] = convertKeysToCamel(obj[key]);
            return result;
        }, {} as T);
    }
    return obj;
}

export function convertKeysToSnake<T>(obj: any): T {
    if (Array.isArray(obj)) {
        return obj.map(v => convertKeysToSnake<any>(v)) as any;
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            (result as any)[camelToSnake(key)] = convertKeysToSnake(obj[key]);
            return result;
        }, {} as T);
    }
    return obj;
}