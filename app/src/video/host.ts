import type { ComposerHost, RunSession } from '../agent/Composer';
import type { DataTarget } from '../agent/designTools';
import { videoTools, compactVideo } from '../agent/videoTools';
import { useVideo, videoSnapshot } from './store';
import { useApp } from '../store/app';
import { deepClone } from '../lib/util';
import type { MediaItem, VideoData } from '../model/types';

let mediaCache: MediaItem[] = [];
export const setVideoMedia = (m: MediaItem[]) => { mediaCache = m; };

export function videoHost(): ComposerHost {
  const fr = useApp.getState().lang === 'fr';
  return {
    kind: 'video',
    suggestions: fr
      ? ['Passe la vidéo en 9:16 pour TikTok et recadre les clips', 'Ajoute un titre d’accroche de 3 s au début', 'Applique un look chaud et un fondu enchaîné entre les clips', 'Coupe les 2 premières secondes et referme le trou']
      : ['Switch to 9:16 for TikTok and refit the clips', 'Add a 3-second hook title at the start', 'Apply a warm look and crossfades between clips', 'Cut the first 2 seconds and close the gap'],
    rules() {
      const st = useVideo.getState();
      const { lang, brand } = useApp.getState();
      const json = JSON.stringify(compactVideo(st.data()));
      return [
        'You are the video editing assistant inside Montaj Studio, a free, local-first video and design editor.',
        'You edit the timeline only through the provided tools. Times are seconds. Tracks: video (main), broll (overlay), text (titles), audio, music.',
        'You cannot see or hear the media: rely on clip names, durations and what the user tells you. Never invent a transcript; captions only from text the user provides.',
        `Reply in ${lang === 'fr' ? 'French (tutoiement)' : 'English'}, briefly: what you did, as a short list. Never claim a change you did not make with a tool.`,
        `Brand kit "${brand.name}": colors ${brand.colors.join(', ')}; voice: ${brand.tone}`,
        `Project "${st.doc!.name}". Playhead at ${st.t.toFixed(2)} s.${st.sel ? ' Selected clip: ' + st.sel + '.' : ''} Timeline (JSON): ${json.length > 40000 ? json.slice(0, 40000) + '…(truncated, call get_timeline)' : json}`,
      ].join('\n');
    },
    session(mode): RunSession {
      const st = useVideo.getState();
      const changed = new Set<string>();
      const changes: string[] = [];
      const ctx = { media: () => mediaCache, playhead: () => useVideo.getState().t };
      if (mode === 'assist') {
        let draft: VideoData = deepClone(st.data());
        let started = false;
        const target: DataTarget<VideoData> = {
          read: () => draft,
          write: (fn) => { const n = deepClone(draft); fn(n); draft = n; started = true; useVideo.getState().setDraft(n, [...changed]); },
          changed, changes,
        };
        return {
          tools: videoTools(target, ctx), changes,
          finish() { if (!started) useVideo.getState().setDraft(null); else useVideo.getState().setDraft(draft, [...changed]); },
          apply() {
            const d = draft;
            useVideo.getState().setDraft(null);
            useVideo.getState().apply((x) => { Object.assign(x, deepClone(d)); });
            void videoSnapshot('agent', fr ? 'Après l’assistant (Assist)' : 'After assistant (Assist)');
          },
          refuse() { useVideo.getState().setDraft(null); },
        };
      }
      const before = st.data();
      const target: DataTarget<VideoData> = {
        read: () => useVideo.getState().data(),
        write: (fn) => useVideo.getState().apply(fn),
        changed, changes,
      };
      if (mode === 'agent') useVideo.getState().setBusy(true);
      let after: VideoData | null = null;
      return {
        tools: videoTools(target, ctx), changes,
        finish() {
          useVideo.getState().setBusy(false);
          after = useVideo.getState().data();
          if (mode === 'agent' && changes.length) void videoSnapshot('agent', fr ? 'Après l’assistant (Agent)' : 'After assistant (Agent)');
        },
        undoAll() { useVideo.getState().apply((x) => { Object.assign(x, deepClone(before)); }); },
        redoAll() { if (after) { const a = after; useVideo.getState().apply((x) => { Object.assign(x, deepClone(a)); }); } },
      };
    },
  };
}
