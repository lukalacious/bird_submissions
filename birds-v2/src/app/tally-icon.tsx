import { ImageResponse } from "next/og";

// The app's mark: a birder's tally (four strokes crossed by a fifth),
// paper on bush-green. Shared by icon.tsx and apple-icon.tsx.
export function tallyIcon(size: number) {
  const stroke = Math.round(size * 0.06);
  const h = Math.round(size * 0.42);
  const gap = Math.round(size * 0.1);
  // four strokes span 3 gaps + 1 stroke = 36% of the width; centre them
  const left = Math.round((size - 3 * gap - stroke) / 2);
  const top = Math.round((size - h) / 2);
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", background: "#22382a", position: "relative" }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ position: "absolute", left: left + i * gap, top, width: stroke, height: h, borderRadius: stroke, background: "#eef4ee" }} />
        ))}
        <div
          style={{
            position: "absolute",
            left: left - gap * 0.6,
            top: size / 2 - stroke / 2,
            width: gap * 4.4,
            height: stroke,
            borderRadius: stroke,
            background: "#5fb7d9",
            transform: "rotate(-28deg)",
          }}
        />
      </div>
    ),
    { width: size, height: size }
  );
}
