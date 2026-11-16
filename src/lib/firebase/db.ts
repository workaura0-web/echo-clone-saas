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
import { computePackageStatus, getPlanDefinition, PlanId } from "../plans";
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

export async function activateFreeStarterPlan(userId: string): Promise<void> {
  const plan = getPlanDefinition("free");
  const now = new Date();
  const expiry = new Date();
  expiry.setDate(now.getDate() + plan.validityDays);

  try {
    await updateDoc(doc(db, "profiles", userId), {
      plan: plan.id,
      planName: plan.name,
      characterLimit: plan.characterLimit,
      usedCharacters: 0,
      maxCharsPerGeneration: plan.maxCharsPerGeneration,
      planStartedAt: now.toISOString(),
      planExpiresAt: expiry.toISOString(),
      updatedAt: now.toISOString(),
    });
    await createNotification(userId, {
      title: "Starter Free Plan Activated",
      message: `Your ${plan.name} package is active for 30 days with ${plan.characterLimit.toLocaleString()} characters.`,
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
}): Promise<string> {
  const plan = getPlanDefinition(params.planId);
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
      message: `Reference ${params.transactionId.trim()} received. Your ${plan.name} package will activate immediately once verified.`,
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
  options: { resetUsage?: boolean; validityDays?: number } = {}
): Promise<void> {
  const plan = getPlanDefinition(planId);
  const now = new Date();
  const expiry = new Date();
  expiry.setDate(now.getDate() + (options.validityDays ?? plan.validityDays));

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
      message: `Your account has been upgraded to ${plan.name} (${plan.characterLimit.toLocaleString()} characters / ${options.validityDays ?? plan.validityDays} days).`,
      type: "success",
      actionHref: "/studio/tts",
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `profiles/${userId}`);
  }
}
