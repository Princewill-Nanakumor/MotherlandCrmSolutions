"use client";
import React from "react";
import { Phone, ChevronDown } from "lucide-react";
import { useDialerSettings } from "@/context/DialerSettingsContext";
import { useToast } from "@/components/ui/use-toast";

function ModernSelect({
  value,
  onChange,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="appearance-none w-full px-3 py-2 pr-10 rounded-lg bg-white dark:bg-input/30 border border-input !text-gray-900 dark:!text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
    </div>
  );
}

export function DialerSettingsSection() {
  const { dialer, setDialer } = useDialerSettings();
  const { toast } = useToast();

  const handleDialerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const newDialer = value === "none" ? null : (value as "zoiper" | "microsip");
    setDialer(newDialer);

    // Show success toast notification
    if (newDialer === null) {
      toast({
        title: "Dialer Disabled",
        description: "Call button has been disabled. Please select a dialer to enable calling.",
        variant: "success",
      });
    } else {
      const dialerName = newDialer === "zoiper" ? "Zoiper" : "MicroSIP";
      toast({
        title: "Dialer Updated",
        description: `${dialerName} has been set as your default dialer.`,
        variant: "success",
      });
    }
  };

  return (
    <section className="dark:backdrop-blur-lg dark:bg-white/5 mt-4 rounded-2xl p-6 shadow-lg border border-border bg-white dark:bg-transparent">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold !text-gray-900 dark:!text-white">
            Dialer Settings
          </h2>
          <p className="text-sm text-gray-500 dark:!text-white">
            Choose your preferred VoIP dialer application
          </p>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-900/20 border border-border rounded-lg">
        <div>
          <label className="block text-sm mb-2 font-medium !text-gray-700 dark:!text-white">
            Default Dialer
          </label>
          <ModernSelect value={dialer || "none"} onChange={handleDialerChange}>
            <option value="none">None (Disabled)</option>
            <option value="zoiper">Zoiper</option>
            <option value="microsip">MicroSIP</option>
          </ModernSelect>
          <p className="text-xs text-gray-500 dark:!text-white mt-2">
            {dialer === null
              ? "Call button will be disabled. Please select a dialer to enable calling."
              : dialer === "zoiper"
                ? "Uses zoiper:// protocol. Works with Zoiper Pro/Biz versions. Free version will copy number to clipboard."
                : "Uses sip: protocol. Make sure MicroSIP is set as default handler for sip: protocol."}
          </p>
        </div>
      </div>
    </section>
  );
}

