"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getSettings,
  updateSettings,
  updateMonthlySettings,
  resetMonthlySettings,
  getYearlyMonthlySettings,
} from "@/app/actions/admin-actions";
import {
  Settings,
  Save,
  Calendar,
  Bird,
  RefreshCw,
  Shield,
  RotateCcw,
  ClipboardList,
  BookOpen,
  Sparkles,
  Check,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { SpecialBirdsAdmin } from "@/components/admin/special-birds-admin";

type ResetPeriod = "MONTHLY" | "YEARLY" | "NEVER";

interface MonthSetting {
  month: number;
  year: number;
  daysInMonth: number;
  maxBirdsPerPeriod: number;
  eliminationThreshold: number;
  isCustom: boolean;
}

interface GlobalSettings {
  maxBirdsPerPeriod: number;
  resetPeriod: ResetPeriod;
  currentYear: number;
  monthlyFormEmbedUrl: string;
  eliminationThreshold: number;
  rules: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SECTIONS = [
  { id: "game", label: "Game", icon: Settings },
  { id: "bonus-birds", label: "Bonus Birds", icon: Sparkles },
  { id: "monthly-caps", label: "Monthly Caps", icon: Calendar },
  { id: "form", label: "Form", icon: ClipboardList },
  { id: "rules", label: "Rules", icon: BookOpen },
];

/** Save button that reflects dirty/saving/saved state — standard settings UX. */
function SectionSaveButton({
  dirty,
  saving,
  onClick,
  label = "Save changes",
}: {
  dirty: boolean;
  saving: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <Button type="button" onClick={onClick} disabled={!dirty || saving}>
        {saving ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            {label}
          </>
        )}
      </Button>
      {!dirty && !saving && (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-green-600" />
          Saved
        </span>
      )}
      {dirty && !saving && (
        <span className="text-sm text-amber-600">Unsaved changes</span>
      )}
    </div>
  );
}

export default function SettingsPage() {
  // Draft (editable) and saved (last persisted) copies — dirty = they differ
  const [draft, setDraft] = useState<GlobalSettings | null>(null);
  const [saved, setSaved] = useState<GlobalSettings | null>(null);

  const [monthlySettings, setMonthlySettings] = useState<MonthSetting[]>([]);
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMonthPending, startMonthTransition] = useTransition();

  useEffect(() => {
    async function loadSettings() {
      try {
        const [settings, monthly] = await Promise.all([
          getSettings(),
          getYearlyMonthlySettings(new Date().getFullYear()),
        ]);
        if (settings) {
          const loaded: GlobalSettings = {
            maxBirdsPerPeriod: settings.maxBirdsPerPeriod,
            resetPeriod: settings.resetPeriod,
            currentYear: settings.currentYear,
            monthlyFormEmbedUrl: settings.monthlyFormEmbedUrl ?? "",
            eliminationThreshold: settings.eliminationThreshold,
            rules: settings.rules ?? "",
          };
          setDraft(loaded);
          setSaved(loaded);
        }
        setMonthlySettings(monthly);
        setLoadError(null);
      } catch (error) {
        console.error("Failed to load settings:", error);
        setLoadError("Failed to load settings. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Reload the monthly grid when the competition year changes (after save)
  const savedYear = saved?.currentYear;
  useEffect(() => {
    if (!isLoading && savedYear) {
      getYearlyMonthlySettings(savedYear).then(setMonthlySettings);
    }
  }, [savedYear, isLoading]);

  const set = useCallback(<K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  /**
   * All sections persist through ONE helper that always writes the full
   * (draft-merged) settings object — no section can accidentally revert
   * another's unsaved values because dirtiness is tracked per field group.
   */
  const persist = (fields: (keyof GlobalSettings)[]) => {
    if (!draft || !saved) return;
    // Merge: take edited fields from draft, everything else from last saved
    const payload: GlobalSettings = { ...saved };
    for (const field of fields) {
      Object.assign(payload, { [field]: draft[field] });
    }

    startTransition(async () => {
      const result = await updateSettings({
        maxBirdsPerPeriod: payload.maxBirdsPerPeriod,
        resetPeriod: payload.resetPeriod,
        currentYear: payload.currentYear,
        monthlyFormEmbedUrl: payload.monthlyFormEmbedUrl.trim() || null,
        eliminationThreshold: payload.eliminationThreshold,
        rules: payload.rules.trim() || null,
      });
      if (result.success) {
        setSaved(payload);
        toast.success("Settings saved");
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    });
  };

  const isDirty = (fields: (keyof GlobalSettings)[]) =>
    Boolean(draft && saved && fields.some((f) => draft[f] !== saved[f]));

  const GAME_FIELDS: (keyof GlobalSettings)[] = [
    "maxBirdsPerPeriod",
    "eliminationThreshold",
    "resetPeriod",
    "currentYear",
  ];

  const handleMonthSave = (month: number) => {
    const value = parseInt(editValue);
    if (isNaN(value) || value < 1 || value > 100) {
      toast.error("Value must be between 1 and 100");
      return;
    }
    startMonthTransition(async () => {
      const result = await updateMonthlySettings({
        year: saved?.currentYear ?? new Date().getFullYear(),
        month,
        maxBirdsPerPeriod: value,
      });
      if (result.success) {
        toast.success(`${MONTH_NAMES[month - 1]} cap set to ${value}`);
        setEditingMonth(null);
        const monthly = await getYearlyMonthlySettings(saved?.currentYear ?? new Date().getFullYear());
        setMonthlySettings(monthly);
      } else {
        toast.error(result.error || "Failed to update");
      }
    });
  };

  const handleMonthReset = (month: number) => {
    startMonthTransition(async () => {
      const result = await resetMonthlySettings(
        saved?.currentYear ?? new Date().getFullYear(),
        month
      );
      if (result.success) {
        toast.success(`${MONTH_NAMES[month - 1]} back to default`);
        setEditingMonth(null);
        const monthly = await getYearlyMonthlySettings(saved?.currentYear ?? new Date().getFullYear());
        setMonthlySettings(monthly);
      } else {
        toast.error(result.error || "Failed to reset");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-10 w-full bg-muted rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 w-full bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  if (loadError || !draft || !saved) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Settings className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Settings</h3>
              <p className="text-gray-600 mb-4">{loadError ?? "No settings found."}</p>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentCalendarMonth = new Date().getMonth() + 1;
  const showingCurrentYear = saved.currentYear === new Date().getFullYear();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Game configuration for the {saved.currentYear} challenge
        </p>
      </div>

      {/* Sticky section nav */}
      <nav className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/95 backdrop-blur border-b">
        <div className="flex gap-1 overflow-x-auto">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-purple-50 hover:text-purple-700"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* 1 — Game settings */}
      <Card id="game" className="scroll-mt-16">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Game Settings
          </CardTitle>
          <CardDescription>
            Defaults for every month — individual months can override the cap below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="maxBirds" className="flex items-center gap-2">
                <Bird className="h-4 w-4" />
                Birds per month
              </Label>
              <Input
                id="maxBirds"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={draft.maxBirdsPerPeriod}
                onChange={(e) => set("maxBirdsPerPeriod", Number(e.target.value))}
              />
              <p className="text-xs text-gray-500">Submission cap (shared across regions)</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eliminationThreshold" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Elimination threshold
              </Label>
              <Input
                id="eliminationThreshold"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={draft.eliminationThreshold}
                onChange={(e) => set("eliminationThreshold", Number(e.target.value))}
              />
              <p className="text-xs text-gray-500">Minimum birds to stay in the game</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Bird reset period
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "MONTHLY", label: "Monthly", hint: "birds reusable each month" },
                  { value: "YEARLY", label: "Yearly", hint: "one tick per bird per year" },
                  { value: "NEVER", label: "Never", hint: "birds never reset" },
                ] as const
              ).map(({ value, label, hint }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("resetPeriod", value)}
                  className={`rounded-lg border p-2.5 text-left transition-colors ${
                    draft.resetPeriod === value
                      ? "border-purple-400 bg-purple-50 ring-1 ring-purple-300"
                      : "border-gray-200 hover:border-purple-200"
                  }`}
                >
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-[11px] text-gray-500 leading-tight">{hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 sm:max-w-[50%]">
            <Label htmlFor="currentYear" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Competition year
            </Label>
            <Input
              id="currentYear"
              type="number"
              inputMode="numeric"
              min={2020}
              max={2100}
              value={draft.currentYear}
              onChange={(e) => set("currentYear", Number(e.target.value))}
            />
            {draft.currentYear !== saved.currentYear && (
              <p className="text-xs text-amber-600">
                ⚠ Changing the year affects submissions, jokers and eliminations app-wide.
              </p>
            )}
          </div>

          <SectionSaveButton
            dirty={isDirty(GAME_FIELDS)}
            saving={isPending}
            onClick={() => persist(GAME_FIELDS)}
          />
        </CardContent>
      </Card>

      {/* 2 — Monthly bonus birds */}
      <div id="bonus-birds" className="scroll-mt-16">
        <SpecialBirdsAdmin year={saved.currentYear} />
      </div>

      {/* 3 — Monthly caps */}
      <Card id="monthly-caps" className="scroll-mt-16">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Caps · {saved.currentYear}
          </CardTitle>
          <CardDescription>
            Tap a month to override the default cap ({saved.maxBirdsPerPeriod} birds).{" "}
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 align-middle">custom</Badge>{" "}
            months keep their value even if the default changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {monthlySettings.map((setting) => {
              const isCurrent = showingCurrentYear && setting.month === currentCalendarMonth;
              return (
                <div
                  key={setting.month}
                  className={`relative p-3 rounded-lg border ${
                    setting.isCustom
                      ? "border-purple-300 bg-purple-50"
                      : "border-gray-200 bg-gray-50"
                  } ${isCurrent ? "ring-2 ring-purple-400" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {MONTH_NAMES[setting.month - 1].slice(0, 3)}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold text-purple-600">NOW</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">{setting.daysInMonth} days</div>

                  {editingMonth === setting.month ? (
                    <div className="space-y-1.5">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={100}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleMonthSave(setting.month);
                          if (e.key === "Escape") setEditingMonth(null);
                        }}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          onClick={() => handleMonthSave(setting.month)}
                          disabled={isMonthPending}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setEditingMonth(null)}
                        >
                          ✕
                        </Button>
                      </div>
                      {setting.isCustom && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full h-7 text-xs text-gray-500"
                          onClick={() => handleMonthReset(setting.month)}
                          disabled={isMonthPending}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Use default
                        </Button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left cursor-pointer hover:bg-white rounded p-1 -m-1 transition-colors"
                      onClick={() => {
                        setEditingMonth(setting.month);
                        setEditValue(setting.maxBirdsPerPeriod.toString());
                      }}
                    >
                      <span className="block text-lg font-semibold text-purple-600">
                        {setting.maxBirdsPerPeriod}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {setting.isCustom ? "custom" : "default"}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 4 — Google Form */}
      <Card id="form" className="scroll-mt-16">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Monthly Google Form
          </CardTitle>
          <CardDescription>
            Embedded on the Monthly Form page; responses feed the nightly bonus-joker cron
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="monthlyFormEmbedUrl">Embed URL</Label>
          <Input
            id="monthlyFormEmbedUrl"
            type="url"
            placeholder="https://docs.google.com/forms/d/e/XXXX/viewform?embedded=true"
            value={draft.monthlyFormEmbedUrl}
            onChange={(e) => set("monthlyFormEmbedUrl", e.target.value)}
          />
          <p className="text-xs text-gray-500">
            Google Forms → Share → Embed HTML, or append <code>?embedded=true</code> to the viewform link.
          </p>
          <SectionSaveButton
            dirty={isDirty(["monthlyFormEmbedUrl"])}
            saving={isPending}
            onClick={() => persist(["monthlyFormEmbedUrl"])}
            label="Save form URL"
          />
        </CardContent>
      </Card>

      {/* 5 — Game rules */}
      <Card id="rules" className="scroll-mt-16">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Game Rules
          </CardTitle>
          <CardDescription>
            Shown on every player&apos;s dashboard. Use **Heading:** for bold section titles;
            each line renders separately. Empty = built-in default rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            id="rules"
            placeholder={"**Monthly Goal:** Twitch 31 birds each month\n**Jokers:** 3+ birds of a family earn jokers..."}
            value={draft.rules}
            onChange={(e) => set("rules", e.target.value)}
            rows={10}
            className="font-mono text-xs sm:text-sm"
          />
          <SectionSaveButton
            dirty={isDirty(["rules"])}
            saving={isPending}
            onClick={() => persist(["rules"])}
            label="Save rules"
          />
        </CardContent>
      </Card>
    </div>
  );
}
