// Real-time encoding of a canvas (and optional audio) with MediaRecorder.

export function bestVideoMime(): { mime: string; ext: 'mp4' | 'webm' } {
  const cands: [string, 'mp4' | 'webm'][] = [
    ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'],
    ['video/mp4', 'mp4'],
    ['video/webm;codecs=vp9,opus', 'webm'],
    ['video/webm;codecs=vp8,opus', 'webm'],
    ['video/webm', 'webm'],
  ];
  try {
    for (const [m, e] of cands) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return { mime: m, ext: e };
  } catch { /* no MediaRecorder */ }
  return { mime: 'video/webm', ext: 'webm' };
}

export const canRecord = () => typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';

export function recordCanvas(
  canvas: HTMLCanvasElement,
  duration: number,
  draw: (t: number) => Promise<void> | void,
  onProgress: (pct: number) => void,
  cancelled: () => boolean,
  audio?: MediaStream,
  fps = 30,
  bitrate = 8_000_000,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!canRecord()) { reject(new Error('MediaRecorder unavailable')); return; }
    const { mime } = bestVideoMime();
    const stream = canvas.captureStream(fps);
    audio?.getAudioTracks().forEach((t) => stream.addTrack(t));
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
    } catch (e) { reject(e); return; }
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      stream.getVideoTracks().forEach((t) => t.stop());
      if (cancelled()) reject(new Error('cancel'));
      else resolve(new Blob(chunks, { type: mime.split(';')[0] }));
    };
    rec.start(250);
    const t0 = performance.now();
    let busy = false;
    const tick = async () => {
      const t = (performance.now() - t0) / 1000;
      if (cancelled() || t >= duration) {
        await draw(Math.min(t, duration));
        rec.stop();
        return;
      }
      if (!busy) {
        busy = true;
        await draw(t);
        busy = false;
      }
      onProgress((t / duration) * 100);
      requestAnimationFrame(() => void tick());
    };
    void tick();
  });
}
