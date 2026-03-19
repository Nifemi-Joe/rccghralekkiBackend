import { Router } from 'express';
import authRoutes from './auth.routes';
import churchRoutes from './church.routes';
import memberRoutes from './member.routes';
import eventRoutes from './event.routes';
import attendanceRoutes from './attendance.routes';
import financialRoutes from './financial.routes';
import reportRoutes from './report.routes';
import groupRoutes from './group.routes';
import familyRoutes from './family.routes';
import serviceReportRoutes from './serviceReport.routes';
import notificationRoutes from './notification.routes';
import firstTimerRoutes from "@/routes/firstTimer.routes";
import registrationRoutes from './registrationRoutes';
import profileRoutes from './profileRoutes';
import userProfileRoutes from './user-profileRoutes';
import userNotificationRoutes from './notificationRoutes';
import auditLogRoutes from './auditLogRoutes';
import supportRoutes from './supportRoutes';
import celebrationRoutes from './celebrationRoutes';
// import webhookRoutes from './webhook.routes';
import memberSelfUpdateRoutes from './memberSelfUpdateRoutes';
import smsRoutes from './sms.routes'
import emailRoutes from './email.routes';
import whatsappRoutes from './whatsapp.routes';
import voiceRoutes from './voice.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/church', churchRoutes);
router.use('/members', memberRoutes);
router.use('/events', eventRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/financials', financialRoutes);
router.use('/reports', reportRoutes);
router.use('/groups', groupRoutes);
router.use('/families', familyRoutes);
router.use('/first-timers', firstTimerRoutes);
router.use('/service-reports', serviceReportRoutes);
router.use('/notifications', userNotificationRoutes);
router.use('/registrations', registrationRoutes);
router.use('/profile', userProfileRoutes);
router.use('/send-notifications', notificationRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/support', supportRoutes);
router.use('/celebrations', celebrationRoutes);
router.use('/member-self-update', memberSelfUpdateRoutes);
router.use('/sms', smsRoutes);
router.use(`/email`, emailRoutes);
router.use(`/whatsapp`, whatsappRoutes);
router.use(`/voice`, voiceRoutes);
// router.use('/webhooks', webhookRoutes);

// Profile completion routes (public)
router.use('/', profileRoutes);

export default router;
