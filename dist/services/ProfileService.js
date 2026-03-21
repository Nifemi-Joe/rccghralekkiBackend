"use strict";
// src/services/ProfileService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const UserRepository_1 = require("@repositories/UserRepository");
const ChurchRepository_1 = require("@repositories/ChurchRepository");
const MemberRepository_1 = require("@repositories/MemberRepository");
const AppError_1 = require("@utils/AppError");
const staff_types_1 = require("@/dtos/staff.types");
const logger_1 = __importDefault(require("@config/logger"));
// import { EmailService } from '@services/EmailService';
class ProfileService {
    // private emailService: EmailService;
    constructor() {
        this.userRepository = new UserRepository_1.UserRepository();
        this.churchRepository = new ChurchRepository_1.ChurchRepository();
        this.memberRepository = new MemberRepository_1.MemberRepository();
        // this.emailService = new EmailService();
    }
    // ============================================================================
    // PROFILE MANAGEMENT
    // ============================================================================
    async getProfile(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new AppError_1.AppError('User not found', 404);
        }
        const church = await this.churchRepository.findById(user.church_id);
        const { password_hash, ...userWithoutPassword } = user;
        return {
            user: {
                ...userWithoutPassword,
                permissions: this.getUserPermissions(user.role),
                roleDisplay: this.getRoleDisplay(user.role),
            },
            church: church ? {
                id: church.id,
                name: church.name,
                email: church.email,
                phone: church.phone,
                address: church.address,
                city: church.city,
                state: church.state,
                country: church.country,
                logoUrl: church.logo_url,
                timezone: church.timezone,
                currency: church.currency,
            } : null,
        };
    }
    async updateProfile(userId, data) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new AppError_1.AppError('User not found', 404);
        }
        const updatedUser = await this.userRepository.update(userId, {
            firstName: data.firstName,
            lastName: data.lastName,
            phoneNumber: data.phoneNumber,
            country: data.country,
            profileImageUrl: data.profileImageUrl,
            profileCompleted: true,
        });
        if (!updatedUser) {
            throw new AppError_1.AppError('Failed to update profile', 500);
        }
        const { password_hash, ...userWithoutPassword } = updatedUser;
        logger_1.default.info(`Profile updated for user: ${userId}`);
        return userWithoutPassword;
    }
    async changePassword(userId, data) {
        if (data.newPassword !== data.confirmPassword) {
            throw new AppError_1.AppError('Passwords do not match', 400);
        }
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new AppError_1.AppError('User not found', 404);
        }
        // Verify current password
        const isPasswordValid = await bcryptjs_1.default.compare(data.currentPassword, user.password_hash);
        if (!isPasswordValid) {
            throw new AppError_1.AppError('Current password is incorrect', 401);
        }
        // Validate new password strength
        this.validatePasswordStrength(data.newPassword);
        // Check if new password is same as old
        const isSamePassword = await bcryptjs_1.default.compare(data.newPassword, user.password_hash);
        if (isSamePassword) {
            throw new AppError_1.AppError('New password must be different from current password', 400);
        }
        // Hash and update password
        const hashedPassword = await bcryptjs_1.default.hash(data.newPassword, 12);
        await this.userRepository.updatePassword(userId, hashedPassword);
        logger_1.default.info(`Password changed for user: ${userId}`);
        return { message: 'Password changed successfully' };
    }
    async updateProfileImage(userId, imageUrl) {
        const user = await this.userRepository.update(userId, {
            profileImageUrl: imageUrl,
        });
        if (!user) {
            throw new AppError_1.AppError('Failed to update profile image', 500);
        }
        return { profileImageUrl: imageUrl };
    }
    // ============================================================================
    // STAFF MANAGEMENT
    // ============================================================================
    async getStaffMembers(churchId, options = {}) {
        // Validate and cast status to UserStatus if provided
        let validStatus;
        if (options.status) {
            const validStatuses = ['active', 'inactive', 'pending', 'suspended'];
            if (validStatuses.includes(options.status)) {
                validStatus = options.status;
            }
        }
        // Validate and cast role
        let validRole;
        if (options.role) {
            const validRoles = ['super_admin', 'admin', 'pastor', 'leader', 'member', 'volunteer', 'guest'];
            if (validRoles.includes(options.role)) {
                validRole = options.role;
            }
        }
        else {
            // Default to staff roles
            validRole = ['admin', 'pastor', 'leader', 'volunteer'];
        }
        const result = await this.userRepository.findByChurchId(churchId, {
            search: options.search,
            role: validRole,
            status: validStatus,
            limit: options.limit || 50,
            offset: ((options.page || 1) - 1) * (options.limit || 50),
        });
        return {
            staff: result.users.map(user => this.transformToStaffMember(user)),
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages,
            },
        };
    }
    async getStaffMember(churchId, staffId) {
        const user = await this.userRepository.findByIdSafe(staffId);
        if (!user || user.church_id !== churchId) {
            throw new AppError_1.AppError('Staff member not found', 404);
        }
        return this.transformToStaffMember(user);
    }
    async createStaffMember(churchId, data, createdBy) {
        // Check if email already exists
        const existingUser = await this.userRepository.findByEmail(data.email);
        if (existingUser) {
            throw new AppError_1.AppError('Email already registered', 409);
        }
        // Verify church exists
        const church = await this.churchRepository.findById(churchId);
        if (!church) {
            throw new AppError_1.AppError('Church not found', 404);
        }
        // Generate temporary password
        const temporaryPassword = this.generateTemporaryPassword();
        const hashedPassword = await bcryptjs_1.default.hash(temporaryPassword, 12);
        // Determine permissions
        const permissions = data.permissions || staff_types_1.ROLE_DEFAULT_PERMISSIONS[data.role] || [];
        // Create user
        const user = await this.userRepository.create({
            churchId,
            email: data.email.toLowerCase().trim(),
            passwordHash: hashedPassword,
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            phoneNumber: data.phoneNumber?.trim(),
            role: this.mapStaffRoleToUserRole(data.role),
            status: 'active',
            profileCompleted: true,
            isTemporaryPassword: true,
            mustResetPassword: true,
            emailVerified: false,
        });
        // Store permissions (you might want to store these in a separate table)
        await this.updateUserPermissions(user.id, permissions);
        // NEW FEATURE: Create church member if requested
        let createdMember = null;
        if (data.createAsMember) {
            try {
                // FIXED: MemberRepository.create() returns { member: Member; profileLink?: ProfileUpdateLink }
                const memberResult = await this.memberRepository.create({
                    churchId,
                    firstName: data.firstName.trim(),
                    lastName: data.lastName.trim(),
                    email: data.email.toLowerCase().trim(),
                    phone: data.phoneNumber?.trim(),
                    userId: user.id, // Link to user account
                    registrationType: 'manual',
                    status: 'active',
                    createdBy: createdBy,
                });
                // FIXED: Extract the member from the result object
                createdMember = memberResult.member;
                logger_1.default.info(`Church member created for staff: ${createdMember.id} linked to user ${user.id}`);
            }
            catch (memberError) {
                // Log error but don't fail staff creation
                logger_1.default.error('Failed to create member for staff, but user was created successfully:', memberError);
                // Optionally, you could rollback the user creation here if member creation is critical
            }
        }
        // Send invitation email with temporary password
        if (data.sendInvite !== false) {
            await this.sendStaffInvitation(data.email, {
                firstName: data.firstName,
                lastName: data.lastName,
                churchName: church.name,
                temporaryPassword,
                role: data.role,
            });
        }
        logger_1.default.info(`Staff member created: ${user.id} (${data.email}) by user ${createdBy}`);
        const { password_hash, ...userWithoutPassword } = user;
        return {
            staff: this.transformToStaffMember(userWithoutPassword),
            member: createdMember,
            temporaryPassword: data.sendInvite === false ? temporaryPassword : undefined,
            message: data.sendInvite !== false
                ? `Staff member created${createdMember ? ' and added to church members' : ''}. Login credentials sent to their email.`
                : `Staff member created${createdMember ? ' and added to church members' : ''}.`,
        };
    }
    async getMemberProfile(userId) {
        // Find member linked to this user
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new AppError_1.AppError('User not found', 404);
        }
        const member = await this.memberRepository.findByUserId(userId, user.church_id);
        if (!member) {
            throw new AppError_1.AppError('No member profile linked to this account', 404);
        }
        return member;
    }
    async updateMemberProfile(userId, data) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new AppError_1.AppError('User not found', 404);
        }
        const member = await this.memberRepository.findByUserId(userId, user.church_id);
        if (!member) {
            throw new AppError_1.AppError('No member profile linked to this account', 404);
        }
        // Update member record
        const updatedMember = await this.memberRepository.update(member.id, user.church_id, {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            gender: data.gender,
            maritalStatus: data.maritalStatus,
            dateOfBirth: data.dateOfBirth,
            weddingAnniversary: data.weddingAnniversary,
            address: data.address,
            city: data.city,
            state: data.state,
            country: data.country,
            postalCode: data.postalCode,
            updatedBy: userId,
        });
        if (!updatedMember) {
            throw new AppError_1.AppError('Failed to update member profile', 500);
        }
        logger_1.default.info(`Member profile updated by user: ${userId}`);
        return updatedMember;
    }
    async updateStaffMember(churchId, staffId, data, updatedBy) {
        const user = await this.userRepository.findById(staffId);
        if (!user || user.church_id !== churchId) {
            throw new AppError_1.AppError('Staff member not found', 404);
        }
        // Prevent self-demotion for last admin
        if (data.role && user.role === 'admin') {
            const admins = await this.userRepository.findAdminsByChurchId(churchId);
            if (admins.length === 1 && admins[0].id === staffId) {
                throw new AppError_1.AppError('Cannot change role of the only admin', 400);
            }
        }
        // Validate status if provided
        let validStatus;
        if (data.status) {
            const validStatuses = ['active', 'inactive', 'pending', 'suspended'];
            if (validStatuses.includes(data.status)) {
                validStatus = data.status;
            }
        }
        const updatedUser = await this.userRepository.update(staffId, {
            firstName: data.firstName,
            lastName: data.lastName,
            phoneNumber: data.phoneNumber,
            role: data.role ? this.mapStaffRoleToUserRole(data.role) : undefined,
            status: validStatus,
        });
        if (!updatedUser) {
            throw new AppError_1.AppError('Failed to update staff member', 500);
        }
        // Update permissions if provided
        if (data.permissions) {
            await this.updateUserPermissions(staffId, data.permissions);
        }
        // NEW FEATURE: Update linked member record if it exists
        try {
            const linkedMember = await this.memberRepository.findByUserId(staffId, churchId);
            if (linkedMember) {
                await this.memberRepository.update(linkedMember.id, churchId, {
                    firstName: data.firstName || linkedMember.first_name,
                    lastName: data.lastName || linkedMember.last_name,
                    phone: data.phoneNumber || linkedMember.phone,
                    updatedBy: updatedBy,
                });
                logger_1.default.info(`Updated linked member record: ${linkedMember.id} for staff ${staffId}`);
            }
        }
        catch (memberError) {
            logger_1.default.error('Failed to update linked member record:', memberError);
        }
        logger_1.default.info(`Staff member updated: ${staffId} by user ${updatedBy}`);
        return this.transformToStaffMember(updatedUser);
    }
    async deleteStaffMember(churchId, staffId, deletedBy) {
        const user = await this.userRepository.findById(staffId);
        if (!user || user.church_id !== churchId) {
            throw new AppError_1.AppError('Staff member not found', 404);
        }
        // Prevent self-deletion
        if (staffId === deletedBy) {
            throw new AppError_1.AppError('Cannot delete your own account', 400);
        }
        // Prevent deletion of last admin
        if (user.role === 'admin') {
            const admins = await this.userRepository.findAdminsByChurchId(churchId);
            if (admins.length === 1) {
                throw new AppError_1.AppError('Cannot delete the only admin', 400);
            }
        }
        await this.userRepository.delete(staffId);
        // NEW FEATURE: Also soft-delete linked member record if it exists
        try {
            const linkedMember = await this.memberRepository.findByUserId(staffId, churchId);
            if (linkedMember) {
                await this.memberRepository.delete(linkedMember.id, churchId);
                logger_1.default.info(`Deleted linked member record: ${linkedMember.id} for staff ${staffId}`);
            }
        }
        catch (memberError) {
            logger_1.default.error('Failed to delete linked member record:', memberError);
        }
        logger_1.default.info(`Staff member deleted: ${staffId} by user ${deletedBy}`);
        return { message: 'Staff member deleted successfully' };
    }
    async resendInvitation(churchId, staffId) {
        const user = await this.userRepository.findById(staffId);
        if (!user || user.church_id !== churchId) {
            throw new AppError_1.AppError('Staff member not found', 404);
        }
        if (!user.must_reset_password) {
            throw new AppError_1.AppError('User has already set their password', 400);
        }
        const church = await this.churchRepository.findById(churchId);
        if (!church) {
            throw new AppError_1.AppError('Church not found', 404);
        }
        // Generate new temporary password
        const temporaryPassword = this.generateTemporaryPassword();
        const hashedPassword = await bcryptjs_1.default.hash(temporaryPassword, 12);
        await this.userRepository.updatePassword(user.id, hashedPassword);
        await this.userRepository.update(user.id, {
            isTemporaryPassword: true,
            mustResetPassword: true,
        });
        // Send new invitation email
        await this.sendStaffInvitation(user.email, {
            firstName: user.first_name,
            lastName: user.last_name,
            churchName: church.name,
            temporaryPassword,
            role: user.role,
        });
        logger_1.default.info(`Invitation resent to: ${user.email}`);
        return { message: 'Invitation resent successfully' };
    }
    async getAvailablePermissions() {
        return {
            permissions: staff_types_1.AVAILABLE_PERMISSIONS,
            roleDefaults: staff_types_1.ROLE_DEFAULT_PERMISSIONS,
        };
    }
    // ============================================================================
    // HELPER METHODS
    // ============================================================================
    generateTemporaryPassword() {
        // Generate a more user-friendly temporary password
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        const specialChars = '!@#$%';
        let password = '';
        // 8 alphanumeric characters
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Add 1 special character
        password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
        // Add 2 more characters
        for (let i = 0; i < 2; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
    validatePasswordStrength(password) {
        if (password.length < 8) {
            throw new AppError_1.AppError('Password must be at least 8 characters long', 400);
        }
        if (!/[A-Z]/.test(password)) {
            throw new AppError_1.AppError('Password must contain at least one uppercase letter', 400);
        }
        if (!/[a-z]/.test(password)) {
            throw new AppError_1.AppError('Password must contain at least one lowercase letter', 400);
        }
        if (!/[0-9]/.test(password)) {
            throw new AppError_1.AppError('Password must contain at least one number', 400);
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
            throw new AppError_1.AppError('Password must contain at least one special character', 400);
        }
    }
    mapStaffRoleToUserRole(staffRole) {
        const roleMap = {
            admin: 'admin',
            pastor: 'pastor',
            associate_pastor: 'pastor',
            worship_leader: 'leader',
            youth_pastor: 'pastor',
            children_minister: 'leader',
            finance_officer: 'leader',
            secretary: 'leader',
            head_usher: 'leader',
            head_choir: 'leader',
            media_director: 'leader',
            outreach_coordinator: 'leader',
            staff: 'leader',
            volunteer_leader: 'volunteer',
            leader: 'leader',
            member: 'member',
            volunteer: 'volunteer',
        };
        return roleMap[staffRole] || 'member';
    }
    getRoleDisplay(role) {
        const roleMap = {
            super_admin: 'Super Administrator',
            admin: 'Administrator',
            pastor: 'Pastor',
            leader: 'Leader',
            member: 'Member',
            volunteer: 'Volunteer',
            guest: 'Guest',
        };
        return roleMap[role] || role;
    }
    getUserPermissions(role, customPermissions) {
        if (customPermissions && customPermissions.length > 0) {
            return customPermissions;
        }
        return staff_types_1.ROLE_DEFAULT_PERMISSIONS[role] || [];
    }
    transformToStaffMember(user) {
        return {
            id: user.id,
            churchId: user.church_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phoneNumber: user.phone_number,
            role: user.role,
            permissions: this.getUserPermissions(user.role),
            status: user.status,
            profileImageUrl: user.profile_image_url,
            isTemporaryPassword: user.is_temporary_password,
            mustResetPassword: user.must_reset_password,
            lastLoginAt: user.last_login_at,
            createdAt: user.created_at,
            createdBy: user.created_by,
        };
    }
    async updateUserPermissions(userId, permissions) {
        // For now, we'll store permissions in the user record
        // In a production system, you might want a separate permissions table
        // This is a placeholder - you'd implement actual storage
        logger_1.default.debug(`Updating permissions for user ${userId}: ${permissions.join(', ')}`);
    }
    async sendStaffInvitation(email, data) {
        // TODO: Implement email sending
        logger_1.default.info(`
      ===============================================
      STAFF INVITATION EMAIL (Development Mode)
      ===============================================
      To: ${email}
      Subject: Welcome to ${data.churchName}
      
      Hello ${data.firstName} ${data.lastName},
      
      You have been added as a ${data.role} to ${data.churchName}.
      
      Your login credentials:
      Email: ${email}
      Temporary Password: ${data.temporaryPassword}
      
      Please login and change your password immediately.
      
      Login URL: ${process.env.FRONTEND_URL || 'http://localhost:8080'}/login
      ===============================================
    `);
        // In production:
        // await this.emailService.send({
        //   to: email,
        //   subject: `Welcome to ${data.churchName}`,
        //   template: 'staff-invitation',
        //   data: {
        //     ...data,
        //     loginUrl: `${process.env.FRONTEND_URL}/login`,
        //   },
        // });
    }
}
exports.ProfileService = ProfileService;
//# sourceMappingURL=ProfileService.js.map