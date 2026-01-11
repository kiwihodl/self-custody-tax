# Supabase Email & Auth Configuration

## 1. Fix Redirect URL (CRITICAL)

Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**

| Setting | Value |
|---------|-------|
| Site URL | `https://yourdomain.com` |
| Redirect URLs | `https://yourdomain.com/auth/callback` |

---

## 2. Email Template

Go to **Authentication** → **Email Templates** → **Confirm signup**

**Subject:** `Welcome to Self Custody Tax - Confirm Your Email`

**Body:**

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #050508; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #0D0D12; border-radius: 14px; padding: 40px;">

    <div style="text-align: center; margin-bottom: 24px;">
      <img src="{{ .SiteURL }}/logo-icon.png" alt="Self Custody Tax" width="64" height="64" style="margin-bottom: 16px;">
      <h1 style="color: #FBDC7B; margin: 0; font-size: 20px;">SELF CUSTODY TAX</h1>
    </div>

    <h2 style="color: #F5F5F0; font-size: 22px; margin: 0 0 16px; text-align: center;">
      Welcome, {{ .Email }}!
    </h2>

    <p style="color: #D4CFC5; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
      Thanks for signing up. Click below to confirm your email and start tracking your crypto portfolio.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #FBDC7B; color: #050508; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">
        Confirm Email
      </a>
    </div>

    <p style="color: #A8A299; font-size: 13px; text-align: center;">
      Didn't sign up? Ignore this email.
    </p>

    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
      <p style="color: #7D786F; font-size: 12px; margin: 0;">
        Crypto tax tracking for self-custody users
      </p>
    </div>

  </div>
</div>
```

---

## Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ .ConfirmationURL }}` | Full confirmation link | `https://yoursite.com/auth/callback?token=...` |
| `{{ .SiteURL }}` | Your configured Site URL | `https://yoursite.com` |
| `{{ .Email }}` | User's email address | `user@example.com` |
| `{{ .Token }}` | Raw confirmation token | `abc123...` |
| `{{ .TokenHash }}` | Hashed token | `def456...` |
| `{{ .RedirectTo }}` | Post-confirm redirect | `/dashboard` |

**Logo:** Uses `{{ .SiteURL }}/logo-icon.png` - make sure your logo is accessible at that path on your production site.

---

## 3. Custom SMTP (Optional)

To change sender from `noreply@mail.app.supabase.io`:

Go to **Project Settings** → **Auth** → **SMTP Settings**

Proton personal doesn't support SMTP. Use **Resend**, **Postmark**, or **SendGrid**.

| Setting | Resend Example |
|---------|----------------|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Your API key |
| Sender name | `Self Custody Tax` |
| Sender email | `hello@selfcustodytax.com` |

---

## Checklist

- [ ] Site URL = production domain
- [ ] Redirect URL includes `/auth/callback`
- [ ] Email template updated
- [ ] (Optional) Custom SMTP configured
