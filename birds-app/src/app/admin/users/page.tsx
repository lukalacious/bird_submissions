import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserActions } from "@/components/admin/user-actions";
import { Users, Shield, User } from "lucide-react";

async function getUsers() {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const currentYear = settings?.currentYear || new Date().getFullYear();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          submissions: {
            where: { year: currentYear },
          },
        },
      },
      invitedBy: {
        select: { name: true, email: true },
      },
    },
  });

  return { users, currentYear };
}

export default async function UsersPage() {
  const { users, currentYear } = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage registered users and their access</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {users.length} user{users.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            Users who have been invited to use the Bird Submission Tracker
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No users yet. Add users from the &quot;Add User&quot; page.
            </p>
          ) : (
            <div className="divide-y">
              {users.map((user) => {
                const initials = user.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || user.email[0].toUpperCase();

                return (
                  <div
                    key={user.id}
                    className="py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback className="bg-purple-100 text-purple-700">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {user.name || user.email}
                          </p>
                          {user.role === "ADMIN" ? (
                            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <User className="h-3 w-3 mr-1" />
                              User
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                          <span>
                            {user._count.submissions} submissions in {currentYear}
                          </span>
                          {user.invitedBy && (
                            <span>
                              Invited by {user.invitedBy.name || user.invitedBy.email}
                            </span>
                          )}
                          <span>
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <UserActions user={user} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
