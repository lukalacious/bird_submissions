"use client";

import { Modal } from "@/components/ui/modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bird, Users } from "lucide-react";

interface BirdUser {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
}

interface BirdUsersModalProps {
  open: boolean;
  onClose: () => void;
  birdName: string;
  users: BirdUser[];
}

export function BirdUsersModal({ open, onClose, birdName, users }: BirdUsersModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
            <Bird className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{birdName}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {users.length} {users.length === 1 ? "person" : "people"} logged this bird
            </p>
          </div>
        </div>

        {/* User list */}
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {users.map((user) => {
            const initials = (user.username || user.name || "?")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.image || undefined} />
                  <AvatarFallback className="bg-purple-100 text-purple-700 text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {user.username || user.name || "Anonymous"}
                  </p>
                  {user.username && user.name && user.username !== user.name && (
                    <p className="text-xs text-gray-500 truncate">{user.name}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
