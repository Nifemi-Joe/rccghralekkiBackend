export declare class EmailHelper {
    /**
     * Validate email address
     */
    static isValidEmail(email: string): boolean;
    /**
     * Extract variables from email template
     */
    static extractVariables(template: string): string[];
    /**
     * Replace variables in template
     */
    static replaceVariables(template: string, variables: Record<string, string>): string;
    /**
     * Generate tracking pixel for email opens
     */
    static generateTrackingPixel(emailId: string, baseUrl: string): string;
    /**
     * Wrap links for click tracking
     */
    static wrapLinksForTracking(html: string, emailId: string, baseUrl: string): string;
    /**
     * Create plain text version from HTML
     */
    static htmlToText(html: string): string;
    /**
     * Validate email template
     */
    static validateTemplate(html: string): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Sanitize HTML content
     */
    static sanitizeHtml(html: string): string;
}
//# sourceMappingURL=emailHelper.d.ts.map