"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getSettings, updateSettings, updateMonthlySettings, resetMonthlySettings } from "@/app/actions/admin-actions";
import { getYearlyMonthlySettings } from "@/lib/settings-utils";
import { Settings, Save, Calendar, Bird, RefreshCw, MessageSquare, Shield, RotateCcw } from "lucide-react";

type ResetPeriod = "MONTHLY" | "YEARLY" | "NEVER";

interface MonthSetting {
  month: number;
  year: number;
  daysInMonth: number;
  maxBirdsPerPeriod: number;
  eliminationThreshold: number;
  isCustom: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function SettingsPage() {
  const [maxBirds, setMaxBirds] = useState(31);
  const [resetPeriod, setResetPeriod] = useState<ResetPeriod>("YEARLY");
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [feedbackFormEmbedUrl, setFeedbackFormEmbedUrl] = useState("");
  const [eliminationThreshold, setEliminationThreshold] = useState(30);
  const [monthlySettings, setMonthlySettings] = useState<MonthSetting[]>([]);
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isMonthPending, startMonthTransition] = useTransition();

  useEffect(() => {
    async function loadSettings() {
      const [settings, monthly] = await Promise.all([
        getSettings(),
        getYearlyMonthlySettings(new Date().getFullYear()),
      ]);
      if (settings) {
        setMaxBirds(settings.maxBirdsPerPeriod);
        setResetPeriod(settings.resetPeriod);
        setCurrentYear(settings.currentYear);
        setFeedbackFormEmbedUrl(settings.feedbackFormEmbedUrl ?? "");
        setEliminationThreshold(settings.eliminationThreshold);
      }
      setMonthlySettings(monthly);
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  // Reload monthly settings when year changes
  useEffect(() => {
    if (!isLoading) {
      getYearlyMonthlySettings(currentYear).then(setMonthlySettings);
    }
  }, [currentYear, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await updateSettings({
        maxBirdsPerPeriod: maxBirds,
        resetPeriod,
        currentYear,
        feedbackFormEmbedUrl: feedbackFormEmbedUrl.trim() || null,
        eliminationThreshold,
      });

      if (result.success) {
        toast.success("Settings updated successfully");
        // Reload monthly settings to reflect any changes
        const monthly = await getYearlyMonthlySettings(currentYear);
        setMonthlySettings(monthly);
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    });
  };

  const handleMonthEdit = (month: number) => {
    const setting = monthlySettings.find(s => s.month === month);
    if (setting) {
      setEditingMonth(month);
      setEditValue(setting.maxBirdsPerPeriod.toString());
    }
  };

  const handleMonthSave = (month: number) => {
    const value = parseInt(editValue);
    if (isNaN(value) || value < 1 || value > 100) {
      toast.error("Value must be between 1 and 100");
      return;
    }

    startMonthTransition(async () => {
      const result = await updateMonthlySettings({
        year: currentYear,
        month,
        maxBirdsPerPeriod: value,
      });

      if (result.success) {
        toast.success(`${MONTH_NAMES[month - 1]} settings updated`);
        setEditingMonth(null);
        const monthly = await getYearlyMonthlySettings(currentYear);
        setMonthlySettings(monthly);
      } else {
        toast.error(result.error || "Failed to update");
      }
    });
  };

  const handleMonthReset = (month: number) => {
    startMonthTransition(async () => {
      const result = await resetMonthlySettings(currentYear, month);

      if (result.success) {
        toast.success(`${MONTH_NAMES[month - 1]} reset to default`);
        setEditingMonth(null);
        const monthly = await getYearlyMonthlySettings(currentYear);
        setMonthlySettings(monthly);
      } else {
        toast.error(result.error || "Failed to reset");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">App Settings</h1>
        <p className="text-gray-600">Configure submission rules and periods</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Global Settings
            </CardTitle>
            <CardDescription>
              Default settings that apply when no monthly override is set
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Max Birds */}
            <div className="space-y-2">
              <Label htmlFor="maxBirds" className="flex items-center gap-2">
                <Bird className="h-4 w-4" />
                Default Maximum Birds Per Month
              </Label>
              <Input
                id="maxBirds"
                type="number"
                min={1}
                max={100}
                value={maxBirds}
                onChange={(e) => setMaxBirds(parseInt(e.target.value) || 31)}
              />
              <p className="text-sm text-gray-500">
                Default limit used when no monthly override is set
              </p>
            </div>

            {/* Reset Period */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Greying Reset Period
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(["MONTHLY", "YEARLY", "NEVER"] as const).map((period) => (
                  <Button
                    key={period}
                    type="button"
                    variant={resetPeriod === period ? "default" : "outline"}
                    onClick={() => setResetPeriod(period)}
                    className="w-full"
                  >
                    {period === "MONTHLY" && "Monthly"}
                    {period === "YEARLY" && "Yearly"}
                    {period === "NEVER" && "Never"}
                  </Button>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                How often submitted birds become available again
              </p>
            </div>

            {/* Current Year */}
            <div className="space-y-2">
              <Label htmlFor="currentYear" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Current Submission Year
              </Label>
              <Input
                id="currentYear"
                type="number"
                min={2020}
                max={2100}
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value) || new Date().getFullYear())}
              />
              <p className="text-sm text-gray-500">
                The year used for tracking submissions
              </p>
            </div>

            {/* Elimination Threshold */}
            <div className="space-y-2">
              <Label htmlFor="eliminationThreshold" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Default Elimination Threshold
              </Label>
              <Input
                id="eliminationThreshold"
                type="number"
                min={1}
                max={100}
                value={eliminationThreshold}
                onChange={(e) => setEliminationThreshold(parseInt(e.target.value) || 30)}
              />
              <p className="text-sm text-gray-500">
                Minimum birds per month to avoid elimination
              </p>
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Global Settings
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Monthly Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Requirements for {currentYear}
          </CardTitle>
          <CardDescription>
            Set custom submission requirements for each month. Click a month to edit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {monthlySettings.map((setting) => (
              <div
                key={setting.month}
                className={`relative p-3 rounded-lg border ${
                  setting.isCustom
                    ? "border-purple-300 bg-purple-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="text-sm font-medium text-gray-900">
                  {MONTH_NAMES[setting.month - 1]}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {setting.daysInMonth} days
                </div>

                {editingMonth === setting.month ? (
                  <div className="space-y-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
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
                        Cancel
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
                        Reset to default
                      </Button>
                    )}
                  </div>
                ) : (
                  <div
                    className="cursor-pointer hover:bg-white rounded p-1 -m-1 transition-colors"
                    onClick={() => handleMonthEdit(setting.month)}
                  >
                    <div className="text-lg font-semibold text-purple-600">
                      {setting.maxBirdsPerPeriod}
                    </div>
                    <div className="text-xs text-gray-500">
                      {setting.isCustom ? "custom" : "default"}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback Form
          </CardTitle>
          <CardDescription>
            Google Form embed URL for the Feedback page. Leave empty to hide the form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="feedbackFormEmbedUrl">Google Form embed URL</Label>
          <Input
            id="feedbackFormEmbedUrl"
            type="url"
            placeholder="https://docs.google.com/forms/d/e/XXXX/viewform?embedded=true"
            value={feedbackFormEmbedUrl}
            onChange={(e) => setFeedbackFormEmbedUrl(e.target.value)}
          />
          <p className="text-sm text-gray-500">
            Paste the embed URL from Google Forms (Share → Embed HTML, or use …/viewform?embedded=true).
          </p>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full mt-4"
          >
            {isPending ? "Saving..." : "Save Feedback URL"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
