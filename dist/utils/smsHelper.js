"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsHelper = void 0;
// src/utils/smsHelper.ts
class SmsHelper {
    /**
     * Calculate SMS units based on message length
     * Standard SMS: 160 characters = 1 unit
     * Unicode/Special chars: 70 characters = 1 unit
     */
    static calculateUnits(message, isUnicode = false) {
        const maxLength = isUnicode ? 70 : 160;
        const multiPartMax = isUnicode ? 67 : 153;
        if (message.length <= maxLength) {
            return 1;
        }
        return Math.ceil(message.length / multiPartMax);
    }
    /**
     * Check if message contains unicode characters
     */
    static isUnicode(message) {
        // Check for emojis and special characters
        const unicodeRegex = /[^\x00-\x7F]/;
        return unicodeRegex.test(message);
    }
    /**
     * Format phone number to international format
     */
    static formatPhoneNumber(phone, countryCode = '234') {
        // Remove all non-numeric characters
        let cleaned = phone.replace(/\D/g, '');
        // Remove leading zeros
        cleaned = cleaned.replace(/^0+/, '');
        // Add country code if not present
        if (!cleaned.startsWith(countryCode)) {
            cleaned = countryCode + cleaned;
        }
        return cleaned;
    }
    /**
     * Validate phone number
     */
    static isValidPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        // Should be between 10 and 15 digits
        return cleaned.length >= 10 && cleaned.length <= 15;
    }
    /**
     * Extract variables from message template
     */
    static extractVariables(template) {
        const regex = /\{\{(\w+)\}\}/g;
        const variables = [];
        let match;
        while ((match = regex.exec(template)) !== null) {
            variables.push(match[1]);
        }
        return [...new Set(variables)];
    }
    /**
     * Replace variables in template
     */
    static replaceVariables(template, variables) {
        let result = template;
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            result = result.replace(regex, value);
        });
        return result;
    }
    /**
     * Sanitize message content
     */
    static sanitizeMessage(message) {
        // Remove extra whitespace
        return message.trim().replace(/\s+/g, ' ');
    }
    /**
     * Split long message into parts
     */
    static splitMessage(message, maxLength = 160) {
        const parts = [];
        let remaining = message;
        while (remaining.length > 0) {
            parts.push(remaining.substring(0, maxLength));
            remaining = remaining.substring(maxLength);
        }
        return parts;
    }
}
exports.SmsHelper = SmsHelper;
//# sourceMappingURL=smsHelper.js.map