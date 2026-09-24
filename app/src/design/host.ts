import type { ComposerHost, RunSession } from '../agent/Composer';
import { designTools, compactDesign, type DataTarget } from '../agent/designTools';
import { useDesign, snapshot } from './store';
import { useApp } from '../store/app';
import { deepClone } from '../lib/util';
import type { DesignData, MediaItem } from '../model/types';
import { FONT_KEYS } from '../model/fonts';

let mediaCache: MediaItem[] = [];
export const setDesignMedia = (m: MediaItem[]) => { mediaCache = m; };

export function designHost(): ComposerHost {
  const fr = useApp.getState().lang === 'fr';
  return {
    kind: 'design',
    suggestions: fr
      ? ['Rends les titres plus lisibles et vérifie les contrastes', 'Décline cette page en story 9:16 et en post 4:5', 'Réécris les textes avec un ton plus percutant', 'Applique les couleurs de mon kit de marque']
      : ['Make the headings more readable and check contrast', 'Resize this page to a 9:16 story and a 4:5 post', 'Rewrite the copy with a punchier tone', 'Apply my brand kit colors'],
    rules() {
      const st = useDesign.getState();
      const { brand, lang } = useApp.getState();
      const d = st.doc!.data;
      const json = JSON.stringify(compactDesign(d));
      return [
        `You are the design assistant inside ${'Montaj Studio'}, a free, local-first design and video editor.`,
        `You edit the user's design document only through the provided tools. Coordinates are page pixels, origin top-left.`,
        `Reply in ${lang === 'fr' ? 'French (tutoiement)' : 'English'}, briefly: what you did, as a short list. Never claim a change you did not make with a tool.`,
        `Keep text inside the page, keep contrast at least 4.5:1 (use check_design), prefer the brand colors, keep the layout clean and aligned.`,
        `Image elements need a media id from list_media; if none fits, leave an empty frame and say so. You cannot generate images.`,
        `Available fonts: ${FONT_KEYS.join(', ')}.`,
        `Brand kit "${brand.name}": colors ${brand.colors.join(', ')}; heading font ${brand.fonts.heading}; body font ${brand.fonts.body}; voice: ${brand.tone}`,
        `Document "${st.doc!.name}", the user is looking at page ${st.pageIdx + 1}. Current state (JSON): ${json.length > 40000 ? json.slice(0, 40000) + '…(truncated, call get_document)' : json}`,
        st.sel.length ? `Selected element ids: ${st.sel.join(', ')}` : '',
      ].filter(Boolean).join('\n');
    },
    session(mode): RunSession {
      const st = useDesign.getState();
      const changed = new Set<string>();
      const changes: string[] = [];
      const ctx = { brand: useApp.getState().brand, media: () => mediaCache };
      if (mode === 'assist') {
        let draft: DesignData = deepClone(st.doc!.data);
        let started = false;
        const target: DataTarget<DesignData> = {
          read: () => draft,
          write: (fn) => {
            const n = deepClone(draft);
            fn(n);
            draft = n;
            started = true;
            useDesign.getState().setDraft(n, [...changed]);
          },
          changed, changes,
        };
        return {
          tools: designTools(target, ctx), changes,
          finish() { if (!started) useDesign.getState().setDraft(null); else useDesign.getState().setDraft(draft, [...changed]); },
          apply() {
            const d = draft;
            useDesign.getState().setDraft(null);
            useDesign.getState().apply((x) => { x.pages = d.pages; });
            void snapshot('agent', fr ? 'Après l’assistant (Assist)' : 'After assistant (Assist)');
          },
          refuse() { useDesign.getState().setDraft(null); },
        };
      }
      const before = st.doc!.data;
      const target: DataTarget<DesignData> = {
        read: () => useDesign.getState().doc!.data,
        write: (fn) => { useDesign.getState().apply(fn, { keepSel: true }); },
        changed, changes,
      };
      if (mode === 'agent') useDesign.getState().setBusy(true);
      let after: DesignData | null = null;
      return {
        tools: designTools(target, ctx), changes,
        finish() {
          useDesign.getState().setBusy(false);
          after = useDesign.getState().doc!.data;
          if (mode === 'agent' && changes.length) void snapshot('agent', fr ? 'Après l’assistant (Agent)' : 'After assistant (Agent)');
        },
        undoAll() { useDesign.getState().apply((x) => { x.pages = deepClone(before.pages); }); },
        redoAll() { if (after) { const a = after; useDesign.getState().apply((x) => { x.pages = deepClone(a.pages); }); } },
      };
    },
  };
}
