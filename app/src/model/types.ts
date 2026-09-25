// Document model shared by the design and video editors (SPEC §3.1, §3.4).

export type ElType = 'text' | 'rect' | 'circle' | 'line' | 'image' | 'chart' | 'table' | 'qr' | 'shape';
export type ShapeKind = 'triangle' | 'diamond' | 'hexagon' | 'star' | 'arrow' | 'heart' | 'bubble' | 'burst';
export interface ImgAdjust { bri?: number; con?: number; sat?: number; blur?: number; gray?: number; hue?: number } // -100..100, blur/gray 0..100
export type Anim = 'none' | 'fade' | 'slide' | 'zoom' | 'pop';
export type FontKey = 'sans' | 'serif' | 'mono' | 'anton' | 'archivo' | 'bebas' | 'caveat' | 'dmserif' | 'montserrat' | 'playfair';

export interface El {
  id: string;
  type: ElType;
  name: string;
  x: number; y: number; w: number; h: number;
  rot?: number;
  opacity?: number;
  flipX?: boolean;
  flipY?: boolean;
  hidden?: boolean;
  locked?: boolean;
  groupId?: string;
  compId?: string;
  // text
  text?: string;
  size?: number;
  weight?: number;
  color?: string;
  font?: FontKey;
  align?: 'left' | 'center' | 'right';
  lh?: number;
  upper?: boolean;
  italic?: boolean;
  ls?: number; // letter spacing in thousandths of an em
  fx?: { shadow?: boolean; outline?: boolean; bg?: boolean };
  // shapes
  fill?: string;
  radius?: number;
  stroke?: string;
  strokeW?: number;
  // image
  mediaId?: string;
  fit?: 'cover' | 'contain';
  adj?: ImgAdjust;
  // vector shapes
  shape?: ShapeKind;
  // chart / table / qr
  data?: [string, number][];
  kind?: 'col' | 'bar';
  rows?: string[][];
  qr?: string;
  // motion
  anim?: Anim;
  delay?: number;
}

export interface Page {
  id: string;
  w: number;
  h: number;
  bg: string;
  label?: string;
  els: El[];
  dur?: number; // seconds, for animated export
}

export interface DesignData {
  pages: Page[];
  components?: { id: string; name: string }[];
}

export type TrackId = 'broll' | 'text' | 'video' | 'audio' | 'music';

export interface ClipFx {
  bri: number; con: number; sat: number; temp: number; // -100..100
  filter?: 'warm' | 'cool' | 'matte' | 'contrast' | 'bw' | 'vintage';
  filterAmt?: number; // 0..100
  blur?: number; glow?: number; vignette?: number; // 0..100
}

export interface Clip {
  id: string;
  track: TrackId;
  kind: 'video' | 'image' | 'audio' | 'text';
  mediaId?: string;
  name: string;
  start: number; // timeline seconds
  dur: number; // timeline seconds
  in: number; // source offset seconds
  speed?: number;
  volume?: number; // 0..2
  muted?: boolean;
  fit?: 'cover' | 'contain';
  x?: number; y?: number; scale?: number; rot?: number; opacity?: number; // transform, percent of frame
  fx?: ClipFx;
  trIn?: { type: 'fade' | 'dip' | 'slide' | 'zoom' | 'blur'; dur: number };
  trOut?: { type: 'fade' | 'dip'; dur: number };
  fadeIn?: number; fadeOut?: number; // audio
  // text clips
  text?: string;
  style?: { size: number; color: string; weight: number; font: FontKey; bg?: string; y: number; anim?: Anim };
}

export interface Caption { id: string; start: number; end: number; text: string; spk?: number }
export type CapStyle = 'tiktok' | 'karaoke' | 'boxed' | 'minimal';

export interface VideoData {
  w: number;
  h: number;
  fps: number;
  bg: string;
  clips: Clip[];
  captions: Caption[];
  capStyle: CapStyle;
  capY: number; // percent from top
  markers: number[];
}

export type DocKind = 'design' | 'video';

export interface DocMeta {
  id: string;
  kind: DocKind;
  name: string;
  createdAt: number;
  updatedAt: number;
  trashedAt?: number;
  thumb?: string; // small data URL
  format: string; // human label e.g. "1080×1920"
}

export interface Doc<T = DesignData | VideoData> extends DocMeta {
  data: T;
}

export interface MediaItem {
  id: string;
  name: string;
  kind: 'video' | 'image' | 'audio';
  mime: string;
  size: number;
  w?: number;
  h?: number;
  duration?: number;
  hash: string;
  createdAt: number;
  source: 'import' | 'capture' | 'recording' | 'generated';
  folder?: string;
  thumb?: string;
}

export interface Version {
  id: string;
  docId: string;
  at: number;
  origin: 'user' | 'agent' | 'autosave' | 'restore';
  label: string;
  data: DesignData | VideoData;
  name: string;
}

export interface BrandKit {
  name: string;
  colors: string[];
  logoMediaId?: string;
  fonts: { heading: FontKey; body: FontKey };
  tone: string;
}

export interface PlannedPost {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  nets: string[];
  docId?: string;
  title: string;
  caption: string;
  status: 'draft' | 'scheduled' | 'published';
}
