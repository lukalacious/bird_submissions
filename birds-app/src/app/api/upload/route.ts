import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCurrentChallengeMonth, getSpecialBirdSpecies } from "@/lib/settings-utils";
import { getBlobToken } from "@/lib/blob-token";

/**
 * Client-upload token endpoint for proof photos of the month's designated
 * photo birds. The browser uploads straight to Vercel Blob (avoids the
 * server action body limit); this route only authorizes the upload.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: getBlobToken(),
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user?.id) {
          throw new Error("Not signed in");
        }

        // Uploads are restricted to this month's BONUS birds (golden +
        // photography) — matched by SPECIES since regional common names
        // differ (Southern/Common Fiscal)
        const { year, month } = getCurrentChallengeMonth();
        const { photoSpecies, goldenSpecies } = await getSpecialBirdSpecies(year, month);
        const birdName = clientPayload ? (JSON.parse(clientPayload) as { birdName?: string }).birdName : undefined;

        let isBonusBird = false;
        if (birdName && (photoSpecies.size > 0 || goldenSpecies.size > 0)) {
          const bird = await prisma.bird.findFirst({
            where: { fullName: { equals: birdName, mode: "insensitive" } },
            select: { scientificName: true },
          });
          isBonusBird =
            !!bird &&
            (photoSpecies.has(bird.scientificName) || goldenSpecies.has(bird.scientificName));
        }
        if (!isBonusBird) {
          throw new Error("Photos can only be attached to this month's golden or photo birds");
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
          maximumSizeInBytes: 5 * 1024 * 1024, // 5MB (client compresses first)
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id, birdName }),
        };
      },
      onUploadCompleted: async () => {
        // photoUrl is persisted via submitBirds; nothing to do here
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
