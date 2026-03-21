"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileCompletionService = void 0;
// src/services/ProfileCompletionService.ts
const database_1 = require("@config/database");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
class ProfileCompletionService {
    /**
     * Decode token and get form data
     */
    async getProfileFormData(token) {
        try {
            // Decode token: base64 encoded "churchId:type:id"
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            const parts = decoded.split(':');
            if (parts.length !== 3) {
                throw new AppError_1.AppError('Invalid token format', 400);
            }
            const [churchId, recordType, recordId] = parts;
            if (!churchId || !recordType || !recordId) {
                throw new AppError_1.AppError('Invalid token', 400);
            }
            // Validate record type
            if (!['member', 'first_timer', 'guest'].includes(recordType)) {
                throw new AppError_1.AppError('Invalid record type', 400);
            }
            // Get church info
            const churchQuery = `SELECT name FROM churches WHERE id = $1`;
            const churchResult = await database_1.pool.query(churchQuery, [churchId]);
            if (!churchResult.rows[0]) {
                throw new AppError_1.AppError('Church not found', 404);
            }
            const churchName = churchResult.rows[0].name;
            // Get current data based on record type
            let currentData = {};
            let requiredFields = [];
            let optionalFields = [];
            if (recordType === 'member') {
                const query = `
                    SELECT
                        first_name, last_name, email, phone, date_of_birth,
                        gender, marital_status, wedding_anniversary,
                        address, city, state, country, postal_code
                    FROM members
                    WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
                `;
                const result = await database_1.pool.query(query, [recordId, churchId]);
                if (!result.rows[0]) {
                    throw new AppError_1.AppError('Member not found', 404);
                }
                const row = result.rows[0];
                currentData = {
                    firstName: row.first_name,
                    lastName: row.last_name,
                    email: row.email,
                    phone: row.phone,
                    dateOfBirth: row.date_of_birth ? row.date_of_birth.toISOString().split('T')[0] : null,
                    gender: row.gender,
                    maritalStatus: row.marital_status,
                    weddingAnniversary: row.wedding_anniversary ? row.wedding_anniversary.toISOString().split('T')[0] : null,
                    address: row.address,
                    city: row.city,
                    state: row.state,
                    country: row.country,
                    postalCode: row.postal_code
                };
                requiredFields = ['dateOfBirth'];
                optionalFields = ['gender', 'maritalStatus', 'weddingAnniversary', 'address', 'city', 'state', 'country', 'postalCode'];
            }
            else if (recordType === 'first_timer') {
                const query = `
                    SELECT
                        first_name, last_name, email, phone, date_of_birth,
                        gender, address, city, state, country,
                        how_did_you_hear, interests, prayer_request
                    FROM first_timers
                    WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
                `;
                const result = await database_1.pool.query(query, [recordId, churchId]);
                if (!result.rows[0]) {
                    throw new AppError_1.AppError('First timer not found', 404);
                }
                const row = result.rows[0];
                currentData = {
                    firstName: row.first_name,
                    lastName: row.last_name,
                    email: row.email,
                    phone: row.phone,
                    dateOfBirth: row.date_of_birth ? row.date_of_birth.toISOString().split('T')[0] : null,
                    gender: row.gender,
                    address: row.address,
                    city: row.city,
                    state: row.state,
                    country: row.country,
                    howDidYouHear: row.how_did_you_hear,
                    interests: this.parseJsonField(row.interests),
                    prayerRequest: row.prayer_request
                };
                requiredFields = [];
                optionalFields = ['dateOfBirth', 'gender', 'address', 'city', 'state', 'country', 'howDidYouHear', 'interests', 'prayerRequest'];
            }
            else {
                // Guest - no database lookup needed
                currentData = {};
                requiredFields = [];
                optionalFields = [];
            }
            return {
                recordType: recordType,
                recordId,
                churchId,
                churchName,
                currentData,
                requiredFields,
                optionalFields
            };
        }
        catch (error) {
            if (error instanceof AppError_1.AppError)
                throw error;
            logger_1.default.error('Error getting profile form data:', error);
            throw new AppError_1.AppError('Invalid or expired token', 400);
        }
    }
    /**
     * Submit profile completion
     */
    async submitProfileCompletion(token, data) {
        const formData = await this.getProfileFormData(token);
        if (formData.recordType === 'member') {
            await this.updateMemberProfile(formData.recordId, formData.churchId, data);
        }
        else if (formData.recordType === 'first_timer') {
            await this.updateFirstTimerProfile(formData.recordId, formData.churchId, data);
        }
        return {
            success: true,
            message: 'Profile updated successfully. Thank you!'
        };
    }
    /**
     * Process uploaded file for profile completion
     */
    async processProfileFile(token, file) {
        const formData = await this.getProfileFormData(token);
        // Parse file based on type
        let data;
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            data = this.parseCSV(file.buffer);
        }
        else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.originalname.endsWith('.xlsx')) {
            data = await this.parseExcel(file.buffer);
        }
        else {
            throw new AppError_1.AppError('Invalid file format. Please upload CSV or Excel file.', 400);
        }
        return this.submitProfileCompletion(token, data);
    }
    /**
     * Generate template file for profile completion
     */
    async generateTemplate(format, type = 'member') {
        const memberFields = [
            { field: 'dateOfBirth', label: 'Date of Birth (YYYY-MM-DD)', example: '1990-01-15', required: true },
            { field: 'gender', label: 'Gender (male/female/other)', example: 'male', required: false },
            { field: 'maritalStatus', label: 'Marital Status (single/married/divorced/widowed)', example: 'single', required: false },
            { field: 'weddingAnniversary', label: 'Wedding Anniversary (YYYY-MM-DD)', example: '2015-06-20', required: false },
            { field: 'address', label: 'Street Address', example: '123 Main Street', required: false },
            { field: 'city', label: 'City', example: 'Lagos', required: false },
            { field: 'state', label: 'State/Province', example: 'Lagos', required: false },
            { field: 'country', label: 'Country', example: 'Nigeria', required: false },
            { field: 'postalCode', label: 'Postal Code', example: '100001', required: false }
        ];
        const firstTimerFields = [
            { field: 'dateOfBirth', label: 'Date of Birth (YYYY-MM-DD)', example: '1990-01-15', required: false },
            { field: 'gender', label: 'Gender (male/female/other)', example: 'female', required: false },
            { field: 'address', label: 'Street Address', example: '123 Main Street', required: false },
            { field: 'city', label: 'City', example: 'Lagos', required: false },
            { field: 'state', label: 'State/Province', example: 'Lagos', required: false },
            { field: 'country', label: 'Country', example: 'Nigeria', required: false },
            { field: 'howDidYouHear', label: 'How did you hear about us?', example: 'Friend invitation', required: false },
            { field: 'interests', label: 'Interests (comma-separated)', example: 'worship,youth group,bible study', required: false },
            { field: 'prayerRequest', label: 'Prayer Request', example: 'Please pray for my family', required: false }
        ];
        const fields = type === 'member' ? memberFields : firstTimerFields;
        if (format === 'csv') {
            const headers = ['Field', 'Your Value', 'Description', 'Example', 'Required'];
            const rows = fields.map(f => [
                f.field,
                '',
                f.label,
                f.example,
                f.required ? 'Yes' : 'No'
            ]);
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');
            return {
                data: Buffer.from(csvContent, 'utf-8'),
                contentType: 'text/csv; charset=utf-8',
                filename: `profile-completion-${type}.csv`
            };
        }
        else {
            // For Excel, we would use a library like 'exceljs'
            // For now, return CSV format with xlsx extension hint
            const headers = ['Field', 'Your Value', 'Description', 'Example', 'Required'];
            const rows = fields.map(f => [
                f.field,
                '',
                f.label,
                f.example,
                f.required ? 'Yes' : 'No'
            ]);
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');
            return {
                data: Buffer.from(csvContent, 'utf-8'),
                contentType: 'text/csv; charset=utf-8',
                filename: `profile-completion-${type}.csv`
            };
        }
    }
    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================
    async updateMemberProfile(memberId, churchId, data) {
        const fields = [];
        const values = [];
        let paramCount = 0;
        const fieldMappings = {
            dateOfBirth: 'date_of_birth',
            gender: 'gender',
            maritalStatus: 'marital_status',
            weddingAnniversary: 'wedding_anniversary',
            address: 'address',
            city: 'city',
            state: 'state',
            country: 'country',
            postalCode: 'postal_code'
        };
        for (const [key, column] of Object.entries(fieldMappings)) {
            const value = data[key];
            if (value !== undefined && value !== null && value !== '') {
                paramCount++;
                fields.push(`${column} = $${paramCount}`);
                values.push(value);
            }
        }
        if (fields.length === 0) {
            logger_1.default.info('No fields to update for member profile');
            return;
        }
        fields.push('updated_at = NOW()');
        values.push(memberId, churchId);
        const query = `
            UPDATE members
            SET ${fields.join(', ')}
            WHERE id = $${paramCount + 1} AND church_id = $${paramCount + 2} AND deleted_at IS NULL
        `;
        await database_1.pool.query(query, values);
        logger_1.default.info(`Member profile updated: ${memberId}`);
    }
    async updateFirstTimerProfile(firstTimerId, churchId, data) {
        const fields = [];
        const values = [];
        let paramCount = 0;
        const fieldMappings = {
            dateOfBirth: 'date_of_birth',
            gender: 'gender',
            address: 'address',
            city: 'city',
            state: 'state',
            country: 'country',
            howDidYouHear: 'how_did_you_hear',
            prayerRequest: 'prayer_request'
        };
        for (const [key, column] of Object.entries(fieldMappings)) {
            const value = data[key];
            if (value !== undefined && value !== null && value !== '') {
                paramCount++;
                fields.push(`${column} = $${paramCount}`);
                values.push(value);
            }
        }
        // Handle interests array
        if (data.interests && Array.isArray(data.interests) && data.interests.length > 0) {
            paramCount++;
            fields.push(`interests = $${paramCount}`);
            values.push(JSON.stringify(data.interests));
        }
        if (fields.length === 0) {
            logger_1.default.info('No fields to update for first timer profile');
            return;
        }
        fields.push('updated_at = NOW()');
        values.push(firstTimerId, churchId);
        const query = `
            UPDATE first_timers
            SET ${fields.join(', ')}
            WHERE id = $${paramCount + 1} AND church_id = $${paramCount + 2} AND deleted_at IS NULL
        `;
        await database_1.pool.query(query, values);
        logger_1.default.info(`First timer profile updated: ${firstTimerId}`);
    }
    parseCSV(buffer) {
        const content = buffer.toString('utf-8');
        const lines = content.split('\n');
        const data = {};
        for (const line of lines.slice(1)) { // Skip header
            const parts = line.split(',');
            if (parts.length >= 2) {
                const field = parts[0].replace(/"/g, '').trim();
                const value = parts[1].replace(/"/g, '').trim();
                if (field && value) {
                    if (field === 'interests') {
                        data.interests = value.split(',').map(s => s.trim()).filter(s => s);
                    }
                    else {
                        data[field] = value;
                    }
                }
            }
        }
        return data;
    }
    async parseExcel(buffer) {
        // Would use 'exceljs' or 'xlsx' library here
        // For now, try to parse as CSV
        try {
            return this.parseCSV(buffer);
        }
        catch (error) {
            logger_1.default.error('Error parsing Excel file:', error);
            throw new AppError_1.AppError('Could not parse Excel file. Please use CSV format.', 400);
        }
    }
    parseJsonField(value) {
        if (!value)
            return undefined;
        if (Array.isArray(value))
            return value;
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            }
            catch {
                return undefined;
            }
        }
        return undefined;
    }
}
exports.ProfileCompletionService = ProfileCompletionService;
//# sourceMappingURL=ProfileCompletionService.js.map