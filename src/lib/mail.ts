import nodemailer from "nodemailer";

// Create a generic transporter
// If SMTP_HOST is not provided, it will just log to console (useful for development)
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  : null;

export async function sendVerificationEmail(email: string, otp: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
      <h2 style="color: #333; text-align: center;">Welcome to Personal OS</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">
        You are trying to register a new account. Please use the verification code below to complete your registration.
      </p>
      <div style="background-color: #f4f4f5; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #18181b;">${otp}</span>
      </div>
      <p style="color: #888; font-size: 14px; text-align: center;">
        This code will expire in 10 minutes. If you did not request this, please ignore this email.
      </p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Personal OS" <noreply@personal-os.com>',
      to: email,
      subject: "Your Verification Code - Personal OS",
      html,
    });
  } else {
    console.log(`[MOCK EMAIL] OTP: ${otp}`);
  }
}
