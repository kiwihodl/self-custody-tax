// Email service using Resend
import { Resend } from 'resend';

// Singleton Resend instance
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

// Email configuration
const FROM_EMAIL = 'Self Custody Tax <noreply@selfcustodytax.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send advisor invitation email to a client
 */
export async function sendAdvisorInvitationEmail(params: {
  to: string;
  advisorName: string;
  advisorEmail: string;
  invitationToken: string;
  permissionLevel: 'view' | 'manage';
  note?: string;
}): Promise<SendEmailResult> {
  const { to, advisorName, advisorEmail, invitationToken, permissionLevel, note } = params;

  const inviteUrl = `${APP_URL}/invite/${invitationToken}`;
  const permissionText = permissionLevel === 'manage'
    ? 'view and manage your portfolio'
    : 'view your portfolio';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Advisor Invitation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 560px; border-collapse: collapse;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="${APP_URL}/logo-icon.png" alt="Self Custody Tax" width="48" height="48" style="display: block;">
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #18181b; border-radius: 12px; padding: 32px; border: 1px solid #27272a;">
              <!-- Header -->
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #fafafa; text-align: center;">
                Advisor Invitation
              </h1>

              <p style="margin: 0 0 24px; font-size: 16px; color: #a1a1aa; text-align: center; line-height: 1.5;">
                <strong style="color: #fafafa;">${advisorName || advisorEmail}</strong> has invited you to connect as a client on Self Custody Tax.
              </p>

              <!-- Permission Info -->
              <div style="background-color: #27272a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #a1a1aa;">
                  If you accept, they will be able to <strong style="color: #fafafa;">${permissionText}</strong> to help manage your Bitcoin tax reporting.
                </p>
              </div>

              ${note ? `
              <!-- Personal Note -->
              <div style="background-color: #27272a; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 3px solid #f97316;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px;">
                  Message from ${advisorName || 'your advisor'}
                </p>
                <p style="margin: 0; font-size: 14px; color: #fafafa; font-style: italic;">
                  "${note}"
                </p>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <a href="${inviteUrl}" style="display: inline-block; background-color: #f97316; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      View Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Note -->
              <p style="margin: 24px 0 0; font-size: 12px; color: #71717a; text-align: center; line-height: 1.5;">
                Your advisor will never have access to your private keys and cannot move any funds. You can revoke their access at any time.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #52525b;">
                This invitation expires in 7 days.
              </p>
              <p style="margin: 0; font-size: 12px; color: #52525b;">
                If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Advisor Invitation from ${advisorName || advisorEmail}

${advisorName || advisorEmail} has invited you to connect as a client on Self Custody Tax.

If you accept, they will be able to ${permissionText} to help manage your Bitcoin tax reporting.

${note ? `Message from your advisor: "${note}"\n\n` : ''}
Accept invitation: ${inviteUrl}

Your advisor will never have access to your private keys and cannot move any funds. You can revoke their access at any time.

This invitation expires in 7 days.

If you didn't expect this email, you can safely ignore it.
  `.trim();

  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${advisorName || advisorEmail} invited you to connect on Self Custody Tax`,
      html,
      text,
      tags: [
        { name: 'category', value: 'advisor-invitation' },
      ],
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Failed to send email:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error sending email'
    };
  }
}

/**
 * Send notification to advisor when client accepts invitation
 */
export async function sendInvitationAcceptedEmail(params: {
  to: string;
  clientName: string;
  clientEmail: string;
}): Promise<SendEmailResult> {
  const { to, clientName, clientEmail } = params;

  const dashboardUrl = `${APP_URL}/advisor/dashboard`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Client Connected</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 560px; border-collapse: collapse;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="${APP_URL}/logo-icon.png" alt="Self Custody Tax" width="48" height="48" style="display: block;">
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #18181b; border-radius: 12px; padding: 32px; border: 1px solid #27272a;">
              <!-- Success Icon -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background-color: #16a34a20; border-radius: 50%; padding: 16px;">
                  <div style="width: 32px; height: 32px; color: #22c55e; font-size: 32px; line-height: 32px;">&#10003;</div>
                </div>
              </div>

              <!-- Header -->
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #fafafa; text-align: center;">
                Client Connected!
              </h1>

              <p style="margin: 0 0 24px; font-size: 16px; color: #a1a1aa; text-align: center; line-height: 1.5;">
                <strong style="color: #fafafa;">${clientName || clientEmail}</strong> has accepted your invitation and is now connected to your advisor dashboard.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <a href="${dashboardUrl}" style="display: inline-block; background-color: #f97316; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      View Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #52525b;">
                Self Custody Tax - Bitcoin Tax Tracking Made Simple
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Client Connected!

${clientName || clientEmail} has accepted your invitation and is now connected to your advisor dashboard.

View your dashboard: ${dashboardUrl}

Self Custody Tax - Bitcoin Tax Tracking Made Simple
  `.trim();

  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${clientName || clientEmail} has connected to your account`,
      html,
      text,
      tags: [
        { name: 'category', value: 'invitation-accepted' },
      ],
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Failed to send email:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error sending email'
    };
  }
}
