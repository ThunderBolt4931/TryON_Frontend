import nodemailer from 'nodemailer';

const EMAIL_SENDER = process.env.EMAIL_SENDER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: EMAIL_SENDER,
        pass: EMAIL_PASSWORD,
    },
});

export function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationEmail(
    toEmail: string,
    code: string
): Promise<{ success: boolean; message: string }> {
    if (!EMAIL_SENDER || !EMAIL_PASSWORD) {
        return { success: false, message: 'Server Error: Email Not Configured.' };
    }

    try {
        await transporter.sendMail({
            from: EMAIL_SENDER,
            to: toEmail,
            subject: 'Your Verification Code',
            text: `Your Verification Code is: ${code}`,
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #1f2937; color: #ffffff;">
          <h2 style="color: #ff7c00;">Virtual Try-On Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #ff7c00; font-size: 32px; letter-spacing: 5px;">${code}</h1>
          <p style="color: #9ca3af;">This code will expire in 10 minutes.</p>
        </div>
      `,
        });

        return { success: true, message: 'Code sent!' };
    } catch (error) {
        console.error('Email Error:', error);
        return { success: false, message: `Email Failed: ${String(error)}` };
    }
}
