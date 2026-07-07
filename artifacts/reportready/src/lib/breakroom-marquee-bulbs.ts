/** Percent positions for marquee bulb overlays (aligned to visible arrow after clip-path). */
export const MARQUEE_BULB_POSITIONS: ReadonlyArray<{ top: number; left: number }> = [
  // Top row — along the inner bulb strip
  { top: 16, left: 6 },
  { top: 15.5, left: 12 },
  { top: 15, left: 18 },
  { top: 15, left: 24 },
  { top: 15, left: 30 },
  { top: 15, left: 36 },
  { top: 15, left: 42 },
  { top: 15, left: 48 },
  { top: 15, left: 54 },
  { top: 15, left: 60 },
  { top: 15.5, left: 66 },
  { top: 16, left: 72 },
  { top: 17, left: 77 },
  { top: 19, left: 81 },
  // Bottom row
  { top: 84, left: 6 },
  { top: 84.5, left: 12 },
  { top: 85, left: 18 },
  { top: 85, left: 24 },
  { top: 85, left: 30 },
  { top: 85, left: 36 },
  { top: 85, left: 42 },
  { top: 85, left: 48 },
  { top: 85, left: 54 },
  { top: 85, left: 60 },
  { top: 84.5, left: 66 },
  { top: 84, left: 72 },
  { top: 83, left: 77 },
];

export const MARQUEE_BULB_COUNT = MARQUEE_BULB_POSITIONS.length;
