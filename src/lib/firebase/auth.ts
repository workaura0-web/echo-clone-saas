import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  linkWithCredential,
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
  username?: string;
  photoURL?: string;
  plan: PlanId;
  planName: string;
  characterLimit: number;
  usedCharacters: number;
  maxCharsPerGeneration: number;
  planStartedAt: string;
  planExpiresAt: string;
  isApproved: boolean;
  isAdmin?: boolean;
  acceptedTerms?: boolean;
  acceptedTermsAt?: string;
  updatedAt?: string;
}

export const ADMIN_EMAIL = "workaura0@gmail.com";
export const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/;

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return lower === ADMIN_EMAIL.toLowerCase() || lower === "workaur0@gmail.com";
}

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function validateUsername(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizeUsername(raw);
  if (!normalized) {
    return { valid: false, normalized, error: "Username is required." };
  }
  if (normalized.length < 3 || normalized.length > 24) {
    return {
      valid: false,
      normalized,
      error: "Username must be between 3 and 24 characters.",
    };
  }
  if (!USERNAME_REGEX.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: "Use only letters, numbers, and underscores (_).",
    };
  }
  return { valid: true, normalized };
}

export async function isUsernameAvailable(raw: string): Promise<{
  available: boolean;
  normalized: string;
  error?: string;
}> {
  const check = validateUsername(raw);
  if (!check.valid) {
    return { available: false, normalized: check.normalized, error: check.error };
  }

  const snap = await getDoc(doc(db, "usernames", check.normalized));
  if (snap.exists()) {
    return {
      available: false,
      normalized: check.normalized,
      error: `Username "@${check.normalized}" is already taken.`,
    };
  }
  return { available: true, normalized: check.normalized };
}

