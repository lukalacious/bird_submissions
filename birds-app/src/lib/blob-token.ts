/**
 * The Vercel Blob store was connected to this project with a custom env
 * prefix, so the token is exposed as BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
 * instead of the BLOB_READ_WRITE_TOKEN name that @vercel/blob reads by
 * default. Pass this token explicitly to handleUpload/del.
 */
export function getBlobToken(): string | undefined {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
  );
}
