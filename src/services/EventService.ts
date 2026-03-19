// src/services/EventService.ts
import { EventRepository } from '@repositories/EventRepository';
import { MemberRepository } from '@repositories/MemberRepository';
import { AppError } from '@utils/AppError';
import {
    Event,
    EventInstance,
    EventInstanceWithDetails,
    EventRegistration,
    CreateEventDTO,
    UpdateEventDTO,
    CreateEventInstanceDTO,
    UpdateEventInstanceDTO,
    CreateRegistrationDTO,
    ShareEventDTO,
    EventFilters,
    EventStatistics,
    PaginatedEvents,
    CheckInDTO,
    CheckInResult,
} from '@/dtos/event.types';
import QRCode from 'qrcode';
import logger from '@config/logger';

export class EventService {
    private eventRepository: EventRepository;
    private memberRepository: MemberRepository;

    constructor() {
        this.eventRepository = new EventRepository();
        this.memberRepository = new MemberRepository();
    }

    // ============================================================================
    // EVENTS
    // ============================================================================

    async createEvent(churchId: string, data: CreateEventDTO, createdBy?: string): Promise<Event> {
        try {
            const event = await this.eventRepository.create(churchId, data, createdBy);

            if (data.ticketTypes && data.ticketTypes.length > 0) {
                for (const ticketType of data.ticketTypes) {
                    await this.eventRepository.createTicketType(event.id, ticketType);
                }
            }

            logger.info(`Event created: ${event.name} (${event.id}) for church ${churchId}`);
            return event;
        } catch (error) {
            logger.error('Error creating event:', error);
            throw error;
        }
    }

    async getEventById(id: string, churchId: string): Promise<Event> {
        const event = await this.eventRepository.findById(id, churchId);
        if (!event) {
            throw new AppError('Event not found', 404);
        }
        return event;
    }

    async getEventByQRCode(qrCode: string): Promise<Event> {
        const event = await this.eventRepository.findByQRCode(qrCode);
        if (!event) {
            throw new AppError('Event not found or inactive', 404);
        }
        return event;
    }

    async getAllEvents(filters: EventFilters): Promise<PaginatedEvents> {
        return this.eventRepository.findAll(filters);
    }

    async updateEvent(id: string, churchId: string, data: UpdateEventDTO): Promise<Event> {
        await this.getEventById(id, churchId);

        const event = await this.eventRepository.update(id, churchId, data);
        if (!event) {
            throw new AppError('Failed to update event', 500);
        }

        logger.info(`Event updated: ${event.name} (${id})`);
        return event;
    }

    async deleteEvent(id: string, churchId: string): Promise<void> {
        await this.getEventById(id, churchId);
        await this.eventRepository.delete(id, churchId);
        logger.info(`Event deleted: ${id}`);
    }

    async getEventQRCode(id: string, churchId: string): Promise<string> {
        const event = await this.getEventById(id, churchId);
        const checkinUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkin/${event.qrCode}`;
        return QRCode.toDataURL(checkinUrl);
    }

    async getStatistics(churchId: string): Promise<EventStatistics> {
        return this.eventRepository.getStatistics(churchId);
    }

    // ============================================================================
    // EVENT INSTANCES
    // ============================================================================

    async createEventInstance(churchId: string, data: CreateEventInstanceDTO): Promise<EventInstance> {
        const event = await this.getEventById(data.eventId, churchId);

        const instanceData = {
            ...data,
            startTime: data.startTime || event.startTime,
            endTime: data.endTime || event.endTime,
        };

        const instance = await this.eventRepository.createInstance(churchId, instanceData);
        logger.info(`Event instance created for ${event.name} on ${data.instanceDate}`);
        return instance;
    }

    async getEventInstances(eventId: string, churchId: string, options?: { upcoming?: boolean; limit?: number }): Promise<EventInstance[]> {
        await this.getEventById(eventId, churchId);
        return this.eventRepository.findInstances(eventId, churchId, options);
    }

    async getEventInstanceById(instanceId: string, churchId: string): Promise<EventInstanceWithDetails> {
        const instance = await this.eventRepository.findInstanceById(instanceId, churchId);
        if (!instance) {
            throw new AppError('Event instance not found', 404);
        }
        return instance;
    }

    async getEventInstanceByQRCode(qrCode: string): Promise<EventInstanceWithDetails> {
        const instance = await this.eventRepository.findInstanceByQRCode(qrCode);
        if (!instance) {
            throw new AppError('Event not found or QR code expired', 404);
        }

        if (instance.status === 'cancelled') {
            throw new AppError('This event has been cancelled', 400);
        }

        if (instance.status === 'completed') {
            throw new AppError('This event has already ended', 400);
        }

        return instance;
    }

    async updateEventInstance(instanceId: string, churchId: string, data: UpdateEventInstanceDTO): Promise<EventInstance> {
        const instance = await this.eventRepository.updateInstance(instanceId, churchId, data);
        if (!instance) {
            throw new AppError('Failed to update event instance', 500);
        }
        return instance;
    }

    async getInstanceQRCode(instanceId: string, churchId: string): Promise<string> {
        const instance = await this.getEventInstanceById(instanceId, churchId);
        const checkinUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkin/instance/${instance.qrCode}`;
        return QRCode.toDataURL(checkinUrl);
    }

