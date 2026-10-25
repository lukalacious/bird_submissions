import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { goldenPhotoMonthFor } from "@/lib/checklist";
import { AVATAR_MAX_BYTES, PHOTO_MAX_BYTES, PHOTO_TYPES, avatarPath, photoPath } from "@/lib/photos";

const Payload = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("golden"), submissionId: z.string().min(1) }),
  z.object({ kind: z.literal("avatar") }),
]);

/**
 * Hands the browser a short-lived token to upload one image straight to
 * Blob, only into the player's own folder:
 *  - golden: proof photo for a golden bird on their own list
 *  - avatar: their profile picture
 * The image is saved to the DB afterwards by attachPhoto() / saveAvatar().
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      // v1's store used a custom env prefix; accept either name
      token: process.env.BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await getCurrentUser();
        if (!user) throw new Error("Sign in to add photos");
        const payload = Payload.parse(JSON.parse(clientPayload ?? "{}"));

        if (payload.kind === "avatar") {
          if (pathname !== avatarPath(user.id)) throw new Error("Unexpected upload path");
          return { allowedContentTypes: PHOTO_TYPES, maximumSizeInBytes: AVATAR_MAX_BYTES, addRandomSuffix: true };
        }

        const sub = await db.submission.findFirst({
          where: { id: payload.submissionId, userId: user.id },
          select: { id: true, speciesId: true },
        });
        if (!sub) throw new Error("That bird isn't on your list");
        if (!(await goldenPhotoMonthFor(sub.speciesId))) throw new Error("Photos are for this month's golden birds only");
        if (pathname !== photoPath(user.id, sub.id)) throw new Error("Unexpected upload path");
        return { allowedContentTypes: PHOTO_TYPES, maximumSizeInBytes: PHOTO_MAX_BYTES, addRandomSuffix: true };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
