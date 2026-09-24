import { createDoc } from './docs';
import { useApp, tNow } from '../store/app';
import type { Format } from '../model/formats';
import type { Template } from '../model/templates';
import type { DesignData, VideoData } from '../model/types';
import { blankPage } from '../model/templates';
import { dimsLabel } from '../model/formats';

export function emptyVideo(w: number, h: number): VideoData {
  return { w, h, fps: 30, bg: '#000000', clips: [], captions: [], capStyle: 'tiktok', capY: 72, markers: [] };
}

export async function newFromFormat(f: Format, prompt?: string) {
  const app = useApp.getState();
  const name = `${tNow(f.fr, f.en)} — ${tNow('sans titre', 'untitled')}`;
  if (f.kind === 'video') {
    const d = await createDoc('video', name, f.dims, emptyVideo(f.w, f.h));
    app.set({ pendingPrompt: prompt ?? null });
    app.go('video', d.id);
  } else {
    const data: DesignData = { pages: [blankPage(f.w, f.h)] };
    const d = await createDoc('design', name, f.dims, data);
    app.set({ pendingPrompt: prompt ?? null });
    app.go('design', d.id);
  }
}

export async function newFromTemplate(t: Template, prompt?: string) {
  const data = t.build();
  const p0 = data.pages[0];
  const d = await createDoc('design', tNow(t.fr, t.en), dimsLabel(p0.w, p0.h), data);
  const app = useApp.getState();
  app.set({ pendingPrompt: prompt ?? null });
  app.go('design', d.id);
}

export async function newDesignFromData(name: string, data: DesignData, open = true) {
  const p0 = data.pages[0];
  const d = await createDoc('design', name, dimsLabel(p0.w, p0.h) + (data.pages.length > 1 ? ` · ${data.pages.length} p.` : ''), data);
  if (open) useApp.getState().go('design', d.id);
  return d;
}
