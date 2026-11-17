export interface SupportSettings {
  id: string;
  whatsappNumber: string;
  supportEmail: string;
  companyName: string;
  updatedAt?: string;
}

export const DEFAULT_SUPPORT_SETTINGS: SupportSettings = {
  id: "support",
  whatsappNumber: "+1 (401) 572-1696",
  supportEmail: "codeabm71@gmail.com",
  companyName: "ABM CodeSpace",
};

export function normalizeWhatsAppDigits(rawNumber?: string | null): string {
  const raw = (rawNumber || DEFAULT_SUPPORT_SETTINGS.whatsappNumber).trim();
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("03")) {
    digits = `92${digits.slice(1)}`;
  }
  return digits || "14015721696";
}

export function formatWhatsAppUrl(
  rawNumber?: string | null,
  prefillMessage?: string
): string {
  const digits = normalizeWhatsAppDigits(rawNumber);
  if (prefillMessage && prefillMessage.trim()) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(prefillMessage.trim())}`;
  }
  return `https://wa.me/${digits}`;
}
