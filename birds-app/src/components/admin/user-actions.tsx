"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toggleUserRole, deleteUser } from "@/app/actions/admin-actions";
import { MoreHorizontal, Shield, ShieldOff, Trash2 } from "lucide-react";
import { Role } from "@prisma/client";

interface UserActionsProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
  };
}

export function UserActions({ user }: UserActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggleRole = () => {
    startTransition(async () => {
      const result = await toggleUserRole(user.id);
      if (result.success) {
        toast.success(
          `${user.name || user.email} is now ${result.newRole === "ADMIN" ? "an admin" : "a regular user"}`
        );
      } else {
        toast.error(result.error || "Failed to update user role");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to remove ${user.name || user.email}? This action cannot be undone.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (result.success) {
        toast.success(`${user.name || user.email} has been removed`);
      } else {
        toast.error(result.error || "Failed to remove user");
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleToggleRole} className="cursor-pointer">
          {user.role === "ADMIN" ? (
            <>
              <ShieldOff className="mr-2 h-4 w-4" />
              Remove Admin
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Make Admin
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remove User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
