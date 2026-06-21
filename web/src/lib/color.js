function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbToHsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

function hslToRgb([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgb.map((v) => Math.round((v + m) * 255));
}

// Derives a lighter hover/highlight shade from a single user-picked color,
// so the palette UI only has to ask for one color per role.
function lighten(hex, amount) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return hslToRgb([h, s, Math.min(1, l + amount)]);
}

// Builds the set of `--color-*` CSS variable values (as space-separated RGB
// triplets, for Tailwind's `rgb(var(--x) / <alpha-value>)` pattern) for a
// {primary, secondary} hex pair.
export function buildPaletteVars({ primary, secondary }) {
  return {
    "primary-500": hexToRgb(primary).join(" "),
    "primary-400": lighten(primary, 0.1).join(" "),
    "secondary-500": hexToRgb(secondary).join(" "),
    "secondary-400": lighten(secondary, 0.1).join(" "),
  };
}
