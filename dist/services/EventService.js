"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventService = void 0;
// src/services/EventService.ts
const EventRepository_1 = require("@repositories/EventRepository");
const MemberRepository_1 = require("@repositories/MemberRepository");
const AppError_1 = require("@utils/AppError");
const qrcode_1 = __importDefault(require("qrcode"));
const logger_1 = __importDefault(require("@config/logger"));
class EventService {
    constructor() {
        this.eventRepository = new EventRepository_1.EventRepository();
        this.memberRepository = new MemberRepository_1.MemberRepository();
    }
    // ============================================================================
    // EVENTS
    // ============================================================================
    async createEvent(churchId, data, createdBy) {
        try {
            const event = await this.eventRepository.create(churchId, data, createdBy);
            if (data.ticketTypes && data.ticketTypes.length > 0) {
                for (const ticketType of data.ticketTypes) {
                    await this.eventRepository.createTicketType(event.id, ticketType);
                }
            }
            logger_1.default.info(`Event created: ${event.name} (${event.id}) for church ${churchId}`);
            return event;
        }
        catch (error) {
            logger_1.default.error('Error creating event:', error);
            throw error;
        }
    }
    async getEventById(id, churchId) {
        const event = await this.eventRepository.findById(id, churchId);
        if (!event) {
            throw new AppError_1.AppError('Event not found', 404);
        }
        return event;
    }
    async getEventByQRCode(qrCode) {
        const event = await this.eventRepository.findByQRCode(qrCode);
        if (!event) {
            throw new AppError_1.AppError('Event not found or inactive', 404);
        }
        return event;
    }
    async getAllEvents(filters) {
        return this.eventRepository.findAll(filters);
    }
    async updateEvent(id, churchId, data) {
        await this.getEventById(id, churchId);
        const event = await this.eventRepository.update(id, churchId, data);
        if (!event) {
            throw new AppError_1.AppError('Failed to update event', 500);
        }
        logger_1.default.info(`Event updated: ${event.name} (${id})`);
        return event;
    }
    async deleteEvent(id, churchId) {
        await this.getEventById(id, churchId);
        await this.eventRepository.delete(id, churchId);
        logger_1.default.info(`Event deleted: ${id}`);
    }
    async getEventQRCode(id, churchId) {
        const event = await this.getEventById(id, churchId);
        const checkinUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkin/${event.qrCode}`;
        return qrcode_1.default.toDataURL(checkinUrl);
    }
    async getStatistics(churchId) {
        return this.eventRepository.getStatistics(churchId);
    }
    // ============================================================================
    // EVENT INSTANCES
    // ============================================================================
    async createEventInstance(churchId, data) {
        const event = await this.getEventById(data.eventId, churchId);
        const instanceData = {
            ...data,
            startTime: data.startTime || event.startTime,
            endTime: data.endTime || event.endTime,
        };
        const instance = await this.eventRepository.createInstance(churchId, instanceData);
        logger_1.default.info(`Event instance created for ${event.name} on ${data.instanceDate}`);
        return instance;
    }
    async getEventInstances(eventId, churchId, options) {
        await this.getEventById(eventId, churchId);
        return this.eventRepository.findInstances(eventId, churchId, options);
    }
    async getEventInstanceById(instanceId, churchId) {
        const instance = await this.eventRepository.findInstanceById(instanceId, churchId);
        if (!instance) {
            throw new AppError_1.AppError('Event instance not found', 404);
        }
        return instance;
    }
    async getEventInstanceByQRCode(qrCode) {
        const instance = await this.eventRepository.findInstanceByQRCode(qrCode);
        if (!instance) {
            throw new AppError_1.AppError('Event not found or QR code expired', 404);
        }
        if (instance.status === 'cancelled') {
            throw new AppError_1.AppError('This event has been cancelled', 400);
        }
        if (instance.status === 'completed') {
            throw new AppError_1.AppError('This event has already ended', 400);
        }
        return instance;
    }
    async updateEventInstance(instanceId, churchId, data) {
        const instance = await this.eventRepository.updateInstance(instanceId, churchId, data);
        if (!instance) {
            throw new AppError_1.AppError('Failed to update event instance', 500);
        }
        return instance;
    }
    async getInstanceQRCode(instanceId, churchId) {
        const instance = await this.getEventInstanceById(instanceId, churchId);
        const checkinUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkin/instance/${instance.qrCode}`;
        return qrcode_1.default.toDataURL(checkinUrl);
    }
    async startEvent(eventId, churchId) {
        const event = await this.getEventById(eventId, churchId);
        const today = new Date().toISOString().split('T')[0];
        const instance = await this.createEventInstance(churchId, {
            eventId,
            instanceDate: today,
            startTime: event.startTime,
            endTime: event.endTime,
        });
        await this.eventRepository.updateInstance(instance.id, churchId, { status: 'ongoing' });
        return instance;
    }
    // ============================================================================
    // REGISTRATIONS
    // ============================================================================
    async registerForEvent(churchId, data) {
        const event = await this.getEventById(data.eventId, churchId);
        if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
            throw new AppError_1.AppError('Registration deadline has passed', 400);
        }
        if (event.maxRegistrations && event.currentRegistrations >= event.maxRegistrations) {
            throw new AppError_1.AppError('Event is fully booked', 400);
        }
        if (data.memberId) {
            const member = await this.memberRepository.findById(data.memberId, churchId);
            if (!member) {
                throw new AppError_1.AppError('Member not found', 404);
            }
        }
        const registration = await this.eventRepository.createRegistration(churchId, data);
        logger_1.default.info(`Registration created for event ${event.name}: ${registration.confirmationCode}`);
        return registration;
    }
    async getRegistrations(eventId, churchId, options) {
        await this.getEventById(eventId, churchId);
        return this.eventRepository.findRegistrations(eventId, options);
    }
    async getRegistrationById(registrationId) {
        const registration = await this.eventRepository.findRegistrationById(registrationId);
        if (!registration) {
            throw new AppError_1.AppError('Registration not found', 404);
        }
        return registration;
    }
    async cancelRegistration(registrationId, churchId) {
        const registration = await this.getRegistrationById(registrationId);
        if (registration.churchId !== churchId) {
            throw new AppError_1.AppError('Unauthorized', 403);
        }
        if (registration.status === 'cancelled') {
            throw new AppError_1.AppError('Registration already cancelled', 400);
        }
        await this.eventRepository.cancelRegistration(registrationId);
        logger_1.default.info(`Registration cancelled: ${registrationId}`);
    }
    async processPayment(registrationId, paymentData) {
        const registration = await this.eventRepository.updateRegistrationPayment(registrationId, paymentData);
        if (!registration) {
            throw new AppError_1.AppError('Registration not found', 404);
        }
        logger_1.default.info(`Payment processed for registration ${registrationId}: ${paymentData.paymentStatus}`);
        return registration;
    }
    // ============================================================================
    // CHECK-IN
    // ============================================================================
    async checkIn(churchId, data, checkedInBy) {
        try {
            let registration = null;
            let instance = null;
            if (data.qrCode) {
                registration = await this.eventRepository.findRegistrationByQRCode(data.qrCode);
                if (!registration) {
                    instance = await this.eventRepository.findInstanceByQRCode(data.qrCode);
                }
            }
            if (data.registrationId) {
                registration = await this.eventRepository.findRegistrationById(data.registrationId);
            }
            if (registration) {
                if (registration.checkedIn) {
                    return {
                        success: false,
                        message: 'Already checked in',
                        registration,
                        attendee: {
                            name: registration.memberName || registration.guestName || 'Guest',
                            type: registration.memberId ? 'member' : 'guest',
                        },
                    };
                }
                const updatedRegistration = await this.eventRepository.checkIn(registration.id, checkedInBy);
                return {
                    success: true,
                    message: 'Check-in successful',
                    registration: updatedRegistration,
                    attendee: {
                        name: registration.memberName || registration.guestName || 'Guest',
                        type: registration.memberId ? 'member' : 'guest',
                    },
                };
            }
            if (instance && (data.guestName || data.memberId)) {
                const event = await this.eventRepository.findById(instance.eventId);
                if (!event?.allowGuestCheckin && !data.memberId) {
                    throw new AppError_1.AppError('Guest check-in is not allowed for this event', 403);
                }
                const newRegistration = await this.eventRepository.createRegistration(churchId, {
                    eventId: instance.eventId,
                    eventInstanceId: instance.id,
                    memberId: data.memberId,
                    guestName: data.guestName,
                    guestEmail: data.guestEmail,
                    guestPhone: data.guestPhone,
                });
                await this.eventRepository.checkIn(newRegistration.id, checkedInBy);
                return {
                    success: true,
                    message: 'Walk-in check-in successful',
                    registration: newRegistration,
                    attendee: {
                        name: data.guestName || 'Member',
                        type: data.memberId ? 'member' : 'guest',
                    },
                };
            }
            throw new AppError_1.AppError('Invalid check-in data', 400);
        }
        catch (error) {
            logger_1.default.error('Check-in error:', error);
            throw error;
        }
    }
    // ============================================================================
    // SHARING
    // ============================================================================
    async shareEvent(eventId, churchId, data, sharedBy) {
        const event = await this.getEventById(eventId, churchId);
        let recipients = [];
        if (data.includeAllMembers) {
            const result = await this.memberRepository.findAll({ churchId, limit: 1000 });
            recipients = result.members.map(m => ({
                email: m.email,
                phone: m.phone,
                name: `${m.first_name} ${m.last_name}`,
            }));
        }
        else if (data.recipientIds?.length) {
            for (const memberId of data.recipientIds) {
                const member = await this.memberRepository.findById(memberId, churchId);
                if (member) {
                    recipients.push({
                        email: member.email,
                        phone: member.phone,
                        name: `${member.first_name} ${member.last_name}`,
                    });
                }
            }
        }
        if (data.recipientEmails) {
            recipients.push(...data.recipientEmails.map(email => ({ email, name: email })));
        }
        if (data.recipientPhones) {
            recipients.push(...data.recipientPhones.map(phone => ({ phone, name: phone })));
        }
        const shareMessage = this.generateEventShareMessage(event, data.customMessage, data.includeRegistrationLink);
        await this.eventRepository.createShare(churchId, eventId, {
            shareType: data.shareType,
            sharedBy,
            recipientCount: recipients.length,
            customMessage: data.customMessage,
        });
        if (data.shareType === 'whatsapp') {
            return {
                success: true,
                message: 'Share message generated',
                shareMessage,
                recipientCount: recipients.length,
            };
        }
        logger_1.default.info(`Event ${eventId} shared via ${data.shareType} to ${recipients.length} recipients`);
        return {
            success: true,
            message: `Event shared via ${data.shareType} to ${recipients.length} recipient(s)`,
            shareMessage,
            recipientCount: recipients.length,
        };
    }
    generateEventShareMessage(event, customMessage, includeRegistrationLink = true) {
        let message = `🎉 *${event.name}*\n\n`;
        if (event.description) {
            message += `${event.description}\n\n`;
        }
        message += `📅 *Date:* ${new Date(event.startDate).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })}\n`;
        message += `⏰ *Time:* ${event.startTime}`;
        if (event.endTime) {
            message += ` - ${event.endTime}`;
        }
        message += `\n`;
        if (event.locationType === 'physical' || event.locationType === 'hybrid') {
            if (event.locationName) {
                message += `📍 *Location:* ${event.locationName}\n`;
            }
            if (event.locationAddress) {
                message += `${event.locationAddress}\n`;
            }
        }
        if (event.locationType === 'online' || event.locationType === 'hybrid') {
            message += `💻 *Online Event*\n`;
            if (event.onlinePlatform) {
                const platformNames = {
                    zoom: 'Zoom',
                    google_meet: 'Google Meet',
                    microsoft_teams: 'Microsoft Teams',
                    youtube: 'YouTube Live',
                    facebook: 'Facebook Live',
                };
                message += `Platform: ${platformNames[event.onlinePlatform] || event.onlinePlatform}\n`;
            }
            if (event.meetingLink) {
                message += `🔗 Link: ${event.meetingLink}\n`;
            }
        }
        if (event.isPaid && event.price) {
            message += `\n💰 *Price:* ${event.currency} ${event.price.toFixed(2)}\n`;
            if (event.earlyBirdPrice && event.earlyBirdDeadline && new Date() < new Date(event.earlyBirdDeadline)) {
                message += `🐦 *Early Bird:* ${event.currency} ${event.earlyBirdPrice.toFixed(2)} (until ${new Date(event.earlyBirdDeadline).toLocaleDateString()})\n`;
            }
        }
        if (customMessage) {
            message += `\n💬 ${customMessage}\n`;
        }
        if (includeRegistrationLink && event.isRegistrationRequired) {
            const registrationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event.id}/register`;
            message += `\n📝 *Register here:* ${registrationUrl}\n`;
        }
        return message;
    }
    // ============================================================================
    // TICKET TYPES
    // ============================================================================
    async getTicketTypes(eventId, churchId) {
        await this.getEventById(eventId, churchId);
        return this.eventRepository.getTicketTypes(eventId);
    }
}
exports.EventService = EventService;
//# sourceMappingURL=EventService.js.map