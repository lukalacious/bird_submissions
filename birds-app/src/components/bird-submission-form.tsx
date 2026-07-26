"use client";

import { useState, useTransition, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PhotoBirdUpload } from "@/components/photo-bird-upload";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { submitBirds } from "@/app/actions/submit-birds";
import { MapPin, Search, AlertTriangle, Check, X, ChevronLeft, Plus, HelpCircle, ChevronRight, ChevronUp, ChevronDown, Shield } from "lucide-react";
import { JokerPreviewCard } from "@/components/joker-preview-card";
import { calculateJokerPreview } from "@/lib/joker-preview";
import { UseJokerButton } from "@/components/use-joker-button";

interface Bird {
  id: string;
  fullName: string;
  scientificName: string;
  alphabeticalName: string;
  groupName?: string | null;
  isDisabled: boolean;
}

interface Region {
  id: string;
  name: string;
  label: string;
}

interface BirdSubmissionFormProps {
  region: Region;
  birds: Bird[];
  maxBirds: number;
  currentYear: number;
  currentMonth: number;
  availableJokers: number;
  regionId: string;
  allRegions: Region[];
  /** scientificNames of this month's golden/photo birds (species match, any region) */
  goldenSpecies?: string[];
  photoSpecies?: string[];
}

// Memoized BirdCard component for virtualized grid
interface BirdCardProps {
  bird: Bird;
  isSelected: boolean;
  isLimitDisabled: boolean;
  isJokerEligible: boolean;
  /** This month's announced bonus bird (matched by species, any region) */
  specialBadge?: "golden" | "photo" | null;
  onToggle: (birdName: string) => void;
}

