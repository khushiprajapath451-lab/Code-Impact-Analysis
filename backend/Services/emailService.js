import 'dotenv/config';
import nodemailer from 'nodemailer';

// Configure SMTP transport from environment variables or create test transporter
const createTransporter = async () => {
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, '');

  if (emailUser && emailPass) {
    // If Gmail is used, 'service: gmail' is the most reliable configuration
    const isGmail = (process.env.EMAIL_HOST || '').includes('gmail') || emailUser.endsWith('@gmail.com');
    
    if (isGmail) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
  }

  // Fallback: Ethereal simulated test account for development if no SMTP configured
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

export const sendPasswordResetEmail = async (toEmail, resetCode) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"CodeSense AI Security" <${process.env.EMAIL_USER || 'no-reply@codesense.ai'}>`,
      to: toEmail,
      subject: 'Your CodeSense AI Password Reset Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #334155;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 24px;">CodeSense AI</h1>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Codebase Impact & Intelligence Platform</p>
          </div>

          <div style="background: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #475569; text-align: center;">
            <h2 style="color: #f8fafc; font-size: 18px; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
              We received a request to reset the password for your CodeSense AI account (<strong>${toEmail}</strong>).
            </p>
            
            <p style="color: #94a3b8; font-size: 13px; margin-bottom: 8px;">Use the 6-digit verification OTP below:</p>
            
            <div style="display: inline-block; padding: 14px 28px; background: #0f172a; border: 2px dashed #6366f1; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8; margin: 12px 0;">
              ${resetCode}
            </div>

            <p style="color: #ef4444; font-size: 12px; margin-top: 12px;">
              ⏱️ This code will expire in <strong>15 minutes</strong>.
            </p>
          </div>

          <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 20px; text-align: center;">
            If you did not request a password reset, please ignore this email or notify your system administrator. Your account remains secure.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Password reset email dispatched to [${toEmail}]: Message ID = ${info.messageId}`);
    
    // If using Ethereal test mailbox, log the preview URL for developer inspection
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 Email Preview URL: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error('Error sending reset email via nodemailer:', error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};