export async function resolveIdentifierToEmail(identifier: string): Promise<string> {
  const trimmed = identifier.trim();
  if (!trimmed) {
    throw new Error("Enter your username or email address.");
  }

  if (trimmed.includes("@") && !trimmed.startsWith("@")) {
    return trimmed;
  }

  const normalized = normalizeUsername(trimmed);
  if (!USERNAME_REGEX.test(normalized)) {
    throw new Error(
      "Enter a valid email address or username (3–24 letters, numbers, underscores)."
    );
  }

  const usernameSnap = await getDoc(doc(db, "usernames", normalized));
  if (!usernameSnap.exists()) {
    throw new Error(
      `No account found for username "@${normalized}". Try your email address or create a new account.`
    );
  }

  const data = usernameSnap.data();
  if (!data?.email || typeof data.email !== "string") {
    throw new Error("This username is not linked to a valid sign-in email.");
  }
  return data.email;
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function ensureUserProfile(
  user: User,
  preferredUsername?: string,
  options?: { acceptedTermsAt?: string }
): Promise<UserProfile> {
  testFirestoreConnection();

  const profileRef = doc(db, "profiles", user.uid);
  const userRef = doc(db, "users", user.uid);
  const adminRef = doc(db, "admins", user.uid);
  const isAdminUser = isAdminEmail(user.email);

  const defaultPlan = isAdminUser ? PLANS.enterprise : PLANS.free;
  const nowIso = new Date().toISOString();
  const expiryIso = addDaysIso(defaultPlan.validityDays);
  const cleanUsername =
    preferredUsername && USERNAME_REGEX.test(normalizeUsername(preferredUsername))
      ? normalizeUsername(preferredUsername)
      : undefined;
  const acceptedTermsAt = options?.acceptedTermsAt;
  const incomingPhotoUrl =
    user.photoURL && user.photoURL.trim().length > 0 && user.photoURL.trim().length <= 500
      ? user.photoURL.trim()
      : undefined;

  try {
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const data = profileSnap.data();
      const planId = (data.plan as PlanId) || (isAdminUser ? "enterprise" : "free");
      const planDef = getPlanDefinition(planId);
      const resolvedUsername =
        (typeof data.username === "string" && data.username) || cleanUsername;
      const resolvedPhotoUrl =
        incomingPhotoUrl ||
        (typeof data.photoURL === "string" && data.photoURL.trim() ? data.photoURL.trim() : undefined);
      const resolvedAcceptedTermsAt =
        (typeof data.acceptedTermsAt === "string" && data.acceptedTermsAt) ||
        acceptedTermsAt;

      const profilePatch: Record<string, unknown> = {};
      const userPatch: Record<string, unknown> = {};

      if (!data.username && cleanUsername) {
        profilePatch.username = cleanUsername;
        userPatch.username = cleanUsername;
      }
      if (incomingPhotoUrl && data.photoURL !== incomingPhotoUrl) {
        profilePatch.photoURL = incomingPhotoUrl;
        userPatch.photoURL = incomingPhotoUrl;
      }
      if (!data.acceptedTermsAt && acceptedTermsAt) {
        profilePatch.acceptedTerms = true;
        profilePatch.acceptedTermsAt = acceptedTermsAt;
        userPatch.acceptedTerms = true;
        userPatch.acceptedTermsAt = acceptedTermsAt;
      }

      if (Object.keys(profilePatch).length > 0) {
        profilePatch.updatedAt = nowIso;
        await updateDoc(profileRef, profilePatch).catch(() => undefined);
      }
      if (Object.keys(userPatch).length > 0) {
        await updateDoc(userRef, userPatch).catch(() => undefined);
      }

      return {
        id: user.uid,
        email: user.email || data.email || "",
        displayName:
          user.displayName ||
          data.displayName ||
          resolvedUsername ||
          user.email?.split("@")[0] ||
          "Creator",
        username: resolvedUsername,
        photoURL: resolvedPhotoUrl,
        plan: planId,
        planName: data.planName || planDef.name,
        characterLimit:
          typeof data.characterLimit === "number"
            ? data.characterLimit
            : planDef.characterLimit,
        usedCharacters: typeof data.usedCharacters === "number" ? data.usedCharacters : 0,
        maxCharsPerGeneration:
          typeof data.maxCharsPerGeneration === "number"
            ? data.maxCharsPerGeneration
            : planDef.maxCharsPerGeneration,
        planStartedAt: data.planStartedAt || nowIso,
        planExpiresAt: data.planExpiresAt || expiryIso,
        isApproved: data.isApproved ?? true,
        isAdmin: isAdminUser || data.role === "admin",
        acceptedTerms: Boolean(data.acceptedTerms ?? resolvedAcceptedTermsAt),
        acceptedTermsAt: resolvedAcceptedTermsAt,
        updatedAt: data.updatedAt || nowIso,
      };
    }

    const displayName =
      user.displayName || cleanUsername || user.email?.split("@")[0] || "Creator";

    const newProfile: UserProfile = {
      id: user.uid,
      email: user.email || "",
      displayName,
      username: cleanUsername,
      photoURL: incomingPhotoUrl,
      plan: defaultPlan.id,
      planName: defaultPlan.name,
      characterLimit: defaultPlan.characterLimit,
      usedCharacters: 0,
      maxCharsPerGeneration: defaultPlan.maxCharsPerGeneration,
      planStartedAt: nowIso,
      planExpiresAt: expiryIso,
      isApproved: true,
      isAdmin: isAdminUser,
      ...(acceptedTermsAt ? { acceptedTerms: true, acceptedTermsAt } : {}),
      updatedAt: nowIso,
    };

    await setDoc(userRef, {
      id: user.uid,
      email: user.email || "",
      displayName,
      ...(cleanUsername ? { username: cleanUsername } : {}),
      ...(incomingPhotoUrl ? { photoURL: incomingPhotoUrl } : {}),
      ...(acceptedTermsAt ? { acceptedTerms: true, acceptedTermsAt } : {}),
      role: isAdminUser ? "admin" : "user",
      createdAt: nowIso,
    });

    await setDoc(profileRef, {
      id: user.uid,
      email: user.email || "",
      displayName,
      ...(cleanUsername ? { username: cleanUsername } : {}),
      ...(incomingPhotoUrl ? { photoURL: incomingPhotoUrl } : {}),
      ...(acceptedTermsAt ? { acceptedTerms: true, acceptedTermsAt } : {}),
      plan: newProfile.plan,
      planName: newProfile.planName,
      characterLimit: newProfile.characterLimit,
      usedCharacters: 0,
      maxCharsPerGeneration: newProfile.maxCharsPerGeneration,
      planStartedAt: newProfile.planStartedAt,
      planExpiresAt: newProfile.planExpiresAt,
      isApproved: true,
      updatedAt: nowIso,
    });

    if (isAdminUser) {
      await setDoc(
        adminRef,
        {
          userId: user.uid,
          email: user.email,
          grantedAt: nowIso,
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
      displayName:
        user.displayName || cleanUsername || user.email?.split("@")[0] || "Creator",
      username: cleanUsername,
      photoURL: incomingPhotoUrl,
      plan: defaultPlan.id,
      planName: defaultPlan.name,
      characterLimit: defaultPlan.characterLimit,
      usedCharacters: 0,
      maxCharsPerGeneration: defaultPlan.maxCharsPerGeneration,
      planStartedAt: nowIso,
      planExpiresAt: expiryIso,
      isApproved: true,
      isAdmin: isAdminUser,
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
        const username = typeof data.username === "string" ? data.username : undefined;
        const photoURL =
          user.photoURL ||
          (typeof data.photoURL === "string" && data.photoURL.trim()
            ? data.photoURL.trim()
            : undefined);
        onChange({
          id: user.uid,
          email: user.email || data.email || "",
          displayName:
            user.displayName ||
            data.displayName ||
            username ||
            user.email?.split("@")[0] ||
            "Creator",
          username,
          photoURL,
          plan: planId,
          planName: data.planName || planDef.name,
          characterLimit:
            typeof data.characterLimit === "number"
              ? data.characterLimit
              : planDef.characterLimit,
          usedCharacters: typeof data.usedCharacters === "number" ? data.usedCharacters : 0,
          maxCharsPerGeneration:
            typeof data.maxCharsPerGeneration === "number"
              ? data.maxCharsPerGeneration
              : planDef.maxCharsPerGeneration,
          planStartedAt: data.planStartedAt || new Date().toISOString(),
          planExpiresAt: data.planExpiresAt || addDaysIso(30),
          isApproved: data.isApproved ?? true,
          isAdmin: isAdminUser || data.role === "admin",
          updatedAt: data.updatedAt,
        });
      }
    },
    (error) => {
      console.warn("Profile listener warning:", error);
    }
  );
}

export async function claimUsernameForUser(
  user: User,
  rawUsername: string
): Promise<string> {
  const check = validateUsername(rawUsername);
  if (!check.valid) {
    throw new Error(check.error || "Invalid username.");
  }

  const profileRef = doc(db, "profiles", user.uid);
  const currentProfileSnap = await getDoc(profileRef);
  const existingUsername = currentProfileSnap.exists()
    ? currentProfileSnap.data()?.username
    : undefined;

  if (
    !isAdminEmail(user.email) &&
    typeof existingUsername === "string" &&
    existingUsername.trim().length > 0
  ) {
    throw new Error("A username handle is already configured on this account.");
  }

  const normalized = check.normalized;
  const targetRef = doc(db, "usernames", normalized);
  const existingSnap = await getDoc(targetRef);
  if (existingSnap.exists() && existingSnap.data()?.uid !== user.uid) {
    throw new Error(`Username "@${normalized}" is already taken.`);
  }

  const nowIso = new Date().toISOString();
  await setDoc(targetRef, {
    uid: user.uid,
    email: user.email || "",
    username: normalized,
    createdAt: nowIso,
  });

  await updateDoc(profileRef, {
    username: normalized,
    updatedAt: nowIso,
  });
  await updateDoc(doc(db, "users", user.uid), {
    username: normalized,
  }).catch(() => undefined);

  return normalized;
}

export function hasPasswordProvider(user: User | null): boolean {
  if (!user) return false;
  return user.providerData.some((p) => p.providerId === "password");
}

export async function changeUserPassword(
  user: User,
  currentPassword: string,
  newPassword: string
): Promise<{ mode: "updated" | "linked" }> {
  if (!user.email) {
    throw new Error("An email address is required on your account to set a password.");
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters.");
  }

  const usesPassword = hasPasswordProvider(user);
  if (usesPassword) {
    if (!currentPassword) {
      throw new Error("Please enter your current password.");
    }
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    return { mode: "updated" };
  }

  const emailCredential = EmailAuthProvider.credential(user.email, newPassword);
  try {
    await linkWithCredential(user, emailCredential);
    return { mode: "linked" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err || "");
    if (msg.includes("auth/requires-recent-login")) {
      await reauthenticateWithPopup(user, googleProvider);
      await linkWithCredential(user, emailCredential);
      return { mode: "linked" };
    }
    if (msg.includes("auth/provider-already-linked")) {
      await updatePassword(user, newPassword);
      return { mode: "updated" };
    }
    throw err;
  }
}

export async function signInWithGoogle(options?: { acceptedTermsAt?: string }) {
  const result = await signInWithPopup(auth, googleProvider);
  if (result.user) {
    await ensureUserProfile(result.user, undefined, options);
  }
  return result;
}

export async function loginWithEmailOrUsername(identifier: string, pass: string) {
  const resolvedEmail = await resolveIdentifierToEmail(identifier);
  const result = await signInWithEmailAndPassword(auth, resolvedEmail, pass);
  if (result.user) {
    await ensureUserProfile(result.user);
  }
  return result;
}

export async function loginWithEmail(email: string, pass: string) {
  return await loginWithEmailOrUsername(email, pass);
}

export async function signupWithEmail(
  email: string,
  pass: string,
  fullName?: string,
  rawUsername?: string,
  acceptedTermsAt?: string
) {
  let normalizedUsername: string | undefined;
  if (rawUsername && rawUsername.trim()) {
    const availability = await isUsernameAvailable(rawUsername);
    if (!availability.available) {
      throw new Error(availability.error || "Username is not available.");
    }
    normalizedUsername = availability.normalized;
  }

  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (result.user) {
    const displayLabel = fullName?.trim() || normalizedUsername;
    if (displayLabel) {
      await updateProfile(result.user, { displayName: displayLabel }).catch(
        () => undefined
      );
    }

    if (normalizedUsername) {
      await setDoc(doc(db, "usernames", normalizedUsername), {
        uid: result.user.uid,
        email: result.user.email || email.trim(),
        username: normalizedUsername,
        createdAt: new Date().toISOString(),
      });
    }

    await ensureUserProfile(result.user, normalizedUsername, {
      acceptedTermsAt: acceptedTermsAt || new Date().toISOString(),
    });
  }
  return result;
}

export async function resetPassword(identifier: string) {
  const resolvedEmail = await resolveIdentifierToEmail(identifier);
  return await sendPasswordResetEmail(auth, resolvedEmail);
}

export async function logOut() {
  return await signOut(auth);
}

export function formatAuthError(error: unknown, fallback = "Authentication failed"): string {
  const raw = error instanceof Error ? error.message : String(error || "");
  if (raw.includes("auth/unauthorized-domain")) {
    const host = typeof window !== "undefined" ? window.location.hostname : "this domain";
    return `Domain "${host}" is not authorized in Firebase Authentication. Add "${host}" under Firebase Console → Authentication → Settings → Authorized domains.`;
  }
  if (raw.includes("auth/operation-not-allowed")) {
    return "Email/password sign-in is currently disabled in Firebase Console. Please use Continue with Google or enable Email/Password in Firebase Authentication.";
  }
  if (raw.includes("auth/popup-closed-by-user")) {
    return "Sign-in popup was closed before completing login. Please try again.";
  }
  if (raw.includes("auth/popup-blocked")) {
    return "Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.";
  }
  if (
    raw.includes("auth/invalid-credential") ||
    raw.includes("auth/wrong-password") ||
    raw.includes("auth/user-not-found")
  ) {
    return "Invalid credentials. Please verify your password and try again.";
  }
  if (raw.includes("auth/weak-password")) {
    return "Password must be at least 6 characters.";
  }
  if (raw.includes("auth/requires-recent-login")) {
    return "Please sign in again to verify your identity before changing your password.";
  }
  if (raw.includes("auth/too-many-requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (raw.includes("auth/email-already-in-use")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  return error instanceof Error ? error.message : fallback;
}

export async function trackCharacterUsage(userId: string, count: number) {
  try {
    const profileRef = doc(db, "profiles", userId);
    await updateDoc(profileRef, {
      usedCharacters: increment(count),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating character usage:", error);
  }
}

export { auth, db };
