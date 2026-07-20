"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Filter,
  LayoutDashboard,
  Loader2,
  Palette,
  RotateCcw,
  Save,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  useTenantTheme,
  BRAND_THEME_QUERY_KEY,
} from "@/components/TenantThemeProvider";
import {
  BRAND_FONT_OPTIONS,
  DEFAULT_BRAND_THEME,
  brandSurfaceBackground,
  getActiveBrandPrimary,
  getBrandFontOption,
  isValidHexColor,
  mergeBrandTheme,
  normalizeHexColor,
  type BrandTheme,
} from "@/lib/brandTheme";
import { useQueryClient } from "@tanstack/react-query";
import { useDateTimeSettings } from "@/context/DateTimeSettingsContext";
import { formatAppDateTime } from "@/lib/formatDateTime";

function ColorField({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}) {
  const [hexDraft, setHexDraft] = useState(value);
  const colorValue = normalizeHexColor(value);

  useEffect(() => {
    setHexDraft(colorValue);
  }, [colorValue]);

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-gray-900! dark:text-white!">
          {label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={colorValue}
          disabled={disabled}
          onChange={(e) => {
            const next = normalizeHexColor(e.target.value);
            setHexDraft(next);
            onChange(next);
          }}
          className="w-12 h-10 p-1 bg-transparent border border-gray-300 rounded-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600"
          aria-label={label}
        />
        <Input
          value={hexDraft}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value;
            setHexDraft(next);
            if (isValidHexColor(next)) {
              onChange(normalizeHexColor(next));
            }
          }}
          onBlur={() => {
            if (isValidHexColor(hexDraft)) {
              const next = normalizeHexColor(hexDraft);
              setHexDraft(next);
              onChange(next);
            } else {
              setHexDraft(colorValue);
            }
          }}
          placeholder="#4F46E5"
          className="font-mono uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function FontSelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900! dark:text-white!">
        {label}
      </label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900! focus:outline-none focus:ring-2 focus:ring-(--brand-focus) disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-input/30 dark:text-white!"
        style={{ fontFamily: getBrandFontOption(value).cssFamily }}
      >
        {BRAND_FONT_OPTIONS.map((font) => (
          <option
            key={font.id}
            value={font.id}
            style={{ fontFamily: font.cssFamily }}
          >
            {font.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function BrandPreview({ draft }: { draft: BrandTheme }) {
  const bodyFont = getBrandFontOption(draft.bodyFont).cssFamily;
  const headingFont = getBrandFontOption(draft.headingFont).cssFamily;
  const navBackground = brandSurfaceBackground(draft);
  const { timeFormat, dateFormat, timezone } = useDateTimeSettings();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const navbarTextColor = "#ffffff";

  return (
    <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl dark:border-gray-700 dark:bg-gray-900">
      <nav
        className="flex items-center justify-between px-4 py-3 text-sm font-medium"
        style={{ ...navBackground, color: navbarTextColor }}
      >
        <div className="flex items-center gap-2">
          <LayoutDashboard
            className="w-4 h-4"
            style={{ color: navbarTextColor }}
          />
          <span
            className="text-white!"
            style={{ fontFamily: headingFont, color: navbarTextColor }}
          >
            Leads
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span
            className="rounded-xl border border-white/30 px-3 py-1 text-xs font-bold text-white!"
            style={{ fontFamily: bodyFont, color: navbarTextColor }}
          >
            {formatAppDateTime(now, { dateFormat, timeFormat, timezone })}
          </span>
          <Bell
            className="h-4 w-4 text-white!"
            style={{ color: navbarTextColor }}
          />
        </div>
      </nav>

      <div className="p-4 space-y-4">
        <div>
          <h3
            className="text-lg font-semibold text-gray-900 dark:text-white"
            style={{ fontFamily: headingFont }}
          >
            Leads Management
          </h3>
          <p
            className="mt-1 text-sm text-gray-600 dark:text-gray-300"
            style={{ fontFamily: bodyFont }}
          >
            The quick brown fox jumps over the lazy dog — 1234567890
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm">
            Save lead
          </Button>
          <Input placeholder="Focus to see input ring" className="max-w-50" />
          <Filter className="w-5 h-5 brand-icon" />
        </div>
      </div>
    </div>
  );
}

export function AppearanceSettingsSection() {
  const { savedTheme, canEdit, isLoading, setLocalTheme, refreshTheme } =
    useTenantTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<BrandTheme>(savedTheme);
  const [isSaving, setIsSaving] = useState(false);
  const savedThemeSnapshot = useRef(JSON.stringify(savedTheme));

  useEffect(() => {
    const nextSnapshot = JSON.stringify(savedTheme);
    if (savedThemeSnapshot.current === nextSnapshot) return;
    savedThemeSnapshot.current = nextSnapshot;
    setDraft(savedTheme);
  }, [savedTheme]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedTheme),
    [draft, savedTheme],
  );

  const updateDraft = (patch: Partial<BrandTheme>) => {
    const next = mergeBrandTheme({
      primary: draft.primary,
      primaryEnd: draft.primaryEnd,
      solidPrimary: draft.solidPrimary,
      buttonStyle: draft.buttonStyle,
      bodyFont: draft.bodyFont,
      headingFont: draft.headingFont,
      ...patch,
    });
    setDraft(next);
    setLocalTheme(next);
  };

  const handleButtonStyleChange = (buttonStyle: BrandTheme["buttonStyle"]) => {
    updateDraft({ buttonStyle });
  };

  const handleReset = () => {
    const next = mergeBrandTheme(DEFAULT_BRAND_THEME);
    setDraft(next);
    setLocalTheme(next);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/brand-theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save appearance");
      }
      const saved = mergeBrandTheme(data.theme);
      setDraft(saved);
      savedThemeSnapshot.current = JSON.stringify(saved);
      setLocalTheme(saved);
      queryClient.setQueryData(BRAND_THEME_QUERY_KEY, {
        theme: saved,
        canEdit: true,
      });
      toast({
        title: "Appearance saved",
        description:
          "Your brand colors and fonts now apply to you and all agents.",
        variant: "success",
      });
      await refreshTheme();
    } catch (error) {
      toast({
        title: "Could not save",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex items-center gap-2 p-6 mt-4 bg-white border shadow-lg rounded-2xl border-border dark:bg-white/5">
        <Loader2 className="w-4 h-4 animate-spin brand-icon" />
        <span className="text-sm text-gray-500 dark:text-gray-300">
          Loading appearance…
        </span>
      </section>
    );
  }

  // Appearance is admin-only — agents inherit branding and should not see this section.
  if (!canEdit) {
    return null;
  }

  return (
    <section className="p-6 mt-4 space-y-6 bg-white border shadow-lg rounded-2xl border-border dark:bg-white/5">
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-lg"
          style={{
            backgroundColor: `${getActiveBrandPrimary(draft)}22`,
          }}
        >
          <Palette
            className="w-5 h-5"
            style={{ color: getActiveBrandPrimary(draft) }}
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900! dark:text-white!">
            Appearance
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            One brand palette for buttons, inputs, icons, and the navbar.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <ColorField
              label="Primary color"
              description={
                draft.buttonStyle === "solid"
                  ? "Solid fill for buttons, inputs, icons, and navbar"
                  : "Gradient start for buttons, inputs, icons, and navbar"
              }
              value={
                draft.buttonStyle === "solid"
                  ? draft.solidPrimary
                  : draft.primary
              }
              disabled={!canEdit}
              onChange={(hex) =>
                updateDraft(
                  draft.buttonStyle === "solid"
                    ? { solidPrimary: hex }
                    : { primary: hex },
                )
              }
            />
            <ColorField
              label="Secondary color"
              description={
                draft.buttonStyle === "solid"
                  ? "Not used in solid mode"
                  : "Gradient end for buttons and navbar"
              }
              value={draft.primaryEnd}
              disabled={!canEdit || draft.buttonStyle === "solid"}
              onChange={(primaryEnd) => updateDraft({ primaryEnd })}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900! dark:text-white!">
              Button style
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Solid uses only the primary color
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={
                  draft.buttonStyle === "gradient" ? "default" : "outline"
                }
                onClick={() => handleButtonStyleChange("gradient")}
                disabled={!canEdit}
              >
                Gradient
              </Button>
              <Button
                type="button"
                variant={draft.buttonStyle === "solid" ? "default" : "outline"}
                onClick={() => handleButtonStyleChange("solid")}
                disabled={!canEdit}
              >
                Solid
              </Button>
            </div>
          </div>

          <div className="grid gap-6 pt-6 border-t border-border sm:grid-cols-2">
            <div className="flex items-start gap-2 sm:col-span-2">
              <Type className="mt-0.5 h-4 w-4 text-gray-500" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Fonts load from Google Fonts for body text and headings.
              </p>
            </div>
            <FontSelect
              label="Body font"
              value={draft.bodyFont}
              disabled={!canEdit}
              onChange={(bodyFont) => updateDraft({ bodyFont })}
            />
            <FontSelect
              label="Heading font"
              value={draft.headingFont}
              disabled={!canEdit}
              onChange={(headingFont) => updateDraft({ headingFont })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
            Live preview
          </p>
          <BrandPreview draft={draft} />
        </div>
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2 pt-6 border-t border-border">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !dirty}
            className="gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save appearance
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to default
          </Button>
        </div>
      )}
    </section>
  );
}
