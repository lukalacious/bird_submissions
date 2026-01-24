"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { submitBirds } from "@/app/actions/submit-birds";
import { MapPin, Search, AlertTriangle, Check, X, ChevronLeft } from "lucide-react";

interface Bird {
  id: string;
  fullName: string;
  scientificName: string;
  alphabeticalName: string;
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
  userId: string;
}

export function BirdSubmissionForm({
  region,
  birds,
  maxBirds,
  currentYear,
  currentMonth,
  userId,
}: BirdSubmissionFormProps) {
  const [selectedBirds, setSelectedBirds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [step, setStep] = useState<"select" | "review">("select");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Guard: if in review with no selection, go back to select
  useEffect(() => {
    if (step === "review" && selectedBirds.size === 0) {
      setStep("select");
    }
  }, [step, selectedBirds.size]);

  const canSelectMore = selectedBirds.size < maxBirds;
  const limitReached = selectedBirds.size >= maxBirds;

  const filteredBirds = birds.filter(
    (bird) =>
      bird.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bird.scientificName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleBird = (birdName: string) => {
    setSelectedBirds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(birdName)) {
        newSet.delete(birdName);
      } else if (newSet.size < maxBirds) {
        newSet.add(birdName);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedBirds(new Set());
  };

  const handleSubmit = () => {
    if (selectedBirds.size === 0) {
      toast.error("Please select at least one bird");
      return;
    }

    startTransition(async () => {
      const result = await submitBirds({
        userId,
        regionId: region.id,
        birdNames: Array.from(selectedBirds),
        year: currentYear,
        month: currentMonth,
      });

      if (result.success) {
        router.push(`/success?count=${result.count}&region=${region.name}`);
      } else {
        toast.error(result.error || "Failed to submit birds");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <MapPin className="h-4 w-4" />
            <span>{region.label}</span>
            <span>•</span>
            <span>{currentYear}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === "review" ? "Review your selection" : "Select Your Birds"}
          </h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/region">Change Region</Link>
        </Button>
      </div>

      {step === "review" ? (
        /* Review card */
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Review your selection</h2>
            <p className="text-sm text-gray-600">
              You&apos;re about to submit {selectedBirds.size} bird
              {selectedBirds.size !== 1 ? "s" : ""} for {region.label} in {currentYear}.
            </p>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {Array.from(selectedBirds)
                .sort((a, b) => a.localeCompare(b))
                .map((fullName) => {
                  const sci = birds.find((b) => b.fullName === fullName)?.scientificName ?? "";
                  return (
                    <li key={fullName} className="text-sm">
                      <span className="font-medium text-gray-900">{fullName}</span>
                      {sci && <span className="italic text-gray-500"> ({sci})</span>}
                    </li>
                  );
                })}
            </ul>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("select")} disabled={isPending}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Edit selection
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
                    Confirm and submit
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
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <motion.div 
                      key={selectedBirds.size}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-bold text-purple-600"
                    >
                      {selectedBirds.size}
                    </motion.div>
                    <div className="text-sm text-gray-500">of {maxBirds}</div>
                  </div>
                  {limitReached && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Maximum reached</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={clearSelection}
                    disabled={selectedBirds.size === 0 || isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                  <Button
                    onClick={() => setStep("review")}
                    disabled={selectedBirds.size === 0 || isPending}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Submit {selectedBirds.size} Bird{selectedBirds.size !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
              <AnimatePresence>
                {selectedBirds.size > 0 && (
                  <motion.div 
                    className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-gray-100"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <AnimatePresence mode="popLayout">
                      {Array.from(selectedBirds)
                        .sort((a, b) => a.localeCompare(b))
                        .map((fullName) => (
                          <motion.span
                            key={fullName}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-sm text-purple-800"
                          >
                            {fullName}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBird(fullName);
                              }}
                              className="rounded-full p-0.5 hover:bg-purple-200"
                              aria-label={`Remove ${fullName}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </motion.span>
                        ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search birds by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Bird Grid */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.03 },
              },
            }}
          >
            {filteredBirds.map((bird) => {
              const isSelected = selectedBirds.has(bird.fullName);
              const isLimitDisabled = !isSelected && !canSelectMore;

              return (
                <motion.div
                  key={bird.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  whileTap={{ scale: bird.isDisabled || isLimitDisabled ? 1 : 0.98 }}
                >
                  <Card
                    className={`relative cursor-pointer transition-all ${
                      bird.isDisabled
                        ? "opacity-50 bg-gray-50 cursor-not-allowed"
                        : isSelected
                        ? "ring-2 ring-purple-500 bg-purple-50"
                        : isLimitDisabled
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:border-purple-300 hover:shadow-md"
                    }`}
                    onClick={() => {
                      if (!bird.isDisabled && !isLimitDisabled) {
                        toggleBird(bird.fullName);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <motion.div
                          animate={isSelected ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Checkbox
                            checked={isSelected}
                            disabled={bird.isDisabled || isLimitDisabled}
                            className="mt-1 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                          />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {bird.fullName}
                          </p>
                          <p className="text-sm text-gray-500 italic truncate">
                            {bird.scientificName}
                          </p>
                          {bird.isDisabled && (
                            <Badge variant="secondary" className="mt-2 bg-amber-100 text-amber-800">
                              Already Submitted
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {filteredBirds.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No birds found</h3>
                <p className="text-gray-500">Try adjusting your search query</p>
              </CardContent>
            </Card>
          )}

          {/* Bottom Actions (for mobile) */}
          <Card className="sticky bottom-4 sm:hidden">
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  disabled={selectedBirds.size === 0 || isPending}
                  className="flex-1"
                >
                  Clear
                </Button>
                <Button
                  onClick={() => setStep("review")}
                  disabled={selectedBirds.size === 0 || isPending}
                  className="flex-1"
                >
                  Submit ({selectedBirds.size})
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
