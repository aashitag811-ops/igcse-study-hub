# Email Customization Guide

## Overview
This guide explains how to customize email templates in Supabase to use "IGCSE Study Hub" as the subject line for authentication emails.

## Current Status
✅ **Completed Features:**
- Forgot password functionality
- Forgot username functionality  
- Email notification reminder to check spam folder
- All authentication flows working

⏳ **Requires Supabase Dashboard Configuration:**
- Custom email subject lines
- Custom email templates

## How to Customize Email Subject Lines

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: `igcse-study-hub`
3. Navigate to **Authentication** → **Email Templates**

### Step 2: Customize Email Templates

#### A. Confirmation Email (Sign Up)
```
Subject: Welcome to IGCSE Study Hub - Verify Your Email
```

Template:
```html
<h2>Welcome to IGCSE Study Hub!</h2>
<p>Thanks for signing up! Please confirm your email address by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
<p>If you didn't create an account, you can safely ignore this email.</p>
<p><strong>📧 Note:</strong> If you don't see this email in your inbox, please check your spam/junk folder.</p>
```

#### B. Password Reset Email
```
Subject: IGCSE Study Hub - Reset Your Password
```

Template:
```html
<h2>Reset Your Password</h2>
<p>You requested to reset your password for IGCSE Study Hub.</p>
<p><a href="{{ .ConfirmationURL }}">Reset your password</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p><strong>📧 Note:</strong> If you don't see this email in your inbox, please check your spam/junk folder.</p>
```

#### C. Magic Link Email (if using)
```
Subject: IGCSE Study Hub - Your Sign In Link
```

Template:
```html
<h2>Sign in to IGCSE Study Hub</h2>
<p>Click the link below to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign in to your account</a></p>
<p>This link will expire in 1 hour.</p>
<p><strong>📧 Note:</strong> If you don't see this email in your inbox, please check your spam/junk folder.</p>
```

#### D. Email Change Confirmation
```
Subject: IGCSE Study Hub - Confirm Email Change
```

Template:
```html
<h2>Confirm Your New Email</h2>
<p>You requested to change your email address for IGCSE Study Hub.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm new email</a></p>
<p>If you didn't request this change, please contact support immediately.</p>
<p><strong>📧 Note:</strong> If you don't see this email in your inbox, please check your spam/junk folder.</p>
```

### Step 3: Configure SMTP Settings (Optional but Recommended)

For better email deliverability and custom sender name:

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Enable custom SMTP
3. Configure with your email provider (Gmail, SendGrid, etc.)
4. Set **Sender Name** to: `IGCSE Study Hub`
5. Set **Sender Email** to your domain email

### Step 4: Test Email Templates

1. Create a test account
2. Try password reset
3. Verify all emails have correct subject lines
4. Check spam folder reminder is visible

## Alternative: Using Supabase Edge Functions

If you need more control, you can create custom Edge Functions:

```typescript
// supabase/functions/send-custom-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { email, type } = await req.json()
  
  const subjects = {
    signup: "Welcome to IGCSE Study Hub - Verify Your Email",
    reset: "IGCSE Study Hub - Reset Your Password",
    magic_link: "IGCSE Study Hub - Your Sign In Link"
  }
  
  // Send email with custom subject
  // Implementation depends on your email service
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  })
})
```

## Current Implementation

### Forgot Password
- Uses Supabase's built-in `resetPasswordForEmail()`
- Subject line controlled by Supabase email templates
- Includes spam folder reminder in success message

### Forgot Username
- Custom implementation using profiles table
- Displays username directly on the page
- No email sent (instant retrieval)

### Sign Up Confirmation
- Uses Supabase's built-in email confirmation
- Subject line controlled by Supabase email templates
- Success message includes spam folder reminder

## Testing Checklist

- [ ] Sign up new account - check email subject
- [ ] Request password reset - check email subject
- [ ] Verify spam folder reminder appears in UI
- [ ] Test forgot username functionality
- [ ] Confirm all emails arrive (check spam)
- [ ] Verify sender name shows "IGCSE Study Hub"

## Notes

1. **Email Deliverability**: Using custom SMTP improves deliverability
2. **Spam Filters**: Always remind users to check spam folder
3. **Branding**: Consistent subject lines improve brand recognition
4. **Security**: Never include sensitive info in email subjects

## Support

If emails aren't being received:
1. Check Supabase logs for email sending errors
2. Verify SMTP settings if using custom SMTP
3. Check email provider's spam settings
4. Ensure email templates are saved correctly

---

**Made with Bob** 🤖