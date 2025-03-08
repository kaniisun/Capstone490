/**
 * Supabase Email Template Customization Guide
 *
 * This file contains instructions on how to customize the email verification template in Supabase.
 *
 * Follow these steps:
 *
 * 1. Log in to your Supabase dashboard: https://app.supabase.com/
 * 2. Select your project
 * 3. Navigate to Authentication > Email Templates
 * 4. Select the "Confirmation" template
 * 5. Customize the template with the following example:
 *
 * Subject: Verify your Spartan Marketplace account
 *
 * HTML Template Example:
 *
 * ```html
 * <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
 *   <div style="text-align: center; margin-bottom: 20px;">
 *     <img src="https://upload.wikimedia.org/wikipedia/en/thumb/8/8f/UNCG_Spartans.svg/1200px-UNCG_Spartans.svg.png" alt="UNCG Logo" style="width: 120px;">
 *   </div>
 *
 *   <h1 style="color: #0066cc; text-align: center; font-size: 24px;">Verify Your Email Address</h1>
 *
 *   <p style="font-size: 16px; line-height: 1.6; color: #333333;">
 *     Hello,
 *   </p>
 *
 *   <p style="font-size: 16px; line-height: 1.6; color: #333333;">
 *     Thanks for signing up for Spartan Marketplace! To complete your registration and start exploring
 *     what other Spartans have to offer, please verify your email address by clicking the button below.
 *   </p>
 *
 *   <div style="text-align: center; margin: 30px 0;">
 *     <a href="{{ .ConfirmationURL }}" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
 *       Verify Email Address
 *     </a>
 *   </div>
 *
 *   <p style="font-size: 16px; line-height: 1.6; color: #333333;">
 *     If you didn't sign up for Spartan Marketplace, you can safely ignore this email.
 *   </p>
 *
 *   <p style="font-size: 16px; line-height: 1.6; color: #333333;">
 *     Thanks,<br>
 *     The Spartan Marketplace Team
 *   </p>
 *
 *   <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666666; font-size: 12px;">
 *     <p>
 *       This email was sent to {{ .Email }}. If you have questions or need help, please contact support.
 *     </p>
 *     <p>
 *       © 2023 Spartan Marketplace. All rights reserved.
 *     </p>
 *   </div>
 * </div>
 * ```
 *
 * 6. Click "Save Changes"
 *
 * Note: The {{ .ConfirmationURL }} placeholder will be automatically replaced with the actual verification URL
 * by Supabase. Make sure to keep this placeholder in your template.
 */

// This file is for documentation purposes only and doesn't export any functions
