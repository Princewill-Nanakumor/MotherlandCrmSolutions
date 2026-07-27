// src/components/AccountSettings/DialerSettingsSection.tsx
"use client";

import { Phone } from "lucide-react";
import { useDialerSettings } from "@/context/DialerSettingsContext";
import { useToast } from "@/components/ui/use-toast";
import { FilterSelect } from "@/components/dashboardComponents/leadsFilters/FilterSelect";

const DIALER_OPTIONS = [
  { value: "none", label: "None (Disabled)" },
  { value: "zoiper", label: "Zoiper" },
  { value: "microsip", label: "MicroSIP" },
];

export function DialerSettingsSection() {
  const { dialer, setDialer } = useDialerSettings();
  const { toast } = useToast();

  const handleDialerChange = (value: string) => {
    const newDialer =
      value === "none" ? null : (value as "zoiper" | "microsip");
    setDialer(newDialer);

    if (newDialer === null) {
      toast({
        title: "Dialer Disabled",
        description:
          "Call button has been disabled. Please select a dialer to enable calling.",
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
    <section className="p-6 mt-4 bg-white border shadow-lg dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl border-border ">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
          <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900! dark:text-white!">
            Dialer Settings
          </h2>
          <p className="text-sm text-gray-500 dark:text-white!">
            Choose your preferred VoIP dialer application
          </p>
        </div>
      </div>

      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/20 border-border">
        <div>
          <label className="block text-sm mb-2 font-medium text-gray-700! dark:text-white!">
            Default Dialer
          </label>
          <FilterSelect
            value={dialer || "none"}
            onChange={handleDialerChange}
            options={DIALER_OPTIONS}
            placeholder="Select dialer"
            className="w-full"
            showActiveHighlight={false}
          />
          <p className="text-xs text-gray-500 dark:text-white! mt-2">
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
