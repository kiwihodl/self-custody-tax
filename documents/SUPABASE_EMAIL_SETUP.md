# Supabase Email & Auth Configuration

This document explains how to configure Supabase for branded emails and proper redirect URLs.

---

## 1. Fix Redirect URL (CRITICAL)

The confirmation email links to `localhost:3000` because Supabase's Site URL is not configured.

### Steps:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `xubvwihuxgshzvraafzg`
3. Navigate to **Authentication** → **URL Configuration**
4. Update these settings:

| Setting | Value |
|---------|-------|
| Site URL | `https://yourdomain.com` (your production URL) |
| Redirect URLs | Add: `https://yourdomain.com/auth/callback` |

5. Click **Save**

**Note:** The Site URL is where Supabase redirects after email confirmation. This MUST be your production domain, not localhost.

---

## 2. Customize Email Templates

To make emails say "Self Custody Tax" instead of "Supabase Auth":

### Steps:

1. Go to **Authentication** → **Email Templates**
2. Select **Confirm signup** template
3. Replace the default template with:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email - Self Custody Tax</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #050508; color: #F5F5F0; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #0D0D12; border-radius: 14px; padding: 40px; border: 1px solid rgba(255,255,255,0.06);">

    <!-- Logo placeholder - add your logo URL -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="background: linear-gradient(180deg, #FBDC7B 0%, #D4B85A 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0; font-size: 24px;">
        SELF CUSTODY TAX
      </h1>
    </div>

    <!-- Welcome message -->
    <h2 style="color: #F5F5F0; font-size: 22px; margin: 0 0 16px; text-align: center;">
      Welcome! Let's get you set up.
    </h2>

    <p style="color: #D4CFC5; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
      Thanks for signing up for Self Custody Tax. Click the button below to confirm your email and start tracking your crypto portfolio.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{ .ConfirmationURL }}"
         style="display: inline-block; background-color: #FBDC7B; color: #050508; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">
        Confirm Email Address
      </a>
    </div>

    <!-- Security note -->
    <p style="color: #A8A299; font-size: 14px; line-height: 1.5; margin: 24px 0 0; text-align: center;">
      If you didn't create an account, you can safely ignore this email.
    </p>

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
      <p style="color: #7D786F; font-size: 12px; margin: 0;">
        Self Custody Tax &bull; Crypto tax tracking for self-custody users
      </p>
      <p style="color: #7D786F; font-size: 12px; margin: 8px 0 0;">
        Watch-only access &bull; Your keys never leave your device
      </p>
    </div>

  </div>
</body>
</html>
```

4. Set the **Subject** to: `Welcome to Self Custody Tax - Confirm Your Email`
5. Click **Save**

---

## 3. Configure Custom SMTP (For "From" Address)

To change the sender from `noreply@mail.app.supabase.io` to `selfcustodytax@proton.me`:

### Option A: Proton Mail SMTP (Requires Proton Business)

Proton Mail personal accounts don't support SMTP. You need:
- Proton Business/Visionary plan, OR
- Use a different email provider for SMTP

### Option B: Use a Transactional Email Service (Recommended)

Services like **Resend**, **Postmark**, or **SendGrid** offer:
- Better deliverability
- Custom "from" addresses
- Analytics

#### Setup with Resend (Example):

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain
3. Get API key
4. In Supabase Dashboard → **Project Settings** → **Auth** → **SMTP Settings**:

| Setting | Value |
|---------|-------|
| Enable Custom SMTP | Yes |
| Sender email | `hello@selfcustodytax.com` |
| Sender name | `Self Custody Tax` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | `re_xxxxxxxxxx` (your API key) |

5. Click **Save**

---

## 4. Update .env.local on VPS

After configuring Supabase, update your production `.env.local`:

```bash
# App Configuration - UPDATE THIS!
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

Then rebuild and restart:

```bash
cd /path/to/selfcustodytax
git pull
npm run build
pm2 restart selfcustodytax
```

---

## 5. Test the Flow

1. Sign up with a new email
2. Check inbox - email should say "Self Custody Tax"
3. Click confirmation link
4. Should redirect to `https://yourdomain.com/auth/confirmed`
5. See welcome page, auto-redirect to dashboard

---

## Quick Checklist

- [ ] Site URL set to production domain in Supabase
- [ ] Redirect URL includes `/auth/callback`
- [ ] Email template customized with branding
- [ ] (Optional) Custom SMTP configured
- [ ] `.env.local` updated with production URL
- [ ] App rebuilt and restarted

---

## Support

If emails aren't sending:
1. Check Supabase Dashboard → **Authentication** → **Logs**
2. Verify SMTP credentials are correct
3. Check spam folder

*Last updated: January 2026*
