"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { addUser } from "@/app/actions/admin-actions";
import { UserPlus, Mail } from "lucide-react";

export default function AddUserPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    startTransition(async () => {
      const result = await addUser({
        email: email.trim().toLowerCase(),
        name: name.trim() || undefined,
        isAdmin,
      });

      if (result.success) {
        toast.success(`User ${email} has been added successfully`);
        setEmail("");
        setName("");
        setIsAdmin(false);
      } else {
        toast.error(result.error || "Failed to add user");
      }
    });
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New User</h1>
        <p className="text-gray-600">
          Invite a new user to the Bird Submission Tracker
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            User Details
          </CardTitle>
          <CardDescription>
            Enter the email address of the person you want to invite. They will be able to
            sign in with their Google account using this email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-sm text-gray-500">
                This must match their Google account email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                Will be updated when they first sign in
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="isAdmin"
                checked={isAdmin}
                onCheckedChange={(checked) => setIsAdmin(checked === true)}
              />
              <Label htmlFor="isAdmin" className="cursor-pointer">
                Grant admin privileges
              </Label>
            </div>
            <p className="text-sm text-gray-500 ml-6">
              Admins can manage users and app settings
            </p>

            <Button type="submit" disabled={isPending} className="w-full mt-6">
              {isPending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Adding User...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
