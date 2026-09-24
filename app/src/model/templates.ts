import type { DesignData, El, Page } from './types';
import { fmt } from './formats';
import { uid } from '../lib/util';

// Original starter templates. Photo slots are empty frames the user fills with their own media.

const e = (p: Partial<El> & Pick<El, 'type' | 'name' | 'x' | 'y' | 'w' | 'h'>): El => ({ id: uid('e'), ...p });
const text = (name: string, t: string, x: number, y: number, w: number, h: number, size: number, color: string, more: Partial<El> = {}): El =>
  e({ type: 'text', name, text: t, x, y, w, h, size, weight: 700, color, align: 'left', lh: 1.05, ...more });

export function blankPage(w: number, h: number, bg = '#FFFFFF'): Page {
  return { id: uid('p'), w, h, bg, els: [] };
}

export interface Template {
  id: string;
  fr: string;
  en: string;
  formatId: string;
  cat: 'social' | 'print' | 'office' | 'video';
  tags: string;
  build(): DesignData;
}

function thumbPage(bg: string, title: string, ink: string, band: string): Page {
  const { w, h } = fmt('yt-thumb');
  return {
    id: uid('p'), w, h, bg, els: [
      e({ type: 'image', name: 'Photo', x: 700, y: 0, w: 580, h: 720 }),
      e({ type: 'rect', name: 'Bandeau', x: 60, y: 500, w: 300, h: 16, fill: band }),
      text('Titre', title, 60, 150, 620, 330, 104, ink, { fx: { shadow: true }, upper: true }),
      text('Sous-titre', 'Le test complet', 60, 540, 560, 60, 40, ink, { weight: 600 }),
    ],
  };
}

