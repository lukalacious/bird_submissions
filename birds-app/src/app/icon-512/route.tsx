import { ImageResponse } from "next/og";

export const runtime = "edge";

// 512x512 PWA icon (matches src/app/icon.tsx design)
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 320,
          background: "linear-gradient(135deg, #5b7ab8 0%, #4a6ba3 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        🐦
      </div>
    ),
    { width: 512, height: 512 }
  );
}
