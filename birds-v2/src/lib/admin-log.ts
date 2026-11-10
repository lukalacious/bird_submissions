import "server-only";
import { db } from "@/lib/db";

/** Record something an admin did by hand. Names are copied so the row still reads after a player is removed. */
export async function logAdmin(
  admin: { id: string; name?: string | null; email?: string | null },
  action: string,
  player?: { id: string; name: string } | null,
  detail?: string
) {
  await db.adminLog.create({
    data: {
      adminId: admin.id,
      adminName: admin.name ?? admin.email ?? "Admin",
      action,
      playerId: player?.id,
      playerName: player?.name,
      detail,
    },
  });
}
