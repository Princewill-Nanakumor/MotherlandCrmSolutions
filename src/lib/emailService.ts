// src/lib/emailService.ts
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
  // Email sending via Resend has been disabled for this app / deployment.
  // We keep this function as a no-op to avoid breaking callers, but it
  // will not attempt to send any external emails or require API keys.
  console.log(
    "sendPaymentConfirmationEmail called - email sending is disabled. Data:",
    {
      paymentId: data.paymentId,
      amount: data.amount,
      currency: data.currency,
      userEmail: data.userEmail,
    }
  );

  return {
    success: true,
    skipped: true,
  };
}
