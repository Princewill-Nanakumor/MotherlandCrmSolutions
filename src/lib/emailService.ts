// src/lib/emailService.ts
import {
  createPasswordChangedEmailHtml,
  createPaymentApprovedEmailHtml,
  createPaymentRejectedEmailHtml,
  createResendClient,
  getEmailBranding,
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

export type PasswordChangedEmailData = {
  toEmail: string;
  firstName?: string | null;
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
 * Notify the account owner after a successful password change.
 * Failures are logged and do not throw — the password update must still succeed.
 */
export async function sendPasswordChangedEmail(
  data: PasswordChangedEmailData,
): Promise<{ success: boolean; skipped?: boolean }> {
  const to = data.toEmail?.trim();
  if (!to || !to.includes("@")) {
    console.warn("sendPasswordChangedEmail: missing recipient email");
    return { success: false, skipped: true };
  }

  if (!hasResendApiKey(data.requestHost)) {
    console.warn(
      "sendPasswordChangedEmail: Resend API key not configured; skipping",
      { to },
    );
    return { success: false, skipped: true };
  }

  const loginUrl = `${getPublicAppOrigin(data.requestHost)}/login`;
  const brandName = getEmailBranding(data.requestHost).displayName;
  const resend = createResendClient(data.requestHost);
  if (!resend) {
    return { success: false, skipped: true };
  }

  try {
    const sendResult = await resend.emails.send({
      from: getResendFrom(data.requestHost),
      to: [to],
      subject: `${brandName} — password changed`,
      html: createPasswordChangedEmailHtml(
        data.firstName || "there",
        loginUrl,
        data.requestHost,
      ),
      replyTo: getResendReplyTo(data.requestHost),
      tags: [{ name: "category", value: "password_changed" }],
    });

    if (!resendEmailOk(sendResult)) {
      logResendFailure("password-changed-email", sendResult);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error("sendPasswordChangedEmail failed:", error, { to });
    return { success: false };
  }
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

  if (!hasResendApiKey(data.requestHost)) {
    console.warn(
      "sendPaymentDecisionEmail: Resend API key not configured; skipping",
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
  const brandName = getEmailBranding(data.requestHost).displayName;
  const subject = isApproved
    ? `${brandName} — payment approved`
    : `${brandName} — payment not approved`;
  const html = isApproved
    ? createPaymentApprovedEmailHtml(htmlParams, data.requestHost)
    : createPaymentRejectedEmailHtml(htmlParams, data.requestHost);

  const resend = createResendClient(data.requestHost);
  if (!resend) {
    return { success: false, skipped: true };
  }

  try {
    const sendResult = await resend.emails.send({
      from: getResendFrom(data.requestHost),
      to: [to],
      subject,
      html,
      replyTo: getResendReplyTo(data.requestHost),
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
