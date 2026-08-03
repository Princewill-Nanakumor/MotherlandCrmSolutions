// src/lib/emailService.ts
import { Resend } from "resend";
import {
  APP_DISPLAY_NAME,
  createPaymentApprovedEmailHtml,
  createPaymentRejectedEmailHtml,
  getPublicAppOrigin,
  getResendFrom,
  getResendReplyTo,
  hasResendApiKey,
} from "@/lib/emailAuthBranding";
import { logResendFailure, resendEmailOk } from "@/lib/resendSend";

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

export type PaymentDecisionEmailData = {
  decision: "APPROVED" | "REJECTED";
  toEmail: string;
  firstName: string;
  paymentId: string;
  amount: number;
  currency: string;
  transactionId: string;
  network?: string | null;
  /** Optional Host / X-Forwarded-Host so links match the live domain. */
  requestHost?: string | null;
};

/**
 * Legacy pending-confirmation mail (super-admin alert path).
 * Kept as a no-op so callers stay safe; decision mail is sent via
 * {@link sendPaymentDecisionEmail}.
 */
export async function sendPaymentConfirmationEmail(
  data: PaymentNotificationEmailData,
) {
  console.log(
    "sendPaymentConfirmationEmail called - pending-confirmation email sending is disabled. Data:",
    {
      paymentId: data.paymentId,
      amount: data.amount,
      currency: data.currency,
      userEmail: data.userEmail,
    },
  );

  return {
    success: true,
    skipped: true,
  };
}

/**
 * Email the depositor when a payment is approved or rejected.
 * Failures are logged and do not throw — payment processing must not roll back.
 */
export async function sendPaymentDecisionEmail(
  data: PaymentDecisionEmailData,
): Promise<{ success: boolean; skipped?: boolean }> {
  const to = data.toEmail?.trim();
  if (!to || !to.includes("@")) {
    console.warn("sendPaymentDecisionEmail: missing recipient email", {
      paymentId: data.paymentId,
    });
    return { success: false, skipped: true };
  }

  if (!hasResendApiKey()) {
    console.warn(
      "sendPaymentDecisionEmail: RESEND_API_KEY not configured; skipping",
      { paymentId: data.paymentId, decision: data.decision },
    );
    return { success: false, skipped: true };
  }

  const detailsUrl = `${getPublicAppOrigin(data.requestHost)}/dashboard/payment-details/${data.paymentId}`;
  const htmlParams = {
    firstName: data.firstName,
    amount: data.amount,
    currency: data.currency,
    transactionId: data.transactionId,
    network: data.network,
    detailsUrl,
  };

  const isApproved = data.decision === "APPROVED";
  const subject = isApproved
    ? `${APP_DISPLAY_NAME} — payment approved`
    : `${APP_DISPLAY_NAME} — payment not approved`;
  const html = isApproved
    ? createPaymentApprovedEmailHtml(htmlParams)
    : createPaymentRejectedEmailHtml(htmlParams);

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const sendResult = await resend.emails.send({
      from: getResendFrom(),
      to: [to],
      subject,
      html,
      replyTo: getResendReplyTo(),
      tags: [
        {
          name: "category",
          value: isApproved ? "payment_approved" : "payment_rejected",
        },
      ],
    });

    if (!resendEmailOk(sendResult)) {
      logResendFailure(
        isApproved ? "payment-approved-email" : "payment-rejected-email",
        sendResult,
      );
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error("sendPaymentDecisionEmail failed:", error, {
      paymentId: data.paymentId,
      decision: data.decision,
    });
    return { success: false };
  }
}
