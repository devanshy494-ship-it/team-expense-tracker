import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendVerificationEmail(toEmail, name, token) {
  const verifyUrl = `${process.env.CLIENT_ORIGIN}/verify-email?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"ExpenseIQ" <${process.env.FROM_EMAIL}>`,
      to: toEmail,
      subject: 'Verify your ExpenseIQ account',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0d0d;border-radius:12px;">
          <h2 style="font-size:22px;font-weight:700;color:#f0ede8;">
            Expense<span style="color:#c2ff72">IQ</span>
          </h2>
          <p style="color:#888;margin-bottom:24px;">
            Hey ${name}, verify your email to activate your account.
          </p>
          <a href="${verifyUrl}"
             style="display:inline-block;background:#c2ff72;color:#0a1a00;
                    padding:12px 28px;border-radius:8px;font-weight:600;
                    text-decoration:none;font-size:15px;">
            Verify my email
          </a>
          <p style="color:#555;font-size:12px;margin-top:24px;">
            This link expires in 24 hours.<br/>
            If you didn't sign up, ignore this email.
          </p>
        </div>
      `,
    });
    console.log('✓ Verification email sent to:', toEmail);
  } catch (error) {
    console.error('✗ EMAIL SEND FAILED:', error.message);
    console.error('  GMAIL_USER:', process.env.GMAIL_USER ? '✓ Set' : '✗ Missing');
    console.error('  GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '✓ Set' : '✗ Missing');
    console.error('  FROM_EMAIL:', process.env.FROM_EMAIL ? '✓ Set' : '✗ Missing');
    throw new Error(`Email delivery failed: ${error.message}`);
  }
}
