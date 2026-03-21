"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQRCode = generateQRCode;
exports.generateUUID = generateUUID;
exports.generateConfirmationCode = generateConfirmationCode;
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.snakeToCamel = snakeToCamel;
exports.camelToSnake = camelToSnake;
exports.convertKeysToCamel = convertKeysToCamel;
exports.convertKeysToSnake = convertKeysToSnake;
// src/utils/helpers.ts
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
function generateQRCode() {
    return crypto_1.default.randomBytes(16).toString('hex');
}
function generateUUID() {
    return (0, uuid_1.v4)();
}
function generateConfirmationCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
function formatDate(date) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}
function formatDateTime(date) {
    const d = new Date(date);
    return d.toISOString();
}
function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}
function camelToSnake(str) {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
function convertKeysToCamel(obj) {
    if (Array.isArray(obj)) {
        return obj.map(v => convertKeysToCamel(v));
    }
    else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            result[snakeToCamel(key)] = convertKeysToCamel(obj[key]);
            return result;
        }, {});
    }
    return obj;
}
function convertKeysToSnake(obj) {
    if (Array.isArray(obj)) {
        return obj.map(v => convertKeysToSnake(v));
    }
    else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            result[camelToSnake(key)] = convertKeysToSnake(obj[key]);
            return result;
        }, {});
    }
    return obj;
}
//# sourceMappingURL=helpers.js.map