export const TEMPLATES: Template[] = [
  {
    id: 't-thumbs', fr: 'Miniatures YouTube × 3', en: 'YouTube thumbnails × 3', formatId: 'yt-thumb', cat: 'social', tags: 'youtube miniature thumbnail test',
    build: () => ({ pages: [thumbPage('#0F1115', '2 jours sans charge ?', '#F2F2EE', '#FFD23F'), thumbPage('#2E6BFF', "J'ai tout testé", '#F2F2EE', '#FFD23F'), thumbPage('#F2F2EE', 'Mon verdict final', '#0F1115', '#E84A2F')] }),
  },
  {
    id: 't-launch', fr: 'Affiche de lancement', en: 'Launch poster', formatId: 'a3', cat: 'print', tags: 'affiche poster événement soirée boutique',
    build: () => {
      const { w, h } = fmt('a3');
      const k = w / 1190;
      return {
        pages: [{
          id: uid('p'), w, h, bg: '#0F1115', els: [
            e({ type: 'image', name: 'Photo', x: 0, y: 0, w, h: Math.round(900 * k) }),
            e({ type: 'rect', name: 'Filet', x: 80 * k, y: 960 * k, w: 420 * k, h: 14 * k, fill: '#FFD23F' }),
            text('Titre', 'SOIRÉE DE LANCEMENT', 80 * k, 1000 * k, 1030 * k, 320 * k, 150 * k, '#F2F2EE'),
            text('Date', 'SAMEDI 26 SEPTEMBRE · 18 H', 80 * k, 1340 * k, 1030 * k, 80 * k, 62 * k, '#FFD23F', { weight: 600 }),
            text('Adresse', 'Ta boutique · Ton adresse', 80 * k, 1450 * k, 820 * k, 60 * k, 40 * k, '#A3A6AC', { weight: 400 }),
          ],
        }],
      };
    },
  },
  {
    id: 't-promo-story', fr: 'Story promotion', en: 'Promo story', formatId: 'story', cat: 'social', tags: 'story promo soldes réduction',
    build: () => ({
      pages: [{
        id: uid('p'), w: 1080, h: 1920, bg: '#FFD23F', els: [
          e({ type: 'image', name: 'Photo produit', x: 140, y: 560, w: 800, h: 800, radius: 40 }),
          text('Accroche', '−20 %', 90, 150, 900, 260, 240, '#0F1115', { align: 'center', font: 'anton', weight: 400 }),
          text('Sous-titre', 'CETTE SEMAINE SEULEMENT', 90, 410, 900, 80, 56, '#0F1115', { align: 'center', weight: 700 }),
          e({ type: 'rect', name: 'Bouton', x: 240, y: 1520, w: 600, h: 130, fill: '#0F1115', radius: 65 }),
          text('Bouton texte', 'Lien en bio', 240, 1553, 600, 70, 52, '#FFD23F', { align: 'center', weight: 700 }),
        ],
      }],
    }),
  },
  {
    id: 't-post-quote', fr: 'Post citation 4:5', en: 'Quote post 4:5', formatId: 'ig-45', cat: 'social', tags: 'citation quote post instagram',
    build: () => ({
      pages: [{
        id: uid('p'), w: 1080, h: 1350, bg: '#F2F2EE', els: [
          e({ type: 'rect', name: 'Guillemet', x: 90, y: 120, w: 120, h: 18, fill: '#E84A2F' }),
          text('Citation', 'On ne crée pas pour les algorithmes. On crée pour les gens.', 90, 200, 900, 700, 92, '#0F1115', { font: 'dmserif', weight: 400, lh: 1.1 }),
          text('Auteur', '— Ton nom', 90, 1080, 900, 60, 40, '#48484A', { weight: 500 }),
        ],
      }],
    }),
  },
  {
    id: 't-card', fr: 'Carte de visite', en: 'Business card', formatId: 'card', cat: 'print', tags: 'carte visite business card',
    build: () => ({ pages: [businessCardPage({ nom: 'Awa Diallo', poste: 'Directrice', telephone: '+221 77 123 45 67', email: 'awa@exemple.sn' })] }),
  },
  {
    id: 't-slides', fr: 'Présentation de projet', en: 'Project deck', formatId: 'slides', cat: 'office', tags: 'présentation slides deck projet',
    build: () => ({
      pages: [
        {
          id: uid('p'), w: 1920, h: 1080, bg: '#0F1115', els: [
            text('Titre', 'Bilan du trimestre', 140, 380, 1400, 200, 140, '#F2F2EE'),
            text('Sous-titre', 'Équipe contenu · septembre 2026', 140, 600, 1400, 80, 48, '#A3A6AC', { weight: 500 }),
            e({ type: 'rect', name: 'Filet', x: 140, y: 340, w: 200, h: 14, fill: '#FFD23F' }),
          ],
        },
        {
          id: uid('p'), w: 1920, h: 1080, bg: '#F2F2EE', els: [
            text('Titre', 'Vues par mois', 140, 110, 1400, 120, 88, '#0F1115'),
            e({ type: 'chart', name: 'Graphique', x: 140, y: 280, w: 1100, h: 660, kind: 'col', fill: '#2E6BFF', color: '#0F1115', data: [['Juil', 42], ['Août', 58], ['Sept', 81]] }),
            text('Note', '+40 % en septembre grâce aux formats courts.', 1320, 320, 460, 400, 56, '#0F1115', { weight: 600, lh: 1.15 }),
          ],
        },
      ],
    }),
  },
  {
    id: 't-flyer', fr: 'Flyer atelier', en: 'Workshop flyer', formatId: 'a5', cat: 'print', tags: 'flyer atelier événement',
    build: () => {
      const { w, h } = fmt('a5');
      const k = w / 1000;
      return {
        pages: [{
          id: uid('p'), w, h, bg: '#2E6BFF', els: [
            text('Titre', 'Atelier montage vidéo', 70 * k, 90 * k, 860 * k, 360 * k, 120 * k, '#F2F2EE'),
            text('Infos', 'Samedi 4 octobre · 10 h – 13 h\nGratuit sur inscription', 70 * k, 500 * k, 860 * k, 180 * k, 44 * k, '#F2F2EE', { weight: 500, lh: 1.3 }),
            e({ type: 'qr', name: 'QR inscription', x: 70 * k, y: 1000 * k, w: 260 * k, h: 260 * k, qr: 'https://exemple.com/inscription', fill: '#0F1115' }),
            text('QR légende', 'Scanne pour t’inscrire', 360 * k, 1090 * k, 560 * k, 80 * k, 36 * k, '#F2F2EE', { weight: 500 }),
          ],
        }],
      };
    },
  },
];

export function businessCardPage(v: { nom: string; poste: string; telephone: string; email: string }): Page {
  const { w, h } = fmt('card');
  const k = w / 1004;
  return {
    id: uid('p'), w, h, bg: '#0F1115', els: [
      text('Nom', v.nom, 70 * k, 70 * k, 760 * k, 90 * k, 78 * k, '#F2F2EE', { lh: 1 }),
      text('Poste', v.poste, 70 * k, 170 * k, 760 * k, 60 * k, 44 * k, '#FFD23F', { weight: 500 }),
      e({ type: 'rect', name: 'Logo', x: 840 * k, y: 70 * k, w: 94 * k, h: 94 * k, fill: '#2A2D31', radius: 16 * k }),
      text('Téléphone', v.telephone, 70 * k, 470 * k, 860 * k, 46 * k, 36 * k, '#A3A6AC', { weight: 400, font: 'mono' }),
      text('E-mail', v.email, 70 * k, 530 * k, 860 * k, 46 * k, 36 * k, '#A3A6AC', { weight: 400, font: 'mono' }),
    ],
  };
}
