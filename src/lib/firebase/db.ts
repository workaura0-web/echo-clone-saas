import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./config";
import { UserProfile } from "./auth";
import {
  buildMergedPlansMap,
  computePackageStatus,
  EDITABLE_PLAN_IDS,
  estimateHoursLabel,
  formatPkrLabel,
  getPlanDefinition,
  PLANS,
  PlanDefinition,
  PlanId,
} from "../plans";
import { handleFirestoreError, OperationType } from "./errors";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "warning" | "expired" | "success";
  actionHref?: string;
  isRead: boolean;
  createdAt: string;
}

export interface SpeechSegmentRecord {
  text: string;
  emotion: string;
  cue?: string;
  pitchFactor?: number;
  rateFactor?: number;
}

export interface GenerationRecord {
  id: string;
  userId: string;
  title: string;
  text: string;
  voiceId: string;
  voiceName: string;
  accentId: string;
  accentLabel: string;
  toneId: string;
  toneLabel: string;
  engine: string;
  durationSeconds: number;
  characterCount: number;
  segmentsJson: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  planId: PlanId;
  planName: string;
  amount: number;
  pricePkr: string;
  transactionId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now()}_${rand}`;
}

export async function createNotification(
  userId: string,
  payload: Omit<AppNotification, "id" | "userId" | "isRead" | "createdAt">,
  customId?: string
): Promise<void> {
  const id = customId || makeDocId("notif");
  const path = `notifications/${id}`;
  try {
    await setDoc(
      doc(db, "notifications", id),
      {
        id,
        userId,
        title: payload.title.slice(0, 155),
        message: payload.message.slice(0, 580),
        type: payload.type,
        actionHref: payload.actionHref || "/dashboard",
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      { merge: false }
    );
  } catch (error) {
    // Ignore already-exists if using deterministic dedup ID
    if (error instanceof Error && error.message.toLowerCase().includes("permission")) {
      console.warn("Notification creation skipped:", path);
    }
  }
}

// Automatically evaluates package expiry / low-quota and creates deduplicated persistent alerts
export async function syncUserLifecycleNotifications(profile: UserProfile): Promise<void> {
  if (!profile?.id || profile.isAdmin) return;
  const status = computePackageStatus(profile);
  const planDef = getPlanDefinition(profile.plan);
  const periodKey = (profile.planExpiresAt || "active").slice(0, 10).replace(/[^a-zA-Z0-9]/g, "");

  if (status.isExpired) {
    await createNotification(
      profile.id,
      {
        title: `${planDef.name} Package Expired`,
        message: `Your ${planDef.name} subscription expired. Renew or switch packages to unlock voice generation again.`,
        type: "expired",
        actionHref: `/checkout?plan=${profile.plan}`,
      },
      `exp_${profile.id}_${periodKey}`
    );
  } else if (status.isExpiringSoon) {
    await createNotification(
      profile.id,
      {
        title: `Package Expiring in ${status.daysRemaining} Day${status.daysRemaining === 1 ? "" : "s"}`,
        message: `Your ${planDef.name} plan expires soon. Renew early so your voice projects stay uninterrupted.`,
        type: "warning",
        actionHref: `/checkout?plan=${profile.plan}`,
      },
      `soon_${profile.id}_${periodKey}`
    );
  }

  if (status.isQuotaExhausted) {
    await createNotification(
      profile.id,
      {
        title: "Character Quota Exhausted (100%)",
        message: `You have used all ${profile.characterLimit.toLocaleString()} characters in your ${planDef.name} package. Upgrade to continue generating.`,
        type: "expired",
        actionHref: "/checkout?plan=pro",
      },
      `q100_${profile.id}_${periodKey}`
    );
  } else if (status.isQuotaLow) {
    await createNotification(
      profile.id,
      {
        title: `Low Character Balance (${status.usagePercent}% Used)`,
        message: `Only ${status.remainingCharacters.toLocaleString()} characters remain on your ${planDef.name} plan.`,
        type: "warning",
        actionHref: "/checkout?plan=pro",
      },
      `q80_${profile.id}_${periodKey}`
    );
  }
}

export function subscribeUserNotifications(
  userId: string,
  onUpdate: (items: AppNotification[]) => void
): () => void {
  const q = query(collection(db, "notifications"), where("userId", "==", userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          userId: data.userId,
          title: data.title || "Notification",
          message: data.message || "",
          type: data.type || "info",
          actionHref: data.actionHref || "/dashboard",
          isRead: Boolean(data.isRead),
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      console.warn("Notification listener error:", error);
    }
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "notifications", notificationId), { isRead: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

export async function markAllNotificationsRead(notifications: AppNotification[]): Promise<void> {
  const unread = notifications.filter((n) => !n.isRead);
  await Promise.all(
    unread.map((n) => updateDoc(doc(db, "notifications", n.id), { isRead: true }).catch(() => undefined))
  );
}

export async function saveGenerationRecord(
  record: Omit<GenerationRecord, "id" | "createdAt">
): Promise<GenerationRecord> {
  const id = makeDocId("gen");
  const createdAt = new Date().toISOString();
  const fullRecord: GenerationRecord = {
    id,
    ...record,
    title: record.title.slice(0, 120),
    text: record.text.slice(0, 19500),
    createdAt,
  };

  try {
    await setDoc(doc(db, "generations", id), fullRecord);
    return fullRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `generations/${id}`);
  }
}

export async function getUserGenerations(userId: string): Promise<GenerationRecord[]> {
  try {
    const q = query(collection(db, "generations"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const items: GenerationRecord[] = [];
    snap.forEach((d) => {
      const data = d.data();
      items.push({
        id: d.id,
        userId: data.userId,
        title: data.title || "Untitled Audio",
        text: data.text || "",
        voiceId: data.voiceId || "v1",
        voiceName: data.voiceName || "Jessica",
        accentId: data.accentId || "en-US",
        accentLabel: data.accentLabel || "United States",
        toneId: data.toneId || "story",
        toneLabel: data.toneLabel || "Story Narration",
        engine: data.engine || "gemini-tts",
        durationSeconds: Number(data.durationSeconds || 5),
        characterCount: Number(data.characterCount || 0),
        segmentsJson: data.segmentsJson || "[]",
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "generations");
  }
}

export async function deleteGenerationRecord(generationId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "generations", generationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `generations/${generationId}`);
  }
}

export async function getLivePricingPlansMap(): Promise<Record<PlanId, PlanDefinition>> {
  try {
    const snap = await getDocs(collection(db, "pricing_plans"));
    const overrides: Partial<PlanDefinition>[] = [];
    snap.forEach((d) => {
      overrides.push(d.data() as Partial<PlanDefinition>);
    });
    return buildMergedPlansMap(overrides);
  } catch (err) {
    console.warn("Using default plans fallback:", err);
    return buildMergedPlansMap([]);
  }
}

export function subscribePricingPlans(
  onUpdate: (plansMap: Record<PlanId, PlanDefinition>) => void
): () => void {
  return onSnapshot(
    collection(db, "pricing_plans"),
    (snap) => {
      const overrides: Partial<PlanDefinition>[] = [];
      snap.forEach((d) => {
        overrides.push(d.data() as Partial<PlanDefinition>);
      });
      onUpdate(buildMergedPlansMap(overrides));
    },
    (error) => {
      console.warn("Pricing plans listener fallback:", error);
      onUpdate(buildMergedPlansMap([]));
    }
  );
}

export async function savePricingPlan(plan: PlanDefinition): Promise<void> {
  const path = `pricing_plans/${plan.id}`;
  const cleanPricePkr = Math.max(0, Math.round(Number(plan.pricePkrAmount) || 0));
  const cleanPriceUsd = Math.max(0, Math.round(Number(plan.priceUsd) || 0));
  const cleanCredits = Math.max(0, Math.round(Number(plan.characterLimit) || 0));
  const cleanMaxGen = Math.max(500, Math.round(Number(plan.maxCharsPerGeneration) || 50000));
  const cleanDays = Math.max(1, Math.min(3650, Math.round(Number(plan.validityDays) || 30)));
  const cleanFeatures = (Array.isArray(plan.features) ? plan.features : [])
    .map((f) => String(f).trim())
    .filter(Boolean)
    .slice(0, 15);

  const payload = {
    id: plan.id,
    name: String(plan.name || PLANS[plan.id].name).trim().slice(0, 80),
    tagline: String(plan.tagline || "").trim().slice(0, 240),
    priceUsd: cleanPriceUsd,
    priceDisplayUsd: `$${cleanPriceUsd}`,
    pricePkrAmount: cleanPricePkr,
    pricePkr: formatPkrLabel(cleanPricePkr, cleanDays),
    characterLimit: cleanCredits,
    maxCharsPerGeneration: cleanMaxGen,
    validityDays: cleanDays,
    approxHoursLabel: String(plan.approxHoursLabel || estimateHoursLabel(cleanCredits)).trim().slice(0, 60),
    libraryLimit: typeof plan.libraryLimit === "number" ? plan.libraryLimit : -1,
    allowedAccents: ["all"],
    storyEmotionEnabled: Boolean(plan.storyEmotionEnabled),
    hdWavExport: Boolean(plan.hdWavExport),
    commercialRights: Boolean(plan.commercialRights),
    isPopular: Boolean(plan.isPopular),
    isVisible: plan.isVisible !== false,
    sortOrder: Number(plan.sortOrder ?? 1),
    features: cleanFeatures.length > 0 ? cleanFeatures : PLANS[plan.id].features,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "pricing_plans", plan.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function resetDefaultPricingPlans(): Promise<void> {
  await Promise.all(
    EDITABLE_PLAN_IDS.map((id) => savePricingPlan({ ...PLANS[id] }))
  );
}

export async function activateFreeStarterPlan(userId: string): Promise<void> {
  const livePlans = await getLivePricingPlansMap();
  const plan = getPlanDefinition("free", livePlans);
  const cappedLimit = Math.min(10000, plan.characterLimit || 10000);
  const now = new Date();
  const expiry = new Date();
  expiry.setDate(now.getDate() + plan.validityDays);

  try {
    await updateDoc(doc(db, "profiles", userId), {
      plan: "free",
      planName: plan.name,
      characterLimit: cappedLimit,
      usedCharacters: 0,
      maxCharsPerGeneration: plan.maxCharsPerGeneration,
      planStartedAt: now.toISOString(),
      planExpiresAt: expiry.toISOString(),
      updatedAt: now.toISOString(),
    });
    await createNotification(userId, {
      title: `${plan.name} Activated`,
      message: `Your ${plan.name} package is active for ${plan.validityDays} days with ${cappedLimit.toLocaleString()} credits.`,
      type: "success",
      actionHref: "/studio/tts",
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `profiles/${userId}`);
  }
}

export async function submitPaymentRequest(params: {
  userId: string;
  userEmail: string;
  planId: PlanId;
  transactionId: string;
  livePlansMap?: Record<PlanId, PlanDefinition>;
}): Promise<string> {
  const liveMap = params.livePlansMap || (await getLivePricingPlansMap());
  const plan = getPlanDefinition(params.planId, liveMap);
  const id = makeDocId("pay");

  try {
    await setDoc(doc(db, "payments", id), {
      id,
      userId: params.userId,
      userEmail: params.userEmail,
      planId: plan.id,
      planName: plan.name,
      amount: plan.priceUsd,
      pricePkr: plan.pricePkr,
      transactionId: params.transactionId.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    await createNotification(params.userId, {
      title: `Payment Submitted (${plan.name})`,
      message: `Reference ${params.transactionId.trim()} received (${plan.pricePkr}). Your ${plan.name} package (${plan.characterLimit.toLocaleString()} credits) will activate immediately once verified.`,
      type: "info",
      actionHref: "/dashboard",
    });

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `payments/${id}`);
  }
}

export async function adminApplyUserPlan(
  userId: string,
  planId: PlanId,
  options: {
    resetUsage?: boolean;
    validityDays?: number;
    livePlansMap?: Record<PlanId, PlanDefinition>;
  } = {}
): Promise<void> {
  const liveMap = options.livePlansMap || (await getLivePricingPlansMap());
  const plan = getPlanDefinition(planId, liveMap);
  const days = options.validityDays ?? plan.validityDays;
  const now = new Date();
  const expiry = new Date();
  expiry.setDate(now.getDate() + days);

  const payload: Record<string, unknown> = {
    plan: plan.id,
    planName: plan.name,
    characterLimit: plan.characterLimit,
    maxCharsPerGeneration: plan.maxCharsPerGeneration,
    planStartedAt: now.toISOString(),
    planExpiresAt: expiry.toISOString(),
    isApproved: true,
    updatedAt: now.toISOString(),
  };

  if (options.resetUsage !== false) {
    payload.usedCharacters = 0;
  }

  try {
    await updateDoc(doc(db, "profiles", userId), payload);
    await createNotification(userId, {
      title: `${plan.name} Package Activated`,
      message: `Your account has been upgraded to ${plan.name} (${plan.characterLimit.toLocaleString()} credits / ${days} days).`,
      type: "success",
      actionHref: "/studio/tts",
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `profiles/${userId}`);
  }
}
