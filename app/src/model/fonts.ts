import type { FontKey } from './types';

// Open-licensed (OFL) families served by Google Fonts, plus system stacks.
export const FONTS: Record<FontKey, { label: string; css: string }> = {
  sans: { label: 'Geist', css: "'Geist', -apple-system, 'Segoe UI', Roboto, sans-serif" },
  serif: { label: 'Serif', css: "Georgia, 'Times New Roman', serif" },
  mono: { label: 'Geist Mono', css: "'Geist Mono', ui-monospace, Menlo, monospace" },
  anton: { label: 'Anton', css: "'Anton', Impact, 'Arial Narrow', sans-serif" },
  archivo: { label: 'Archivo Black', css: "'Archivo Black', 'Arial Black', sans-serif" },
  bebas: { label: 'Bebas Neue', css: "'Bebas Neue', Impact, sans-serif" },
  caveat: { label: 'Caveat', css: "'Caveat', 'Comic Sans MS', cursive" },
  dmserif: { label: 'DM Serif Display', css: "'DM Serif Display', Georgia, serif" },
  montserrat: { label: 'Montserrat', css: "'Montserrat', 'Helvetica Neue', Arial, sans-serif" },
  playfair: { label: 'Playfair Display', css: "'Playfair Display', Georgia, serif" },
};

export const fontCss = (k?: FontKey) => FONTS[k ?? 'sans']?.css ?? FONTS.sans.css;
export const FONT_KEYS = Object.keys(FONTS) as FontKey[];
