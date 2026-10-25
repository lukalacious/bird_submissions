import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { PHOTO_MAX_BYTES, PHOTO_TYPES, photoPath } from "@/lib/photos";

const Payload = z.object({ submissionId: z.string().min(1) });

/**
 * Hands the browser a short-lived token to upload one photo straight to
 * Blob, only for a bird on the player's own list and only into their folder.
 * The photo is saved to the DB afterwards by attachPhoto().
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
        const { submissionId } = Payload.parse(JSON.parse(clientPayload ?? "{}"));
        const sub = await db.submission.findFirst({ where: { id: submissionId, userId: user.id }, select: { id: true } });
        if (!sub) throw new Error("That bird isn't on your list");
        if (pathname !== photoPath(user.id, submissionId)) throw new Error("Unexpected upload path");
        return { allowedContentTypes: PHOTO_TYPES, maximumSizeInBytes: PHOTO_MAX_BYTES, addRandomSuffix: true };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
