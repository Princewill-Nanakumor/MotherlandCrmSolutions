// src/lib/emailService.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface PaymentNotificationEmailData {
  paymentId: string;
  amount: number;
  currency: string;
  network: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  transactionId: string;
  adminId?: string;
}

export async function sendPaymentConfirmationEmail(
  data: PaymentNotificationEmailData
) {
  try {
    const notificationEmail = process.env.NOTIFICATION_EMAIL;

    if (!notificationEmail) {
      throw new Error("NOTIFICATION_EMAIL environment variable not set");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const paymentDetailsUrl = data.adminId
      ? `${baseUrl}/dashboard/admin-management/${data.adminId}?tab=payments&paymentId=${data.paymentId}`
      : `${baseUrl}/dashboard/payment-details/${data.paymentId}`;

    // Improved plain text email
    const textContent = `New Payment Submission - Motherland CRM

Hello Admin,

A new payment has been submitted to your Motherland CRM dashboard and requires review.

Payment Details:
- Amount: ${data.amount} ${data.currency}
- Network: ${data.network}
- Submitted by: ${data.userFirstName} ${data.userLastName}
- Contact: ${data.userEmail}
- Transaction Reference: ${data.transactionId}
- Submission Date: ${new Date().toLocaleString()}

To review this payment, please visit your admin dashboard:
${paymentDetailsUrl}

If you have any questions about this payment, please contact our support team.

Best regards,
The Motherland CRM Team

---
This is an automated notification from Motherland CRM.
If you received this email in error, please contact support@motherlandcrmsolutions.com`;

    // Improved HTML email with better structure and spam-resistant content
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Payment Submission - Motherland CRM</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f8f9fa;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #e9ecef;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #212529; line-height: 1.3;">
                New Payment Submission
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #6c757d;">
                Motherland CRM Admin Dashboard
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #212529; line-height: 1.5;">
                Hello Admin,
              </p>
              
              <p style="margin: 0 0 24px; font-size: 16px; color: #212529; line-height: 1.5;">
                A new payment has been submitted to your Motherland CRM dashboard and requires your review.
              </p>
              
              <!-- Payment Details Table -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #f8f9fa; border-radius: 6px; margin: 24px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #212529;">
                      Payment Details
                    </h3>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #495057; width: 40%;">Amount:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #212529;">${data.amount} ${data.currency}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #495057;">Network:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #212529;">${data.network}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #495057;">Submitted by:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #212529;">${data.userFirstName} ${data.userLastName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #495057;">Contact:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #212529;">${data.userEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #495057;">Transaction ID:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #212529; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; word-break: break-all;">${data.transactionId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #495057;">Date:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #212529;">${new Date().toLocaleString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${paymentDetailsUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Review Payment
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; font-size: 14px; color: #6c757d; line-height: 1.5;">
                If you have any questions about this payment, please contact our support team.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e9ecef; background-color: #f8f9fa;">
              <p style="margin: 0; font-size: 14px; color: #6c757d; line-height: 1.5;">
                Best regards,<br>
                The Motherland CRM Team
              </p>
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 16px 0;">
              <p style="margin: 0; font-size: 12px; color: #868e96; line-height: 1.4;">
                This is an automated notification from Motherland CRM.<br>
                If you received this email in error, please contact 
                <a href="mailto:support@motherlandcrmsolutions.com" style="color: #0066cc;">support@motherlandcrmsolutions.com</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const result = await resend.emails.send({
      from: "Motherland CRM <notifications@motherlandcrmsolutions.com>",
      to: [notificationEmail],
      subject: `New Payment Submission - ${data.amount} ${data.currency} - Motherland CRM`,
      html: emailHtml,
      text: textContent,
      headers: {
        "X-Priority": "3",
        "X-Mailer": "MotherlandCRM-System-v1.0",
      },
      // Add tags for tracking (Resend feature)
      tags: [
        { name: "category", value: "payment-notification" },
        { name: "environment", value: process.env.NODE_ENV || "development" },
      ],
    });

    console.log("✅ Payment notification email sent successfully:", result);
    return { success: true, result };
  } catch (error) {
    console.error("❌ Failed to send payment notification email:", error);
    return { success: false, error };
  }
}
