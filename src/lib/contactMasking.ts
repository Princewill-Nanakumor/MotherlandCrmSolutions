export function maskEmail(email: string, visible: boolean): string {
  if (visible || !email) return email;
  const at = email.indexOf("@");
  if (at <= 0) return "••••••••";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const keep = Math.min(2, local.length);
  return `${local.slice(0, keep)}•••@${domain}`;
}

export function maskPhone(phone: string, visible: boolean): string {
  if (visible || !phone) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  return `••••••${digits.slice(-4)}`;
}
