// Video understanding without a video-capable model: key frames (one every ~2 s, spread over
// long videos) and the audio track as 16 kHz mono WAV for transcription.

export async function videoFrames(file: Blob, opts: { every?: number; max?: number; width?: number; onProgress?: (p: number) => void } = {}): Promise<{ frames: { t: number; blob: Blob }[]; duration: number; w: number; h: number }> {
  const every = opts.every ?? 2, max = opts.max ?? 12, width = opts.width ?? 768;
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
  try {
    await new Promise<void>((res, rej) => { v.onloadedmetadata = () => res(); v.onerror = () => rej(new Error('Vidéo illisible par ce navigateur (codec non pris en charge)')); setTimeout(() => rej(new Error('Délai dépassé en lisant la vidéo')), 20000); });
    // Recorder WebM files (screen captures, messaging apps) often report an infinite duration
    // until the browser seeks to the end.
    if (!Number.isFinite(v.duration)) {
      await new Promise<void>((res) => { const done = () => { v.removeEventListener('durationchange', check); res(); }; const check = () => { if (Number.isFinite(v.duration)) done(); }; v.addEventListener('durationchange', check); v.currentTime = 1e101; setTimeout(done, 5000); });
      v.currentTime = 0;
    }
    const dur = Number.isFinite(v.duration) ? v.duration : 0;
    // One frame every `every` seconds; long videos get `max` frames spread evenly instead.
    const n = Math.max(1, Math.min(max, Math.floor(dur / every) + 1));
    const step = n > 1 ? (Math.floor(dur / every) + 1 > max ? dur / (n - 1) : every) : 0;
    const scale = Math.min(1, width / (v.videoWidth || width));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round((v.videoWidth || 640) * scale)); c.height = Math.max(1, Math.round((v.videoHeight || 360) * scale));
    const ctx = c.getContext('2d')!;
    const frames: { t: number; blob: Blob }[] = [];
    for (let i = 0; i < n; i++) {
      const t = Math.min(Math.max(0, dur - 0.05), i * step);
      await new Promise<void>((res) => { const done = () => { v.removeEventListener('seeked', done); res(); }; v.addEventListener('seeked', done); v.currentTime = t; setTimeout(done, 4000); });
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const b = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.8));
      if (b) frames.push({ t: Math.round(t * 10) / 10, blob: b });
      opts.onProgress?.((i + 1) / n);
    }
    return { frames, duration: dur, w: v.videoWidth, h: v.videoHeight };
  } finally {
    URL.revokeObjectURL(url);
    v.removeAttribute('src'); v.load();
  }
}

// Decodes the audio track and re-encodes it as 16 kHz mono 16-bit WAV (what Whisper expects).
export async function videoAudioWav(file: Blob, maxSeconds = 600): Promise<Blob | null> {
  try {
    const AC = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    const probe = new AC(1, 1, 16000);
    const decoded = await probe.decodeAudioData(await file.arrayBuffer());
    const secs = Math.min(decoded.duration, maxSeconds);
    const ctx = new AC(1, Math.ceil(secs * 16000), 16000);
    const src = ctx.createBufferSource();
    src.buffer = decoded; src.connect(ctx.destination); src.start();
    const out = (await ctx.startRendering()).getChannelData(0);
    let peak = 0;
    for (let i = 0; i < out.length; i += 64) peak = Math.max(peak, Math.abs(out[i]));
    if (peak < 0.003) return null; // silent video
    const buf = new ArrayBuffer(44 + out.length * 2), dv = new DataView(buf);
    const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); dv.setUint32(4, 36 + out.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 16000, true); dv.setUint32(28, 32000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    w(36, 'data'); dv.setUint32(40, out.length * 2, true);
    for (let i = 0; i < out.length; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, out[i])) * 0x7fff, true);
    return new Blob([buf], { type: 'audio/wav' });
  } catch {
    return null; // no audio track, or a codec the browser cannot decode
  }
}
