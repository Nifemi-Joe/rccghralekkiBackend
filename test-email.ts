// test-email.ts
import dotenv from 'dotenv';
dotenv.config();

import { emailService } from './src/services/EmailService';

async function testEmail() {
    console.log('🧪 Testing RCCG Email Configuration...\n');

    // Test 1: Verify SMTP Connection
    console.log('1️⃣ Verifying SMTP connection to rccghralekki.com...');
    try {
        const isConnected = await emailService.verifyConnection();
        console.log(isConnected ? '   ✅ SMTP connection successful!\n' : '   ❌ SMTP connection failed\n');
    } catch (error: any) {
        console.log(`   ❌ Connection error: ${error.message}\n`);
        return;
    }

    // Test 2: Send Test Email
    console.log('2️⃣ Sending test email...');
    try {
        const result = await emailService.sendEmail({
            to: 'your-personal-email@gmail.com', // ← CHANGE THIS to your email
            subject: '✅ RCCG Halekki - Email Test Successful',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #2563eb;">🎉 Email Configuration Working!</h1>
                    <p>Congratulations! Your RCCG Halekki email system is properly configured.</p>
                    <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Configuration Details:</strong></p>
                        <ul style="margin: 10px 0;">
                            <li>SMTP Server: rccghralekki.com</li>
                            <li>Port: 465 (SSL)</li>
                            <li>From: info@rccghralekki.com</li>
                        </ul>
                    </div>
                    <p style="color: #666;">If you received this email, everything is working perfectly! ✅</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="color: #9ca3af; font-size: 12px;">
                        Sent from RCCG Halekki Church Management System
                    </p>
                </div>
            `,
            text: 'Congratulations! Your RCCG Halekki email system is working perfectly!'
        });

        if (result.success) {
            console.log('   ✅ Email sent successfully!');
            console.log(`   📧 Message ID: ${result.messageId}\n`);
            console.log('👉 Check your inbox (and spam folder) for the test email.');
        } else {
            console.log(`   ❌ Failed to send email: ${result.error}`);
        }
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    process.exit(0);
}

testEmail().catch(console.error);