const BirdCard = memo(function BirdCard({
  bird,
  isSelected,
  isLimitDisabled,
  isJokerEligible,
  specialBadge,
  onToggle,
}: BirdCardProps) {
  return (
    <Card
      className={`relative cursor-pointer transition-all duration-200 ${
        bird.isDisabled
          ? "opacity-50 bg-muted cursor-not-allowed"
          : isSelected
          ? "ring-2 ring-primary bg-secondary"
          : isLimitDisabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:border-primary/40 hover:shadow-md"
      }`}
      onClick={() => {
        if (!bird.isDisabled && !isLimitDisabled) {
          onToggle(bird.fullName);
        }
      }}
    >
      <CardContent className="p-1">
        <div className="flex items-center gap-1 min-h-[40px]">
          <Checkbox
            checked={isSelected}
            disabled={bird.isDisabled || isLimitDisabled}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <div className="flex-1 min-w-0 text-center">
            <p className="text-sm font-medium text-foreground truncate">
              {bird.fullName}
            </p>
            <p className="text-xs text-muted-foreground italic truncate">
              {bird.scientificName}
            </p>
            {bird.isDisabled && (
              <Badge variant="stone" className="mt-1 text-xs">
                Already Twitched
              </Badge>
            )}
            {!bird.isDisabled && specialBadge === "golden" && (
              <Badge className="mt-1 text-xs bg-amber-100 text-amber-800 border-amber-300">
                🪙 Golden Bird
              </Badge>
            )}
            {!bird.isDisabled && specialBadge === "photo" && (
              <Badge className="mt-1 text-xs bg-sky-100 text-sky-800 border-sky-300">
                📸 Photo Bird
              </Badge>
            )}
          </div>
        </div>
        {isJokerEligible && (
          <div className="absolute bottom-1.5 right-1.5 text-amber-600 opacity-60">
            <Shield className="h-7 w-7" />
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export function BirdSubmissionForm({
  region,
  birds,
  maxBirds,
  currentYear,
  currentMonth,
  availableJokers,
  regionId,
  allRegions,
  goldenSpecies = [],
  photoSpecies = [],
}: BirdSubmissionFormProps) {
  const goldenSet = useMemo(() => new Set(goldenSpecies), [goldenSpecies]);
  const photoSet = useMemo(() => new Set(photoSpecies), [photoSpecies]);
  // Proof photos for this month's photo birds: birdName -> Blob URL
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const specialBadgeFor = useCallback(
    (bird: Bird): "golden" | "photo" | null =>
      goldenSet.has(bird.scientificName)
        ? "golden"
        : photoSet.has(bird.scientificName)
          ? "photo"
          : null,
    [goldenSet, photoSet]
  );
  const [selectedBirds, setSelectedBirds] = useState<Set<string>>(new Set());
  const [customBirds, setCustomBirds] = useState<string[]>([]);
  const [customBirdInput, setCustomBirdInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [step, setStep] = useState<"select" | "review">("select");
  const [isPending, startTransition] = useTransition();
  const [isBirdListExpanded, setIsBirdListExpanded] = useState(false);
  const router = useRouter();

  // Virtual scrolling ref for bird grid
  const parentRef = useRef<HTMLDivElement>(null);

  // Debounce search query to avoid filtering 500+ birds on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Guard: if in review with no selection, go back to select
  useEffect(() => {
    if (step === "review" && selectedBirds.size === 0 && customBirds.length === 0) {
      setStep("select");
    }
  }, [step, selectedBirds.size, customBirds.length]);

  const totalSelected = selectedBirds.size + customBirds.length;
  const canSelectMore = totalSelected < maxBirds;
  const limitReached = totalSelected >= maxBirds;

  // Expandable bird list logic
  const shouldShowToggle = totalSelected >= 5;
  const maxCollapsedHeight = 120; // ~3 rows of pills

  // Calculate joker preview for review step
  const jokerPreview = useMemo(() => {
    if (step !== "review" || selectedBirds.size === 0) {
      return { totalJokers: 0, groupBreakdown: [] };
    }
    return calculateJokerPreview(Array.from(selectedBirds), birds);
  }, [step, selectedBirds, birds]);

  // Calculate which groups have 3+ birds (qualify for jokers)
  const jokerEligibleGroups = useMemo(() => {
    const groupCounts = new Map<string, number>();
    birds.forEach((bird) => {
      if (bird.groupName) {
        groupCounts.set(bird.groupName, (groupCounts.get(bird.groupName) || 0) + 1);
      }
    });
    // Return set of group names with 3+ birds
    return new Set(
      Array.from(groupCounts.entries())
        .filter(([_, count]) => count >= 3)
        .map(([groupName]) => groupName)
    );
  }, [birds]);

  // Memoize filtered birds using debounced query to avoid filtering on every keystroke
  const filteredBirds = useMemo(
    () =>
      birds.filter(
        (bird) =>
          bird.fullName.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          bird.scientificName.toLowerCase().includes(debouncedQuery.toLowerCase())
      ),
    [birds, debouncedQuery]
  );

  // Virtual scrolling for bird grid (2 columns)
  const rowCount = Math.ceil(filteredBirds.length / 2);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated row height
    overscan: 5,
  });

  // Memoize toggle handlers to prevent unnecessary re-renders
  const toggleBird = useCallback((birdName: string) => {
    setSelectedBirds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(birdName)) {
        newSet.delete(birdName);
      } else if (newSet.size < maxBirds) {
        newSet.add(birdName);
      }
      return newSet;
    });
  }, [maxBirds]);

  const clearSelection = useCallback(() => {
    setSelectedBirds(new Set());
    setCustomBirds([]);
  }, []);

  const addCustomBird = () => {
    const trimmed = customBirdInput.trim();
    if (!trimmed) return;
    if (customBirds.includes(trimmed) || selectedBirds.has(trimmed)) {
      toast.error("This bird is already in your selection");
      return;
    }
    if (!canSelectMore) {
      toast.error("Maximum bird limit reached");
      return;
    }
    setCustomBirds([...customBirds, trimmed]);
    setCustomBirdInput("");
    setShowCustomInput(false);
  };

  const removeCustomBird = useCallback((birdName: string) => {
    setCustomBirds((prev) => prev.filter((b) => b !== birdName));
  }, []);

  const handleSubmit = () => {
    if (selectedBirds.size === 0 && customBirds.length === 0) {
      toast.error("Please select at least one bird");
      return;
    }

    startTransition(async () => {
      const result = await submitBirds({
        regionId: region.id,
        birdNames: Array.from(selectedBirds),
        year: currentYear,
        month: currentMonth,
        customBirds,
        photos,
      });

      if (result.success) {
        const jokersParam = result.jokersEarned ? `&jokers=${result.jokersEarned}` : '';
        router.push(`/success?count=${result.count}&region=${region.name}${jokersParam}`);
      } else {
        toast.error(result.error || "Failed to twitch birds");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
          {step === "review" ? "Review Your Selection" : "Select Birds to Twitch"}
        </h1>

        {/* Action buttons row - Joker button and Region selector */}
        <div className="flex gap-3 justify-between items-center">
          {availableJokers > 0 && (
            <div className="flex-1 max-w-xs">
              <UseJokerButton
                availableJokers={availableJokers}
                regionId={regionId}
                year={currentYear}
                month={currentMonth}
              />
            </div>
          )}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {region.label}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {allRegions.map((r) => (
                  <DropdownMenuItem
                    key={r.id}
                    className={r.id === region.id ? "bg-accent" : ""}
                    onClick={() => {
                      if (r.id !== region.id) {
                        router.push(`/twitch?region=${r.name}`);
                      }
                    }}
                  >
                    {r.label}
                    {r.id === region.id && <Check className="ml-2 h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {step === "review" ? (
        /* Review card */
        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Review Your Selection</h2>
            <p className="text-sm text-muted-foreground">
              You're about to twitch {totalSelected} bird
              {totalSelected !== 1 ? "s" : ""} for {region.label} in {currentYear}.
            </p>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {/* Regular birds */}
              {Array.from(selectedBirds)
                .sort((a, b) => a.localeCompare(b))
                .map((fullName) => {
                  const sci = birds.find((b) => b.fullName === fullName)?.scientificName ?? "";
                  return (
                    <li key={fullName} className="text-sm">
                      <span className="font-medium text-foreground">{fullName}</span>
                      {sci && <span className="italic text-muted-foreground"> ({sci})</span>}
                    </li>
                  );
                })}
              {/* Custom birds */}
              {customBirds.sort((a, b) => a.localeCompare(b)).map((birdName) => (
                <li key={`custom-${birdName}`} className="text-sm flex items-center gap-2">
                  <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                    Custom
                  </Badge>
                  <span className="font-medium text-foreground">{birdName}</span>
                </li>
              ))}
            </ul>

            {/* Bonus bird photos — golden + photography birds in this selection */}
            {(() => {
              const bonusSelected = Array.from(selectedBirds)
                .map((fullName) => {
                  const sci = birds.find((b) => b.fullName === fullName)?.scientificName ?? "";
                  const kind = goldenSet.has(sci)
                    ? ("golden" as const)
                    : photoSet.has(sci)
                      ? ("photo" as const)
                      : null;
                  return kind ? { fullName, kind } : null;
                })
                .filter((b): b is { fullName: string; kind: "golden" | "photo" } => b !== null)
                .sort((a, b) => a.fullName.localeCompare(b.fullName));

              if (bonusSelected.length === 0) return null;
              return (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    📸 Bonus bird photos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Attach a photo as proof — admins award bonus jokers for verified
                    golden and photography birds.
                  </p>
                  <ul className="space-y-2">
                    {bonusSelected.map(({ fullName, kind }) => (
                      <li key={fullName} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm">
                        <span className="flex items-center gap-1.5 min-w-0 flex-1 basis-40">
                          <span className="flex-shrink-0">{kind === "golden" ? "🪙" : "📸"}</span>
                          <span className="font-medium truncate">{fullName}</span>
                        </span>
                        <PhotoBirdUpload
                          birdName={fullName}
                          photoUrl={photos[fullName] ?? null}
                          onChange={(url) =>
                            setPhotos((prev) => {
                              const next = { ...prev };
                              if (url) next[fullName] = url;
                              else delete next[fullName];
                              return next;
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* Joker Preview */}
            <JokerPreviewCard
              jokersToEarn={jokerPreview.totalJokers}
              groupBreakdown={jokerPreview.groupBreakdown}
            />

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("select")} disabled={isPending}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Edit Selection
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirm and Twitch
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Counter and Actions */}
          <Card>
            <CardContent className="pt-1.5 px-5 pb-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <motion.div
                      key={totalSelected}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-bold text-primary"
                    >
                      {totalSelected}
                    </motion.div>
                    <div className="text-sm text-muted-foreground">of {maxBirds}</div>
                  </div>
                  {limitReached && (
                    <div className="flex items-center gap-2 text-accent bg-accent/10 px-3 py-2 rounded-lg">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Maximum reached</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={clearSelection}
                    disabled={totalSelected === 0 || isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                  <Button
                    onClick={() => setStep("review")}
                    disabled={totalSelected === 0 || isPending}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Twitch {totalSelected} Bird{totalSelected !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
              <AnimatePresence>
                {totalSelected > 0 && (
                  <motion.div
                    className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-border"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{
                      opacity: 1,
                      height: shouldShowToggle && !isBirdListExpanded ? maxCollapsedHeight : "auto"
                    }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      overflow: shouldShowToggle && !isBirdListExpanded ? "hidden" : "visible"
                    }}
                  >
                    <AnimatePresence mode="sync">
                      {/* Regular selected birds */}
                      {Array.from(selectedBirds)
                        .sort((a, b) => a.localeCompare(b))
                        .map((fullName) => (
                          <motion.span
                            key={fullName}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 400, damping: 35 }}
                            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                          >
                            {fullName}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBird(fullName);
                              }}
                              className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                              aria-label={`Remove ${fullName}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </motion.span>
                        ))}
                      {/* Custom birds (with different style) */}
                      {customBirds
                        .sort((a, b) => a.localeCompare(b))
                        .map((birdName) => (
                          <motion.span
                            key={`custom-${birdName}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 400, damping: 35 }}
                            className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-700"
                          >
                            <HelpCircle className="h-3 w-3" />
                            {birdName}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeCustomBird(birdName);
                              }}
                              className="rounded-full p-0.5 hover:bg-purple-200 transition-colors"
                              aria-label={`Remove ${birdName}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </motion.span>
                        ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Toggle button for collapsing/expanding bird list */}
              {totalSelected > 0 && shouldShowToggle && (
                <button
                  type="button"
                  onClick={() => setIsBirdListExpanded(!isBirdListExpanded)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 mt-2"
                >
                  <span>
                    {isBirdListExpanded ? "Show less" : `Show all ${totalSelected} birds`}
                  </span>
                  {isBirdListExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search birds by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11"
            />
          </div>

          {/* Custom Bird Input */}
          <AnimatePresence>
            {showCustomInput ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="border-indigo-200/60 bg-gradient-to-br from-indigo-50/20 to-purple-50/20">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <HelpCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Add Unlisted Bird</p>
                        <p className="text-sm text-muted-foreground">
                          Can't find your bird? Enter its name below. Custom entries will be reviewed.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter bird name..."
                        value={customBirdInput}
                        onChange={(e) => setCustomBirdInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomBird();
                          }
                        }}
                        className="flex-1 bg-card"
                        disabled={!canSelectMore}
                      />
                      <Button
                        onClick={addCustomBird}
                        disabled={!customBirdInput.trim() || !canSelectMore}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCustomInput(false);
                          setCustomBirdInput("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Button
                  onClick={() => setShowCustomInput(true)}
                  disabled={!canSelectMore}
                  className="w-full gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-md"
                >
                  <Plus className="h-5 w-5" />
                  Bird Not Listed? Add Custom Entry
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bird Grid - Virtualized for performance */}
          <div
            ref={parentRef}
            className="h-[60vh] overflow-auto rounded-lg border border-border"
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const rowIndex = virtualRow.index;
                const bird1 = filteredBirds[rowIndex * 2];
                const bird2 = filteredBirds[rowIndex * 2 + 1];

                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="grid grid-cols-2 gap-2 px-1"
                  >
                    {bird1 && (
                      <BirdCard
                        bird={bird1}
                        isSelected={selectedBirds.has(bird1.fullName)}
                        isLimitDisabled={!selectedBirds.has(bird1.fullName) && !canSelectMore}
                        isJokerEligible={!!(bird1.groupName && jokerEligibleGroups.has(bird1.groupName))}
                        specialBadge={specialBadgeFor(bird1)}
                        onToggle={toggleBird}
                      />
                    )}
                    {bird2 && (
                      <BirdCard
                        bird={bird2}
                        isSelected={selectedBirds.has(bird2.fullName)}
                        isLimitDisabled={!selectedBirds.has(bird2.fullName) && !canSelectMore}
                        isJokerEligible={!!(bird2.groupName && jokerEligibleGroups.has(bird2.groupName))}
                        specialBadge={specialBadgeFor(bird2)}
                        onToggle={toggleBird}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {filteredBirds.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Birds Found</h3>
                <p className="text-muted-foreground">Try adjusting your search query.</p>
              </CardContent>
            </Card>
          )}

          {/* Bottom Actions (for mobile) */}
          <Card className="sticky bottom-4 sm:hidden shadow-lg">
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  disabled={totalSelected === 0 || isPending}
                  className="flex-1"
                >
                  Clear
                </Button>
                <Button
                  onClick={() => setStep("review")}
                  disabled={totalSelected === 0 || isPending}
                  className="flex-1"
                >
                  Twitch ({totalSelected})
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
