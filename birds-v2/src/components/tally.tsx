/**
 * The month as a birder's tally: bundles of four strokes crossed by a fifth,
 * one stroke per bird slot. Twitched birds are inked, open slots are faint.
 */

const STROKE_GAP = 9;
const BUNDLE_WIDTH = 4 * STROKE_GAP + 10;
const HEIGHT = 40;

// Deterministic wobble so strokes look hand-drawn but never shift between renders
function wobble(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 2;
}

export function Tally({ count, cap, decorative = false }: { count: number; cap: number; decorative?: boolean }) {
  const bundles = Math.ceil(cap / 5);
  const width = bundles * BUNDLE_WIDTH;
  const strokes = [];

  for (let i = 0; i < cap; i++) {
    const bundle = Math.floor(i / 5);
    const pos = i % 5;
    const x0 = bundle * BUNDLE_WIDTH + 4;
    const filled = i < count;
    const props = {
      key: i,
      stroke: filled ? "var(--ink)" : "var(--rule)",
      strokeWidth: filled ? 3 : 2.25,
      strokeLinecap: "round" as const,
    };

    if (pos < 4) {
      const x = x0 + pos * STROKE_GAP;
      strokes.push(
        <line {...props} x1={x + wobble(i, 1)} y1={6 + wobble(i, 2)} x2={x + wobble(i, 3)} y2={HEIGHT - 6} />
      );
    } else {
      // The fifth stroke crosses the bundle
      strokes.push(
        <line
          {...props}
          x1={x0 - 4}
          y1={HEIGHT - 10 + wobble(i, 4) * 2}
          x2={x0 + 3 * STROKE_GAP + 4}
          y2={10 + wobble(i, 5) * 2}
        />
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${HEIGHT}`}
      className="h-auto w-full max-w-md"
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": `${count} of ${cap} birds twitched this month` })}
    >
      {strokes}
    </svg>
  );
}
