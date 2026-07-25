const nodemailer = require('nodemailer');

// Create transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  }
});

/**
 * Send verification code email
 * @param {string} to - Recipient email
 * @param {string} code - 6-digit verification code
 * @param {string} name - User's name
 */
async function sendVerificationEmail(to, code, name) {
  const mailOptions = {
    from: {
      name: 'MSF SMM Panel',
      address: process.env.EMAIL_USER || 'your-email@gmail.com'
    },
    to: to,
    subject: '🔐 Verify Your Email - MSF SMM Panel',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">MSF SMM Panel</h1>
                    <p style="margin: 10px 0 0; color: #ffffff; font-size: 14px;">Email Verification</p>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">Hello ${name}!</h2>
                    <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                      Thank you for registering with MSF SMM Panel. To complete your registration, please use the verification code below:
                    </p>
                    
                    <!-- Verification Code Box -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                      <tr>
                        <td align="center" style="padding: 30px; background-color: #f8f9fa; border-radius: 8px; border: 2px dashed #667eea;">
                          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">
                            ${code}
                          </div>
                          <p style="margin: 15px 0 0; color: #999999; font-size: 12px;">
                            This code will expire in 10 minutes
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 20px 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                      If you didn't create an account with MSF SMM Panel, please ignore this email.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      © ${new Date().getFullYear()} MSF SMM Panel. All rights reserved.
                    </p>
                    <p style="margin: 10px 0 0; color: #999999; font-size: 12px;">
                      This is an automated email, please do not reply.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Hello ${name}!\n\nYour verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't create an account with MSF SMM Panel, please ignore this email.\n\n© ${new Date().getFullYear()} MSF SMM Panel`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send failed:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendVerificationEmail
};
