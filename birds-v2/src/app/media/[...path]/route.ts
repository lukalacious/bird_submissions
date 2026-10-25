import { get } from "@vercel/blob";
import { getCurrentUser } from "@/lib/dal";
import { isMediaPath } from "@/lib/photos";

/**
 * Serves images from the private Blob store to signed-in players only.
 * Paths look like /media/photos/<user>/<submission>-<rand>.jpg.
 */
export async function GET(request: Request, { params }: RouteContext<"/media/[...path]">) {
  if (!(await getCurrentUser())) return new Response("Sign in to see photos", { status: 401 });
  const pathname = (await params).path.join("/");
  if (!isMediaPath(pathname)) return new Response("Not found", { status: 404 });

  const result = await get(pathname, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN,
    ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
  }).catch(() => null);
  if (!result) return new Response("Not found", { status: 404 });

  // uploads get a random suffix, so a path's content never changes
  const cache = { "Cache-Control": "private, max-age=604800, immutable" };
  if (result.statusCode === 304) return new Response(null, { status: 304, headers: { ...cache, ETag: result.headers.get("etag") ?? "" } });
  return new Response(result.stream, {
    headers: { ...cache, "Content-Type": result.blob.contentType, ETag: result.blob.etag },
  });
}
