// src/utils/emailHelper.ts
import { createTransport } from 'nodemailer';

export class EmailHelper {
    /**
     * Validate email address
     */
    static isValidEmail(email: string): boolean {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Extract variables from email template
     */
    static extractVariables(template: string): string[] {
        const regex = /\{\{(\w+)\}\}/g;
        const variables: string[] = [];
        let match;

        while ((match = regex.exec(template)) !== null) {
            variables.push(match[1]);
        }

        return [...new Set(variables)];
    }

    /**
     * Replace variables in template
     */
    static replaceVariables(
        template: string,
        variables: Record<string, string>
    ): string {
        let result = template;

        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            result = result.replace(regex, value);
        });

        return result;
    }

    /**
     * Generate tracking pixel for email opens
     */
    static generateTrackingPixel(emailId: string, baseUrl: string): string {
        return `<img src="${baseUrl}/api/v1/email/track/open/${emailId}" width="1" height="1" style="display:none;" />`;
    }

    /**
     * Wrap links for click tracking
     */
    static wrapLinksForTracking(
        html: string,
        emailId: string,
        baseUrl: string
    ): string {
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi;

        return html.replace(linkRegex, (match, url) => {
            const trackedUrl = `${baseUrl}/api/v1/email/track/click/${emailId}?url=${encodeURIComponent(url)}`;
            return match.replace(url, trackedUrl);
        });
    }

    /**
     * Create plain text version from HTML
     */
    static htmlToText(html: string): string {
        return html
            .replace(/<style[^>]*>.*<\/style>/gm, '')
            .replace(/<script[^>]*>.*<\/script>/gm, '')
            .replace(/<[^>]+>/gm, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Validate email template
     */
    static validateTemplate(html: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check for basic HTML structure
        if (!html.includes('<html') && !html.includes('<body')) {
            errors.push('Missing HTML structure');
        }

        // Check for unclosed tags
        const openTags = html.match(/<[^/][^>]*>/g) || [];
        const closeTags = html.match(/<\/[^>]*>/g) || [];

        if (openTags.length !== closeTags.length) {
            errors.push('Unclosed HTML tags detected');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Sanitize HTML content
     */
    static sanitizeHtml(html: string): string {
        // Remove potentially dangerous tags and attributes
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
            .replace(/javascript:/gi, '');
    }
}