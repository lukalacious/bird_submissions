"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { adminEliminateUser, adminReinstateUser } from "@/app/actions/elimination-actions";
import { AlertTriangle, Check, Shield, UserX, UserCheck } from "lucide-react";

interface UserWithStats {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isEliminated: boolean;
  eliminationMonth: number | null;
  joinedMonth: number;
  monthlySubmissions: Record<number, number>;
  totalSubmissions: number;
}

interface EliminationManagementProps {
  users: UserWithStats[];
  currentYear: number;
  threshold: number;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function EliminationManagement({
  users,
  currentYear,
  threshold,
}: EliminationManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "active" | "eliminated">("all");

  const currentMonth = new Date().getMonth() + 1;

  const filteredUsers = users.filter((user) => {
    if (filter === "active") return !user.isEliminated;
    if (filter === "eliminated") return user.isEliminated;
    return true;
  });

  const activeCount = users.filter((u) => !u.isEliminated).length;
  const eliminatedCount = users.filter((u) => u.isEliminated).length;

  const handleEliminate = (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to eliminate ${userName}?`)) return;

    startTransition(async () => {
      const result = await adminEliminateUser(userId, currentYear, currentMonth);
      if (result.success) {
        toast.success(`${userName} has been eliminated`);
      } else {
        toast.error(result.error || "Failed to eliminate user");
      }
    });
  };

  const handleReinstate = (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to reinstate ${userName}?`)) return;

    startTransition(async () => {
      const result = await adminReinstateUser(userId, currentYear);
      if (result.success) {
        toast.success(`${userName} has been reinstated`);
      } else {
        toast.error(result.error || "Failed to reinstate user");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Elimination Management</h1>
        <p className="text-gray-600">
          Manage challenge elimination status for {currentYear}. Threshold: {threshold} birds/month.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer transition ${filter === "all" ? "ring-2 ring-purple-500" : ""}`}
          onClick={() => setFilter("all")}
        >
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-gray-900">{users.length}</div>
            <div className="text-sm text-gray-500">Total Users</div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition ${filter === "active" ? "ring-2 ring-green-500" : ""}`}
          onClick={() => setFilter("active")}
        >
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{activeCount}</div>
            <div className="text-sm text-gray-500">Active</div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition ${filter === "eliminated" ? "ring-2 ring-red-500" : ""}`}
          onClick={() => setFilter("eliminated")}
        >
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-red-600">{eliminatedCount}</div>
            <div className="text-sm text-gray-500">Eliminated</div>
          </CardContent>
        </Card>
      </div>

      {/* User list */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Click on a user to manage their elimination status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const initials = user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              const currentMonthSubmissions = user.monthlySubmissions[currentMonth] || 0;
              const isAtRisk = currentMonthSubmissions < threshold && !user.isEliminated;

              return (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    user.isEliminated
                      ? "bg-red-50 border-red-200"
                      : isAtRisk
                      ? "bg-amber-50 border-amber-200"
                      : "bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.image || undefined} />
                      <AvatarFallback className={user.isEliminated ? "bg-red-200" : "bg-purple-100"}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        {user.isEliminated && (
                          <Badge variant="destructive" className="text-xs">
                            Eliminated
                          </Badge>
                        )}
                        {isAtRisk && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                            At Risk
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Monthly progress */}
                    <div className="hidden sm:flex items-center gap-1">
                      {MONTH_NAMES.slice(0, currentMonth).map((month, idx) => {
                        const count = user.monthlySubmissions[idx + 1] || 0;
                        const meetsThreshold = count >= threshold;
                        return (
                          <div
                            key={month}
                            className={`w-6 h-6 rounded text-xs flex items-center justify-center ${
                              meetsThreshold
                                ? "bg-green-100 text-green-700"
                                : count > 0
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-400"
                            }`}
                            title={`${month}: ${count} birds`}
                          >
                            {count > 0 ? count : "-"}
                          </div>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    {user.isEliminated ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReinstate(user.id, user.name)}
                        disabled={isPending}
                        className="gap-1"
                      >
                        <UserCheck className="h-4 w-4" />
                        Reinstate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEliminate(user.id, user.name)}
                        disabled={isPending}
                        className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <UserX className="h-4 w-4" />
                        Eliminate
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
