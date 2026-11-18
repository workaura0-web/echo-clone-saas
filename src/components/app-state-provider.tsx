"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  auth,
  ensureUserProfile,
  isAdminEmail,
  subscribeUserProfile,
  UserProfile,
} from "@/lib/firebase/auth";
import {
  AppNotification,
  subscribePricingPlans,
  subscribeSupportSettings,
  subscribeUserNotifications,
  syncUserLifecycleNotifications,
} from "@/lib/firebase/db";
import { PLANS, PlanDefinition, PlanId } from "@/lib/plans";
import { DEFAULT_SUPPORT_SETTINGS, SupportSettings } from "@/lib/support";
import type { GlobalNeuralVoice } from "@/lib/audio/globalVoices";

interface LocaleItem {
  locale: string;
  localeName: string;
}

interface AppStateContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  profile: UserProfile | null;
  livePlansMap: Record<PlanId, PlanDefinition>;
  supportSettings: SupportSettings;
  notifications: AppNotification[];
  globalVoices: GlobalNeuralVoice[];
  globalLocales: LocaleItem[];
  voicesLoading: boolean;
  ensureGlobalVoices: () => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

const PROFILE_CACHE_PREFIX = "echo-profile-v1:";
const PLANS_CACHE_KEY = "echo-plans-v1";
const SUPPORT_CACHE_KEY = "echo-support-v1";

let cachedVoicesMem: GlobalNeuralVoice[] | null = null;
let cachedLocalesMem: LocaleItem[] | null = null;
let voicesFetchPromise: Promise<void> | null = null;

function readSessionJson<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeSessionJson(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [livePlansMap, setLivePlansMap] = useState<Record<PlanId, PlanDefinition>>(PLANS);
  const [supportSettings, setSupportSettings] = useState<SupportSettings>(
    DEFAULT_SUPPORT_SETTINGS
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [globalVoices, setGlobalVoices] = useState<GlobalNeuralVoice[]>(
    () => cachedVoicesMem || []
  );
  const [globalLocales, setGlobalLocales] = useState<LocaleItem[]>(
    () => cachedLocalesMem || []
  );
  const [voicesLoading, setVoicesLoading] = useState(false);

  const ensuredUidRef = useRef<Set<string>>(new Set());
  const syncedNotifKeysRef = useRef<Set<string>>(new Set());

  const runBackgroundLifecycleSync = useCallback((prof: UserProfile) => {
    const syncKey = `${prof.id}:${prof.plan}:${prof.usedCharacters}:${prof.characterLimit}:${prof.planExpiresAt}`;
    if (syncedNotifKeysRef.current.has(syncKey)) return;
    syncedNotifKeysRef.current.add(syncKey);
    syncUserLifecycleNotifications(prof).catch(() => undefined);
  }, []);

  const ensureGlobalVoices = useCallback(() => {
    if (cachedVoicesMem && cachedVoicesMem.length > 0) {
      setGlobalVoices(cachedVoicesMem);
      setGlobalLocales(cachedLocalesMem || []);
      return;
    }
    if (voicesFetchPromise) return;

    setVoicesLoading(true);
    voicesFetchPromise = fetch("/api/voices")
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.voices)) {
          cachedVoicesMem = data.voices;
          cachedLocalesMem = Array.isArray(data.locales) ? data.locales : [];
          setGlobalVoices(cachedVoicesMem || []);
          setGlobalLocales(cachedLocalesMem || []);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        voicesFetchPromise = null;
        setVoicesLoading(false);
      });
  }, []);

  useEffect(() => {
    // Hydrate warm session caches immediately for instant route paints
    const warmPlans = readSessionJson<Record<PlanId, PlanDefinition>>(PLANS_CACHE_KEY);
    if (warmPlans && typeof warmPlans === "object") {
      setLivePlansMap(warmPlans);
    }
    const warmSupport = readSessionJson<SupportSettings>(SUPPORT_CACHE_KEY);
    if (warmSupport && warmSupport.whatsappNumber) {
      setSupportSettings(warmSupport);
    }

    const unsubPlans = subscribePricingPlans((mergedMap) => {
      setLivePlansMap(mergedMap);
      writeSessionJson(PLANS_CACHE_KEY, mergedMap);
    });

    const unsubSupport = subscribeSupportSettings((nextSupport) => {
      setSupportSettings(nextSupport);
      writeSessionJson(SUPPORT_CACHE_KEY, nextSupport);
    });

    let unsubProfile: (() => void) | null = null;
    let unsubNotifs: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      if (unsubNotifs) {
        unsubNotifs();
        unsubNotifs = null;
      }

      if (!currentUser) {
        setUser(null);
        setIsAdmin(false);
        setProfile(null);
        setNotifications([]);
        setAuthReady(true);
        return;
      }

      setUser(currentUser);
      setIsAdmin(isAdminEmail(currentUser.email));
      setAuthReady(true);

      // Optimistic warm profile hydration for zero-lag navigation
      const warmProfile = readSessionJson<UserProfile>(`${PROFILE_CACHE_PREFIX}${currentUser.uid}`);
      if (warmProfile) {
        setProfile({
          ...warmProfile,
          photoURL: currentUser.photoURL || warmProfile.photoURL,
        });
      }

      // Live real-time listeners (non-blocking)
      unsubProfile = subscribeUserProfile(currentUser, (updatedProf) => {
        setProfile(updatedProf);
        writeSessionJson(`${PROFILE_CACHE_PREFIX}${currentUser.uid}`, updatedProf);
        runBackgroundLifecycleSync(updatedProf);
      });

      unsubNotifs = subscribeUserNotifications(currentUser.uid, (items) => {
        setNotifications(items);
      });

      // Run ensureUserProfile once per UID per browser session in the background
      if (!ensuredUidRef.current.has(currentUser.uid)) {
        ensuredUidRef.current.add(currentUser.uid);
        ensureUserProfile(currentUser)
          .then((prof) => {
            setProfile(prof);
            writeSessionJson(`${PROFILE_CACHE_PREFIX}${currentUser.uid}`, prof);
            runBackgroundLifecycleSync(prof);
          })
          .catch(() => undefined);
      }
    });

    return () => {
      unsubPlans();
      unsubSupport();
      unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubNotifs) unsubNotifs();
    };
  }, [runBackgroundLifecycleSync]);

  return (
    <AppStateContext.Provider
      value={{
        user,
        authReady,
        isAdmin,
        profile,
        livePlansMap,
        supportSettings,
        notifications,
        globalVoices,
        globalLocales,
        voicesLoading,
        ensureGlobalVoices,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}
