export type PlanId =
  | "free"
  | "starter"
  | "creator"
  | "pro"
  | "business"
  | "enterprise";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  priceUsd: number;
  priceDisplayUsd: string;
  pricePkrAmount: number;
  pricePkr: string;
  characterLimit: number;
  maxCharsPerGeneration: number;
  validityDays: number;
  approxHoursLabel: string;
  libraryLimit: number; // -1 = unlimited
  allowedAccents: string[]; // ["all"] or specific accent IDs
  storyEmotionEnabled: boolean;
  hdWavExport: boolean;
  commercialRights: boolean;
  isPopular: boolean;
  isVisible: boolean;
  sortOrder: number;
  features: string[];
  updatedAt?: string;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Starter Free",
    tagline: "Free trial for testing voices, accents, and MP3 exports",
    priceUsd: 0,
    priceDisplayUsd: "$0",
    pricePkrAmount: 0,
    pricePkr: "PKR 0 / month",
    characterLimit: 10000,
    maxCharsPerGeneration: 3000,
    validityDays: 30,
    approxHoursLabel: "≈ 10 mins / mo",
    libraryLimit: 15,
    allowedAccents: ["all"],
    storyEmotionEnabled: true,
    hdWavExport: true,
    commercialRights: false,
    isPopular: false,
    isVisible: false,
    sortOrder: 0,
    features: [
      "10,000 monthly credits",
      "All 140+ languages & Auto-Detect",
      "Story Multi-Emotion Director preview",
      "Up to 3,000 chars per generation",
      "Instant Chrome MP3 downloads",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "For YouTube creators, reels, and daily voiceovers",
    priceUsd: 7,
    priceDisplayUsd: "$7",
    pricePkrAmount: 2000,
    pricePkr: "PKR 2,000 / month",
    characterLimit: 1000000,
    maxCharsPerGeneration: 50000,
    validityDays: 30,
    approxHoursLabel: "≈ 17 hrs / mo",
    libraryLimit: -1,
    allowedAccents: ["all"],
    storyEmotionEnabled: true,
    hdWavExport: true,
    commercialRights: true,
    isPopular: false,
    isVisible: true,
    sortOrder: 1,
    features: [
      "1,000,000 monthly credits (≈ 17 hrs)",
      "140+ languages & 300+ neural voices",
      "Dynamic Story Multi-Emotion Director",
      "Unlimited voice reference profiles",
      "Studio MP3 export & Commercial license",
    ],
  },
  creator: {
    id: "creator",
    name: "Creator",
    tagline: "Most popular for automation channels and podcasters",
    priceUsd: 18,
    priceDisplayUsd: "$18",
    pricePkrAmount: 5000,
    pricePkr: "PKR 5,000 / month",
    characterLimit: 3000000,
    maxCharsPerGeneration: 100000,
    validityDays: 30,
    approxHoursLabel: "≈ 51 hrs / mo",
    libraryLimit: -1,
    allowedAccents: ["all"],
    storyEmotionEnabled: true,
    hdWavExport: true,
    commercialRights: true,
    isPopular: true,
    isVisible: true,
    sortOrder: 2,
    features: [
      "3,000,000 monthly credits (≈ 51 hrs)",
      "140+ languages & 300+ neural voices",
      "Auto-Detect Language & Urdu Bilingual",
      "Long-form multi-hour script batching",
      "Unlimited Audio Library & Commercial rights",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For audiobooks, courses, and high-volume production",
    priceUsd: 25,
    priceDisplayUsd: "$25",
    pricePkrAmount: 7000,
    pricePkr: "PKR 7,000 / month",
    characterLimit: 5000000,
    maxCharsPerGeneration: 150000,
    validityDays: 30,
    approxHoursLabel: "≈ 85 hrs / mo",
    libraryLimit: -1,
    allowedAccents: ["all"],
    storyEmotionEnabled: true,
    hdWavExport: true,
    commercialRights: true,
    isPopular: false,
    isVisible: true,
    sortOrder: 3,
    features: [
      "5,000,000 monthly credits (≈ 85 hrs)",
      "All 140+ languages & regional dialects",
      "Story Multi-Emotion & Drama pacing",
      "Cross-fade & silence removal controls",
      "Priority synthesis & Commercial rights",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    tagline: "For agencies, media houses, and enterprise scale",
    priceUsd: 35,
    priceDisplayUsd: "$35",
    pricePkrAmount: 10000,
    pricePkr: "PKR 10,000 / month",
    characterLimit: 10000000,
    maxCharsPerGeneration: 250000,
    validityDays: 30,
    approxHoursLabel: "≈ 170 hrs / mo",
    libraryLimit: -1,
    allowedAccents: ["all"],
    storyEmotionEnabled: true,
    hdWavExport: true,
    commercialRights: true,
    isPopular: false,
    isVisible: true,
    sortOrder: 4,
    features: [
      "10,000,000 monthly credits (≈ 170 hrs)",
      "140+ languages & 300+ neural voices",
      "Long-form up to 250K chars per request",
      "Unlimited custom voice profiles & library",
      "Dedicated WhatsApp & agency support",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Studio Enterprise",
    tagline: "Legacy enterprise tier for existing subscribers",
    priceUsd: 35,
    priceDisplayUsd: "$35",
    pricePkrAmount: 10000,
    pricePkr: "PKR 10,000 / month",
    characterLimit: 10000000,
    maxCharsPerGeneration: 250000,
    validityDays: 30,
    approxHoursLabel: "≈ 170 hrs / mo",
    libraryLimit: -1,
    allowedAccents: ["all"],
    storyEmotionEnabled: true,
    hdWavExport: true,
    commercialRights: true,
    isPopular: false,
    isVisible: false,
    sortOrder: 5,
    features: [
      "10,000,000 monthly credits",
      "All Global Accents & Multi-Emotion Director",
      "Long-form scripts & Priority synthesis",
      "Unlimited Library & Commercial license",
    ],
  },
};

export const EDITABLE_PLAN_IDS: PlanId[] = [
  "free",
  "starter",
  "creator",
  "pro",
  "business",
];

export const STOREFRONT_PLAN_IDS: PlanId[] = [
  "free",
  "starter",
  "creator",
  "pro",
  "business",
];

export function estimateHoursLabel(credits: number): string {
  if (!credits || credits <= 0) return "0 mins / mo";
  const mins = Math.round(credits / 980);
  if (mins < 60) return `≈ ${Math.max(1, mins)} mins / mo`;
  const hrs = Math.round(mins / 60);
  return `≈ ${hrs.toLocaleString()} hrs / mo`;
}

export function formatPkrLabel(amount: number, validityDays = 30): string {
  if (!amount || amount <= 0) return "PKR 0 / month";
  const period = validityDays === 30 ? "month" : `${validityDays} days`;
  return `PKR ${amount.toLocaleString()} / ${period}`;
}

export function getPlanDefinition(
  planId?: string | null,
  livePlansMap?: Partial<Record<PlanId, PlanDefinition>> | null
): PlanDefinition {
  const key = (planId || "free") as PlanId;
  if (livePlansMap && livePlansMap[key]) {
    return livePlansMap[key]!;
  }
  if (key in PLANS) {
    return PLANS[key];
  }
  return PLANS.free;
}

export function buildMergedPlansMap(
  remotePlans: Partial<PlanDefinition>[]
): Record<PlanId, PlanDefinition> {
  const merged: Record<PlanId, PlanDefinition> = {
    free: { ...PLANS.free },
    starter: { ...PLANS.starter },
    creator: { ...PLANS.creator },
    pro: { ...PLANS.pro },
    business: { ...PLANS.business },
    enterprise: { ...PLANS.enterprise },
  };

  for (const item of remotePlans) {
    if (!item?.id || !(item.id in merged)) continue;
    const base = merged[item.id as PlanId];
    const pricePkrAmount =
      typeof item.pricePkrAmount === "number" ? item.pricePkrAmount : base.pricePkrAmount;
    const priceUsd = typeof item.priceUsd === "number" ? item.priceUsd : base.priceUsd;
    const validityDays =
      typeof item.validityDays === "number" && item.validityDays > 0
        ? item.validityDays
        : base.validityDays;
    const characterLimit =
      typeof item.characterLimit === "number" ? item.characterLimit : base.characterLimit;

    merged[item.id as PlanId] = {
      ...base,
      ...item,
      id: base.id,
      pricePkrAmount,
      pricePkr: item.pricePkr || formatPkrLabel(pricePkrAmount, validityDays),
      priceUsd,
      priceDisplayUsd: item.priceDisplayUsd || `$${priceUsd}`,
      characterLimit,
      validityDays,
      approxHoursLabel: item.approxHoursLabel || estimateHoursLabel(characterLimit),
      isVisible:
        typeof item.isVisible === "boolean" ? item.isVisible : base.isVisible,
      isPopular:
        typeof item.isPopular === "boolean" ? item.isPopular : base.isPopular,
      features:
        Array.isArray(item.features) && item.features.length > 0
          ? item.features
          : base.features,
      allowedAccents:
        Array.isArray(item.allowedAccents) && item.allowedAccents.length > 0
          ? item.allowedAccents
          : base.allowedAccents,
    };
  }

  return merged;
}

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
      blockReason: null,
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

  if (profile.isAdmin) {
    return {
      isExpired: false,
      isExpiringSoon: false,
      isQuotaExhausted: false,
      isQuotaLow: false,
      daysRemaining: 999,
      remainingCharacters: Math.max(remainingCharacters, 10000000),
      usagePercent: Math.min(usagePercent, 100),
      canGenerate: true,
      blockReason: null,
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
    blockReason = `You have reached 100% of your ${limit.toLocaleString()} monthly credit limit. Upgrade your plan to continue.`;
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
    blockReason,
  };
}
