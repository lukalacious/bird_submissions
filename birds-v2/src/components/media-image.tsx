import Image, { type ImageProps } from "next/image";
import { mediaUrl } from "@/lib/photos";

/**
 * <Image> for player photos and profile pictures. Private Blob images come
 * through /media (auth-checked), which Next's optimizer can't call with the
 * player's cookie — they're already resized at upload, so skip it for those.
 */
export function MediaImage({ src, alt, ...props }: Omit<ImageProps, "src" | "alt"> & { src: string; alt: string }) {
  const url = mediaUrl(src);
  return <Image src={url} alt={alt} unoptimized={url.startsWith("/media/")} {...props} />;
}