    async startEvent(eventId: string, churchId: string): Promise<EventInstance> {
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

    async registerForEvent(churchId: string, data: CreateRegistrationDTO): Promise<EventRegistration> {
        const event = await this.getEventById(data.eventId, churchId);

        if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
            throw new AppError('Registration deadline has passed', 400);
        }

        if (event.maxRegistrations && event.currentRegistrations >= event.maxRegistrations) {
            throw new AppError('Event is fully booked', 400);
        }

        if (data.memberId) {
            const member = await this.memberRepository.findById(data.memberId, churchId);
            if (!member) {
                throw new AppError('Member not found', 404);
            }
        }

        const registration = await this.eventRepository.createRegistration(churchId, data);
        logger.info(`Registration created for event ${event.name}: ${registration.confirmationCode}`);

        return registration;
    }

    async getRegistrations(eventId: string, churchId: string, options?: {
        status?: string;
        paymentStatus?: string;
        page?: number;
        limit?: number;
    }): Promise<{ registrations: EventRegistration[]; total: number }> {
        await this.getEventById(eventId, churchId);
        return this.eventRepository.findRegistrations(eventId, options);
    }

    async getRegistrationById(registrationId: string): Promise<EventRegistration> {
        const registration = await this.eventRepository.findRegistrationById(registrationId);
        if (!registration) {
            throw new AppError('Registration not found', 404);
        }
        return registration;
    }

    async cancelRegistration(registrationId: string, churchId: string): Promise<void> {
        const registration = await this.getRegistrationById(registrationId);

        if (registration.churchId !== churchId) {
            throw new AppError('Unauthorized', 403);
        }

        if (registration.status === 'cancelled') {
            throw new AppError('Registration already cancelled', 400);
        }

        await this.eventRepository.cancelRegistration(registrationId);
        logger.info(`Registration cancelled: ${registrationId}`);
    }

    async processPayment(registrationId: string, paymentData: {
        paymentStatus: string;
        paymentReference?: string;
        amountPaid?: number;
        transactionId?: string;
        paymentMethod?: string;
    }): Promise<EventRegistration> {
        const registration = await this.eventRepository.updateRegistrationPayment(registrationId, paymentData);
        if (!registration) {
            throw new AppError('Registration not found', 404);
        }

        logger.info(`Payment processed for registration ${registrationId}: ${paymentData.paymentStatus}`);
        return registration;
    }

    // ============================================================================
    // CHECK-IN
    // ============================================================================

    async checkIn(churchId: string, data: CheckInDTO, checkedInBy?: string): Promise<CheckInResult> {
        try {
            let registration: EventRegistration | null = null;
            let instance: EventInstanceWithDetails | null = null;

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
                    registration: updatedRegistration!,
                    attendee: {
                        name: registration.memberName || registration.guestName || 'Guest',
                        type: registration.memberId ? 'member' : 'guest',
                    },
                };
            }

            if (instance && (data.guestName || data.memberId)) {
                const event = await this.eventRepository.findById(instance.eventId);

                if (!event?.allowGuestCheckin && !data.memberId) {
                    throw new AppError('Guest check-in is not allowed for this event', 403);
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

            throw new AppError('Invalid check-in data', 400);
        } catch (error) {
            logger.error('Check-in error:', error);
            throw error;
        }
    }

    // ============================================================================
    // SHARING
    // ============================================================================

    async shareEvent(eventId: string, churchId: string, data: ShareEventDTO, sharedBy?: string): Promise<{
        success: boolean;
        message: string;
        shareMessage?: string;
        recipientCount: number;
    }> {
        const event = await this.getEventById(eventId, churchId);

        let recipients: Array<{ email?: string; phone?: string; name: string }> = [];

        if (data.includeAllMembers) {
            const result = await this.memberRepository.findAll({ churchId, limit: 1000 });
            recipients = result.members.map(m => ({
                email: m.email,
                phone: m.phone,
                name: `${m.first_name} ${m.last_name}`,
            }));
        } else if (data.recipientIds?.length) {
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

        logger.info(`Event ${eventId} shared via ${data.shareType} to ${recipients.length} recipients`);

        return {
            success: true,
            message: `Event shared via ${data.shareType} to ${recipients.length} recipient(s)`,
            shareMessage,
            recipientCount: recipients.length,
        };
    }

    private generateEventShareMessage(event: Event, customMessage?: string, includeRegistrationLink: boolean = true): string {
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
                const platformNames: Record<string, string> = {
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

    async getTicketTypes(eventId: string, churchId: string): Promise<any[]> {
        await this.getEventById(eventId, churchId);
        return this.eventRepository.getTicketTypes(eventId);
    }
}