"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getSettings, updateSettings } from "@/app/actions/admin-actions";
import { Settings, Save, Calendar, Bird, RefreshCw } from "lucide-react";

type ResetPeriod = "MONTHLY" | "YEARLY" | "NEVER";

export default function SettingsPage() {
  const [maxBirds, setMaxBirds] = useState(31);
  const [resetPeriod, setResetPeriod] = useState<ResetPeriod>("YEARLY");
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadSettings() {
      const settings = await getSettings();
      if (settings) {
        setMaxBirds(settings.maxBirdsPerSubmission);
        setResetPeriod(settings.resetPeriod);
        setCurrentYear(settings.currentYear);
      }
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await updateSettings({
        maxBirdsPerSubmission: maxBirds,
        resetPeriod,
        currentYear,
      });

      if (result.success) {
        toast.success("Settings updated successfully");
      } else {
        toast.error(result.error || "Failed to update settings");
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
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">App Settings</h1>
        <p className="text-gray-600">Configure submission rules and periods</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Submission Settings
            </CardTitle>
            <CardDescription>
              Control how bird submissions work across the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Max Birds */}
            <div className="space-y-2">
              <Label htmlFor="maxBirds" className="flex items-center gap-2">
                <Bird className="h-4 w-4" />
                Maximum Birds Per Submission
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
                The maximum number of birds a user can submit at once
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
                The year used for tracking submissions. Change this to start a new submission period.
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
                  Save Settings
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
