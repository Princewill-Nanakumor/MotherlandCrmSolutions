"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

type DialerType = "zoiper" | "microsip" | null;

type DialerSettings = {
  dialer: DialerType;
  setDialer: (dialer: DialerType) => void;
};

const DialerSettingsContext = createContext<DialerSettings>({
  dialer: "microsip", // Default to microsip
  setDialer: () => {},
});

export function useDialerSettings() {
  return useContext(DialerSettingsContext);
}

export function DialerSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dialer, setDialer] = useState<DialerType>("microsip"); // Default to microsip

  // Load from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDialer = localStorage.getItem("dialer");
      // If a valid dialer is saved, use it
      if (savedDialer === "zoiper" || savedDialer === "microsip") {
        setDialer(savedDialer);
      } else if (savedDialer === "none") {
        // Explicitly set to null if user disabled it
        setDialer(null);
      } else {
        // No value exists in localStorage - default to "microsip" and save it
        setDialer("microsip");
        localStorage.setItem("dialer", "microsip");
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (dialer === null) {
        // Save "none" to localStorage when disabled so we know user explicitly disabled it
        localStorage.setItem("dialer", "none");
      } else {
        localStorage.setItem("dialer", dialer);
      }
    }
  }, [dialer]);

  return (
    <DialerSettingsContext.Provider
      value={{
        dialer,
        setDialer,
      }}
    >
      {children}
    </DialerSettingsContext.Provider>
  );
}

