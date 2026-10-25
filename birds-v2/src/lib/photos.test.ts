import { describe, expect, it } from "vitest";
import { isOwnAvatarUrl, isOwnPhotoUrl, photoPath, takenInMonth } from "./photos";

const host = "https://abc123.public.blob.vercel-storage.com";

describe("isOwnPhotoUrl", () => {
  it("accepts the player's own upload with the random suffix", () => {
    expect(isOwnPhotoUrl(`${host}/photos/u1/s1-Xy9aB.jpg`, "u1", "s1")).toBe(true);
  });

  it("rejects another player's folder", () => {
    expect(isOwnPhotoUrl(`${host}/photos/u2/s1-Xy9aB.jpg`, "u1", "s1")).toBe(false);
  });

  it("rejects a photo uploaded for a different bird", () => {
    expect(isOwnPhotoUrl(`${host}/photos/u1/s2-Xy9aB.jpg`, "u1", "s1")).toBe(false);
  });

  it("rejects other hosts, lookalikes and plain http", () => {
    expect(isOwnPhotoUrl("https://evil.example/photos/u1/s1.jpg", "u1", "s1")).toBe(false);
    expect(isOwnPhotoUrl("https://public.blob.vercel-storage.com.evil.example/photos/u1/s1.jpg", "u1", "s1")).toBe(false);
    expect(isOwnPhotoUrl("http://abc.public.blob.vercel-storage.com/photos/u1/s1.jpg", "u1", "s1")).toBe(false);
    expect(isOwnPhotoUrl("not a url", "u1", "s1")).toBe(false);
    expect(isOwnPhotoUrl(`${host}/photos/u1/s10-Xy9aB.jpg`, "u1", "s1")).toBe(false);
  });

  it("builds paths inside the player's folder", () => {
    expect(photoPath("u1", "s1")).toBe("photos/u1/s1.jpg");
  });
});

describe("takenInMonth", () => {
  const oct = { year: 2026, month: 10 };

  it("uses SAST: 23:30 UTC on 31 Oct is already November", () => {
    expect(takenInMonth(new Date("2026-10-31T23:30:00Z"), oct)).toBe(false);
    expect(takenInMonth(new Date("2026-10-31T21:30:00Z"), oct)).toBe(true);
  });

  it("is unknown without an EXIF date", () => {
    expect(takenInMonth(null, oct)).toBeNull();
  });
});

describe("isOwnAvatarUrl", () => {
  it("accepts the player's own profile picture only", () => {
    expect(isOwnAvatarUrl(`${host}/avatars/u1-Ab12.jpg`, "u1")).toBe(true);
    expect(isOwnAvatarUrl(`${host}/avatars/u2-Ab12.jpg`, "u1")).toBe(false);
    expect(isOwnAvatarUrl(`${host}/photos/u1/s1.jpg`, "u1")).toBe(false);
    expect(isOwnAvatarUrl(`${host}/avatars/u10-Ab12.jpg`, "u1")).toBe(false);
  });
});
