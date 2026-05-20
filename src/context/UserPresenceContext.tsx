"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  resolveUserPresence,
  USER_PRESENCE_IDLE_MS,
  type UserPresenceState,
} from "@/lib/userPresence";

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

const MOUSEMOVE_THROTTLE_MS = 30_000;
const TICK_MS = 15_000;

type UserPresenceContextValue = {
  presence: UserPresenceState;
  lastActivityAt: number;
};

const UserPresenceContext = createContext<UserPresenceContextValue>({
  presence: "active",
  lastActivityAt: Date.now(),
});

export function UserPresenceProvider({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const lastActivityRef = useRef(Date.now());
  const lastMouseMoveRef = useRef(0);
  const [presence, setPresence] = useState<UserPresenceState>("active");
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now());

  const markActive = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    setLastActivityAt(now);
    setPresence(
      resolveUserPresence(now, document.visibilityState === "visible", now),
    );
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const recompute = () => {
      const visible = document.visibilityState === "visible";
      const next = resolveUserPresence(
        lastActivityRef.current,
        visible,
        Date.now(),
      );
      setPresence(next);
    };

    const onActivity = (event: Event) => {
      if (event.type === "mousemove") {
        const now = Date.now();
        if (now - lastMouseMoveRef.current < MOUSEMOVE_THROTTLE_MS) return;
        lastMouseMoveRef.current = now;
      }
      markActive();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        markActive();
      } else {
        recompute();
      }
    };

    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, onActivity, { passive: true });
    }
    window.addEventListener("mousemove", onActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    const tick = window.setInterval(recompute, TICK_MS);
    recompute();

    return () => {
      for (const name of ACTIVITY_EVENTS) {
        window.removeEventListener(name, onActivity);
      }
      window.removeEventListener("mousemove", onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(tick);
    };
  }, [enabled, markActive]);

  const value = useMemo(
    () => ({ presence, lastActivityAt }),
    [presence, lastActivityAt],
  );

  return (
    <UserPresenceContext.Provider value={value}>
      {children}
    </UserPresenceContext.Provider>
  );
}

export function useUserPresence() {
  return useContext(UserPresenceContext);
}

export { USER_PRESENCE_IDLE_MS };
