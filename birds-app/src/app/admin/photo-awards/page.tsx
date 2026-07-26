import { getPhotosForReview } from "@/app/actions/photo-actions";
import prisma from "@/lib/prisma";
import { PhotoAwardPanel } from "@/components/admin/photo-award-panel";

export const dynamic = "force-dynamic";

export default async function PhotoAwardsPage() {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const year = settings?.currentYear ?? new Date().getFullYear();
  const photos = await getPhotosForReview(year);

  return <PhotoAwardPanel photos={JSON.parse(JSON.stringify(photos))} year={year} />;
}
