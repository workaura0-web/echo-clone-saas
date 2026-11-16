import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  updateProfile,
  User 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment,
  onSnapshot
} from "firebase/firestore";
import { auth, db, googleProvider, testFirestoreConnection } from "./config";
import { PLANS, PlanId, getPlanDefinition } from "../plans";

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  plan: PlanId;
  planName: string;
  characterLimit: number;
  usedCharacters: number;
  maxCharsPerGeneration: number;
  planStartedAt: string;
  planExpiresAt: string;
  isApproved: boolean;
  isAdmin?: boolean;
  updatedAt?: string;
}

export const ADMIN_EMAIL = "workaura0@gmail.com";

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return lower === ADMIN_EMAIL.toLowerCase() || lower === "workaur0@gmail.com";
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  testFirestoreConnection();

  const profileRef = doc(db, "profiles", user.uid);
  const userRef = doc(db, "users", user.uid);
  const adminRef = doc(db, "admins", user.uid);
  const isAdminUser = isAdminEmail(user.email);

  const defaultPlan = isAdminUser ? PLANS.enterprise : PLANS.free;
  const nowIso = new Date().toISOString();
  const expiryIso = addDaysIso(defaultPlan.validityDays);

  try {
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const data = profileSnap.data();
      const planId = (data.plan as PlanId) || (isAdminUser ? "enterprise" : "free");
      const planDef = getPlanDefinition(planId);
      return {
        id: user.uid,
        email: user.email || data.email || "",
        displayName: user.displayName || data.displayName || user.email?.split("@")[0] || "Creator",
        plan: planId,
        planName: data.planName || planDef.name,
        characterLimit: typeof data.characterLimit === "number" ? data.characterLimit : planDef.characterLimit,
        usedCharacters: typeof data.usedCharacters === "number" ? data.usedCharacters : 0,
        maxCharsPerGeneration: typeof data.maxCharsPerGeneration === "number" ? data.maxCharsPerGeneration : planDef.maxCharsPerGeneration,
        planStartedAt: data.planStartedAt || nowIso,
        planExpiresAt: data.planExpiresAt || expiryIso,
        isApproved: data.isApproved ?? true,
        isAdmin: isAdminUser || data.role === "admin",
        updatedAt: data.updatedAt || nowIso
      };
    }

    const displayName = user.displayName || user.email?.split("@")[0] || "Creator";

    const newProfile: UserProfile = {
      id: user.uid,
      email: user.email || "",
      displayName,
      plan: defaultPlan.id,
      planName: defaultPlan.name,
      characterLimit: defaultPlan.characterLimit,
      usedCharacters: 0,
      maxCharsPerGeneration: defaultPlan.maxCharsPerGeneration,
      planStartedAt: nowIso,
      planExpiresAt: expiryIso,
      isApproved: true,
      isAdmin: isAdminUser,
      updatedAt: nowIso
    };

    await setDoc(userRef, {
      id: user.uid,
      email: user.email || "",
      displayName,
      role: isAdminUser ? "admin" : "user",
      createdAt: nowIso
    });

    await setDoc(profileRef, {
      id: user.uid,
      email: user.email || "",
      displayName,
      plan: newProfile.plan,
      planName: newProfile.planName,
      characterLimit: newProfile.characterLimit,
      usedCharacters: 0,
      maxCharsPerGeneration: newProfile.maxCharsPerGeneration,
      planStartedAt: newProfile.planStartedAt,
      planExpiresAt: newProfile.planExpiresAt,
      isApproved: true,
      updatedAt: nowIso
    });

    if (isAdminUser) {
      await setDoc(
        adminRef,
        {
          userId: user.uid,
          email: user.email,
          grantedAt: nowIso
        },
        { merge: true }
      );
    }

    return newProfile;
  } catch (err) {
    console.error("Profile sync error:", err);
    return {
      id: user.uid,
      email: user.email || "",
      displayName: user.displayName || user.email?.split("@")[0] || "Creator",
      plan: defaultPlan.id,
      planName: defaultPlan.name,
      characterLimit: defaultPlan.characterLimit,
      usedCharacters: 0,
      maxCharsPerGeneration: defaultPlan.maxCharsPerGeneration,
      planStartedAt: nowIso,
      planExpiresAt: expiryIso,
      isApproved: true,
      isAdmin: isAdminUser
    };
  }
}

export function subscribeUserProfile(
  user: User,
  onChange: (profile: UserProfile) => void
): () => void {
  const profileRef = doc(db, "profiles", user.uid);
  const isAdminUser = isAdminEmail(user.email);

  return onSnapshot(
    profileRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const planId = (data.plan as PlanId) || "free";
        const planDef = getPlanDefinition(planId);
        onChange({
          id: user.uid,
          email: user.email || data.email || "",
          displayName: user.displayName || data.displayName || user.email?.split("@")[0] || "Creator",
          plan: planId,
          planName: data.planName || planDef.name,
          characterLimit: typeof data.characterLimit === "number" ? data.characterLimit : planDef.characterLimit,
          usedCharacters: typeof data.usedCharacters === "number" ? data.usedCharacters : 0,
          maxCharsPerGeneration: typeof data.maxCharsPerGeneration === "number" ? data.maxCharsPerGeneration : planDef.maxCharsPerGeneration,
          planStartedAt: data.planStartedAt || new Date().toISOString(),
          planExpiresAt: data.planExpiresAt || addDaysIso(30),
          isApproved: data.isApproved ?? true,
          isAdmin: isAdminUser || data.role === "admin",
          updatedAt: data.updatedAt
        });
      }
    },
    (error) => {
      console.warn("Profile listener warning:", error);
    }
  );
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  if (result.user) {
    await ensureUserProfile(result.user);
  }
  return result;
}

export async function loginWithEmail(email: string, pass: string) {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  if (result.user) {
    await ensureUserProfile(result.user);
  }
  return result;
}

export async function signupWithEmail(email: string, pass: string, fullName?: string) {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (result.user) {
    if (fullName && fullName.trim()) {
      await updateProfile(result.user, { displayName: fullName.trim() }).catch(() => undefined);
    }
    await ensureUserProfile(result.user);
  }
  return result;
}

export async function resetPassword(email: string) {
  return await sendPasswordResetEmail(auth, email);
}

export async function logOut() {
  return await signOut(auth);
}

export async function trackCharacterUsage(userId: string, count: number) {
  try {
    const profileRef = doc(db, "profiles", userId);
    await updateDoc(profileRef, {
      usedCharacters: increment(count),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating character usage:", error);
  }
}

export { auth, db };
