export declare class SmsHelper {
    /**
     * Calculate SMS units based on message length
     * Standard SMS: 160 characters = 1 unit
     * Unicode/Special chars: 70 characters = 1 unit
     */
    static calculateUnits(message: string, isUnicode?: boolean): number;
    /**
     * Check if message contains unicode characters
     */
    static isUnicode(message: string): boolean;
    /**
     * Format phone number to international format
     */
    static formatPhoneNumber(phone: string, countryCode?: string): string;
    /**
     * Validate phone number
     */
    static isValidPhoneNumber(phone: string): boolean;
    /**
     * Extract variables from message template
     */
    static extractVariables(template: string): string[];
    /**
     * Replace variables in template
     */
    static replaceVariables(template: string, variables: Record<string, string>): string;
    /**
     * Sanitize message content
     */
    static sanitizeMessage(message: string): string;
    /**
     * Split long message into parts
     */
    static splitMessage(message: string, maxLength?: number): string[];
}
//# sourceMappingURL=smsHelper.d.ts.map