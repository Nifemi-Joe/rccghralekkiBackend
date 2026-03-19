// src/services/ProfileCompletionService.ts
import { pool } from '@config/database';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

interface ProfileFormData {
    recordType: 'member' | 'first_timer' | 'guest';
    recordId: string;
    churchId: string;
    churchName: string;
    currentData: Record<string, any>;
    requiredFields: string[];
    optionalFields: string[];
}

interface ProfileUpdateData {
    dateOfBirth?: string;
    gender?: string;
    maritalStatus?: string;
    weddingAnniversary?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    howDidYouHear?: string;
    interests?: string[];
    prayerRequest?: string;
}

export class ProfileCompletionService {

    /**
     * Decode token and get form data
     */
    async getProfileFormData(token: string): Promise<ProfileFormData> {
        try {
            // Decode token: base64 encoded "churchId:type:id"
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            const parts = decoded.split(':');

            if (parts.length !== 3) {
                throw new AppError('Invalid token format', 400);
            }

            const [churchId, recordType, recordId] = parts;

            if (!churchId || !recordType || !recordId) {
                throw new AppError('Invalid token', 400);
            }

            // Validate record type
            if (!['member', 'first_timer', 'guest'].includes(recordType)) {
                throw new AppError('Invalid record type', 400);
            }

            // Get church info
            const churchQuery = `SELECT name FROM churches WHERE id = $1`;
            const churchResult = await pool.query(churchQuery, [churchId]);

            if (!churchResult.rows[0]) {
                throw new AppError('Church not found', 404);
            }

            const churchName = churchResult.rows[0].name;

            // Get current data based on record type
            let currentData: Record<string, any> = {};
            let requiredFields: string[] = [];
            let optionalFields: string[] = [];

            if (recordType === 'member') {
                const query = `
                    SELECT
                        first_name, last_name, email, phone, date_of_birth,
                        gender, marital_status, wedding_anniversary,
                        address, city, state, country, postal_code
                    FROM members
                    WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
                `;
                const result = await pool.query(query, [recordId, churchId]);

                if (!result.rows[0]) {
                    throw new AppError('Member not found', 404);
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

            } else if (recordType === 'first_timer') {
                const query = `
                    SELECT
                        first_name, last_name, email, phone, date_of_birth,
                        gender, address, city, state, country,
                        how_did_you_hear, interests, prayer_request
                    FROM first_timers
                    WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
                `;
                const result = await pool.query(query, [recordId, churchId]);

                if (!result.rows[0]) {
                    throw new AppError('First timer not found', 404);
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
            } else {
                // Guest - no database lookup needed
                currentData = {};
                requiredFields = [];
                optionalFields = [];
            }

            return {
                recordType: recordType as 'member' | 'first_timer' | 'guest',
                recordId,
                churchId,
                churchName,
                currentData,
                requiredFields,
                optionalFields
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Error getting profile form data:', error);
            throw new AppError('Invalid or expired token', 400);
        }
    }

    /**
     * Submit profile completion
     */
    async submitProfileCompletion(token: string, data: ProfileUpdateData): Promise<{ success: boolean; message: string }> {
        const formData = await this.getProfileFormData(token);

        if (formData.recordType === 'member') {
            await this.updateMemberProfile(formData.recordId, formData.churchId, data);
        } else if (formData.recordType === 'first_timer') {
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
    async processProfileFile(token: string, file: Express.Multer.File): Promise<{ success: boolean; message: string }> {
        const formData = await this.getProfileFormData(token);

        // Parse file based on type
        let data: ProfileUpdateData;

        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            data = this.parseCSV(file.buffer);
        } else if (
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.originalname.endsWith('.xlsx')
        ) {
            data = await this.parseExcel(file.buffer);
        } else {
            throw new AppError('Invalid file format. Please upload CSV or Excel file.', 400);
        }

        return this.submitProfileCompletion(token, data);
    }

    /**
     * Generate template file for profile completion
     */
    async generateTemplate(
        format: 'csv' | 'xlsx',
        type: 'member' | 'first_timer' = 'member'
    ): Promise<{ data: Buffer; contentType: string; filename: string }> {

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
        } else {
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

    private async updateMemberProfile(memberId: string, churchId: string, data: ProfileUpdateData): Promise<void> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 0;

        const fieldMappings: Record<string, string> = {
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
            const value = data[key as keyof ProfileUpdateData];
            if (value !== undefined && value !== null && value !== '') {
                paramCount++;
                fields.push(`${column} = $${paramCount}`);
                values.push(value);
            }
        }

        if (fields.length === 0) {
            logger.info('No fields to update for member profile');
            return;
        }

        fields.push('updated_at = NOW()');
        values.push(memberId, churchId);

        const query = `
            UPDATE members
            SET ${fields.join(', ')}
            WHERE id = $${paramCount + 1} AND church_id = $${paramCount + 2} AND deleted_at IS NULL
        `;

        await pool.query(query, values);
        logger.info(`Member profile updated: ${memberId}`);
    }

    private async updateFirstTimerProfile(firstTimerId: string, churchId: string, data: ProfileUpdateData): Promise<void> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 0;

        const fieldMappings: Record<string, string> = {
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
            const value = data[key as keyof ProfileUpdateData];
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
            logger.info('No fields to update for first timer profile');
            return;
        }

        fields.push('updated_at = NOW()');
        values.push(firstTimerId, churchId);

        const query = `
            UPDATE first_timers
            SET ${fields.join(', ')}
            WHERE id = $${paramCount + 1} AND church_id = $${paramCount + 2} AND deleted_at IS NULL
        `;

        await pool.query(query, values);
        logger.info(`First timer profile updated: ${firstTimerId}`);
    }

    private parseCSV(buffer: Buffer): ProfileUpdateData {
        const content = buffer.toString('utf-8');
        const lines = content.split('\n');
        const data: ProfileUpdateData = {};

        for (const line of lines.slice(1)) { // Skip header
            const parts = line.split(',');
            if (parts.length >= 2) {
                const field = parts[0].replace(/"/g, '').trim();
                const value = parts[1].replace(/"/g, '').trim();

                if (field && value) {
                    if (field === 'interests') {
                        data.interests = value.split(',').map(s => s.trim()).filter(s => s);
                    } else {
                        (data as any)[field] = value;
                    }
                }
            }
        }

        return data;
    }

    private async parseExcel(buffer: Buffer): Promise<ProfileUpdateData> {
        // Would use 'exceljs' or 'xlsx' library here
        // For now, try to parse as CSV
        try {
            return this.parseCSV(buffer);
        } catch (error) {
            logger.error('Error parsing Excel file:', error);
            throw new AppError('Could not parse Excel file. Please use CSV format.', 400);
        }
    }

    private parseJsonField(value: any): string[] | undefined {
        if (!value) return undefined;
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return undefined;
            }
        }
        return undefined;
    }
}