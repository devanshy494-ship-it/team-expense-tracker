const SIB_API_KEY = process.env.BREVO_API_KEY;

export async function sendVerificationEmail(toEmail, name, token) {
  const verifyUrl = `${process.env.CLIENT_ORIGIN}/verify-email?token=${token}`;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': SIB_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: 'ExpenseIQ', email: 'devanshy494@gmail.com' },
      to: [{ email: toEmail, name }],
      subject: 'Verify your ExpenseIQ account',
      htmlContent: `
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
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    console.error('✗ EMAIL SEND FAILED:', err);
    throw new Error(`Email delivery failed: ${err.message}`);
  }

  console.log('✓ Verification email sent to:', toEmail);
}