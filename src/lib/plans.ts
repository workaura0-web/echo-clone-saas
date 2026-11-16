export type PlanId = "free" | "pro" | "enterprise";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  priceUsd: number;
  priceDisplayUsd: string;
  pricePkr: string;
  characterLimit: number;
  maxCharsPerGeneration: number;
  validityDays: number;
  libraryLimit: number; // -1 = unlimited
  allowedAccents: string[]; // "all" or specific accent IDs
  storyEmotionEnabled: boolean;
  hdWavExport: boolean;
  commercialRights: boolean;
  features: string[];
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Starter Free",
    tagline: "For testing voice scripts and quick narrations",
    priceUsd: 0,
    priceDisplayUsd: "$0",
    pricePkr: "PKR 0 / month",
    characterLimit: 10000,
    maxCharsPerGeneration: 1500,
    validityDays: 30,
    libraryLimit: 10,
    allowedAccents: ["en-US", "en-GB"],
    storyEmotionEnabled: false,
    hdWavExport: true,
    commercialRights: false,
    features: [
      "10,000 characters / 30 days",
      "US & UK regional accents",
      "Standard, Professional & Speech tones",
      "Up to 1,500 chars per generation",
      "Save up to 10 clips in Library"
    ]
  },
  pro: {
    id: "pro",
    name: "Creator Pro",
    tagline: "For storytellers, YouTubers, and podcasters",
    priceUsd: 19,
    priceDisplayUsd: "$19",
    pricePkr: "PKR 1,500 / month",
    characterLimit: 100000,
    maxCharsPerGeneration: 5000,
    validityDays: 30,
    libraryLimit: -1,
    allowedAccents: ["en-US", "en-GB", "en-AU", "en-CA", "en-PK", "ur-PK"],
    storyEmotionEnabled: true,
    hdWavExport: true,
    commercialRights: true,
    features: [
      "100,000 characters / 30 days",
      "All 6 Country Accents (US, UK, AU, CA, PK, Urdu)",
      "Dynamic Story Multi-Emotion Engine",
      "Sentence-level Angry, Laughing, Funny & Sad shifts",
      "Up to 5,000 chars per script + Unlimited Library"
    ]
  },
  enterprise: {
    id: "enterprise",
    name: "Studio Enterprise",
    tagline: "For agencies, audiobooks, and commercial studios",
    priceUsd: 49,
    priceDisplayUsd: "$49",
    pricePkr: "PKR 4,500 / month",
    characterLimit: 500000,
    maxCharsPerGeneration: 15000,
    validityDays: 30,
    libraryLimit: -1,
    allowedAccents: ["en-US", "en-GB", "en-AU", "en-CA", "en-PK", "ur-PK"],
    storyEmotionEnabled: true,
    hdWavExport: true,
    commercialRights: true,
    features: [
      "500,000 characters / 30 days",
      "All Global Accents & Multi-Emotion Director",
      "Long-form scripts up to 15,000 chars",
      "Priority neural synthesis & Commercial license",
      "Unlimited Library & dedicated support"
    ]
  }
};

export interface AccountPackageStatus {
  isExpired: boolean;
  isExpiringSoon: boolean;
  isQuotaExhausted: boolean;
  isQuotaLow: boolean;
  daysRemaining: number;
  remainingCharacters: number;
  usagePercent: number;
  canGenerate: boolean;
  blockReason: string | null;
}

export function getPlanDefinition(planId?: string | null): PlanDefinition {
  if (planId === "pro") return PLANS.pro;
  if (planId === "enterprise") return PLANS.enterprise;
  return PLANS.free;
}

export function computePackageStatus(profile: {
  plan?: string;
  characterLimit?: number;
  usedCharacters?: number;
  planExpiresAt?: string;
  isApproved?: boolean;
  isAdmin?: boolean;
} | null): AccountPackageStatus {
  if (!profile) {
    return {
      isExpired: false,
      isExpiringSoon: false,
      isQuotaExhausted: false,
      isQuotaLow: false,
      daysRemaining: 30,
      remainingCharacters: 10000,
      usagePercent: 0,
      canGenerate: true,
      blockReason: null
    };
  }

  const planDef = getPlanDefinition(profile.plan);
  const limit = profile.characterLimit ?? planDef.characterLimit;
  const used = profile.usedCharacters ?? 0;
  const remainingCharacters = Math.max(0, limit - used);
  const usagePercent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;

  let daysRemaining = 30;
  let isExpired = false;

  if (profile.planExpiresAt) {
    const expiryMs = new Date(profile.planExpiresAt).getTime();
    if (!Number.isNaN(expiryMs)) {
      const diffMs = expiryMs - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      isExpired = diffMs <= 0;
    }
  }

  // Admins are never blocked by expiry/quota
  if (profile.isAdmin) {
    return {
      isExpired: false,
      isExpiringSoon: false,
      isQuotaExhausted: false,
      isQuotaLow: false,
      daysRemaining: 999,
      remainingCharacters: Math.max(remainingCharacters, 500000),
      usagePercent: Math.min(usagePercent, 100),
      canGenerate: true,
      blockReason: null
    };
  }

  const isExpiringSoon = !isExpired && daysRemaining <= 3;
  const isQuotaExhausted = remainingCharacters <= 0;
  const isQuotaLow = !isQuotaExhausted && usagePercent >= 80;

  let blockReason: string | null = null;
  if (profile.isApproved === false) {
    blockReason = "Your account is currently suspended. Please contact support.";
  } else if (isExpired) {
    blockReason = `Your ${planDef.name} package has expired. Renew or switch plans to continue generating audio.`;
  } else if (isQuotaExhausted) {
    blockReason = `You have reached 100% of your ${limit.toLocaleString()} monthly character limit. Upgrade your plan to continue.`;
  }

  return {
    isExpired,
    isExpiringSoon,
    isQuotaExhausted,
    isQuotaLow,
    daysRemaining,
    remainingCharacters,
    usagePercent,
    canGenerate: blockReason === null,
    blockReason
  };
}
