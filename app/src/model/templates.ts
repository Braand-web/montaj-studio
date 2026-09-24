import type { DesignData, El, Page, VideoData, Clip, FontKey } from './types';
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
  cat: 'social' | 'print' | 'office' | 'thumb' | 'video';
  tags: string;
  build(): DesignData;
  video?: () => VideoData;
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
    id: 't-thumbs', fr: 'Miniatures YouTube × 3', en: 'YouTube thumbnails × 3', formatId: 'yt-thumb', cat: 'thumb', tags: 'youtube miniature thumbnail test',
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


const P = (w: number, h: number, bg: string, els: El[]): Page => ({ id: uid('p'), w, h, bg, els });
const R = (name: string, x: number, y: number, w: number, h: number, fill: string, radius = 0): El => e({ type: 'rect', name, x, y, w, h, fill, radius });
const IMG = (name: string, x: number, y: number, w: number, h: number, radius = 0): El => e({ type: 'image', name, x, y, w, h, radius });
const A4 = fmt('a4');
const k4 = A4.w / 1000;

function titleClip(text: string, start: number, dur: number, size: number, y: number, color = '#FFFFFF', font: FontKey = 'sans', bg?: string, anim: 'fade' | 'slide' | 'zoom' | 'pop' = 'pop'): Clip {
  return { id: uid('c'), track: 'text', kind: 'text', name: 'Titre', text, start, dur, in: 0, style: { size, color, weight: 800, font, y, bg, anim } };
}
function videoData(w: number, h: number, clips: Clip[], caps: [number, number, string][] = []): VideoData {
  return { w, h, fps: 30, bg: '#0F1115', clips, captions: caps.map(([a, b, t]) => ({ id: uid('k'), start: a, end: b, text: t })), capStyle: 'tiktok', capY: 72, markers: [] };
}
const videoCover = (label: string, bg: string, head: string): DesignData => ({ pages: [P(1080, 1920, bg, [text('Titre', head, 90, 760, 900, 400, 120, '#FFFFFF', { align: 'center', font: 'anton', weight: 400 }), text('Type', label, 90, 1180, 900, 80, 44, '#FFD23F', { align: 'center', weight: 600 })])] });

TEMPLATES.push(
  {
    id: 't-promo-rentree', fr: 'Promo de rentrée', en: 'Back-to-school promo', formatId: 'ig-45', cat: 'social', tags: 'promo soldes rentrée réduction post',
    build: () => ({ pages: [P(1080, 1350, '#E84A2F', [
      text('Accroche', '−30 %', 80, 120, 920, 330, 300, '#FFFFFF', { font: 'anton', weight: 400 }),
      text('Sous-titre', 'SUR TOUTE LA RENTRÉE', 80, 470, 920, 90, 72, '#0F1115', { weight: 800 }),
      IMG('Photo produit', 80, 620, 920, 560, 32),
      text('Mention', 'Jusqu’au 30 septembre, en boutique et en ligne', 80, 1220, 920, 60, 36, '#FFFFFF', { weight: 500 }),
    ])] }),
  },
  {
    id: 't-collection', fr: 'Nouvelle collection', en: 'New collection', formatId: 'ig-45', cat: 'social', tags: 'collection mode nouveautés lancement',
    build: () => ({ pages: [P(1080, 1350, '#F2F2EE', [
      IMG('Photo 1', 60, 60, 470, 700, 24), IMG('Photo 2', 550, 60, 470, 330, 24), IMG('Photo 3', 550, 410, 470, 350, 24),
      text('Titre', 'NOUVEAUTÉS', 60, 820, 960, 180, 170, '#0F1115', { font: 'bebas', weight: 400 }),
      R('Filet', 60, 1030, 160, 12, '#E84A2F'),
      text('Texte', 'La collection automne est arrivée. Découvre-la en boutique.', 60, 1080, 900, 140, 44, '#48484A', { weight: 500, lh: 1.25 }),
    ])] }),
  },
  {
    id: 't-story-event', fr: 'Story événement', en: 'Event story', formatId: 'story', cat: 'social', tags: 'story événement soirée samedi',
    build: () => ({ pages: [P(1080, 1920, '#0F1115', [
      IMG('Photo', 0, 0, 1080, 1100),
      R('Bandeau', 0, 1040, 1080, 880, '#0F1115'),
      text('Titre', 'CE SAMEDI', 80, 1120, 920, 240, 220, '#FFD23F', { font: 'anton', weight: 400 }),
      text('Détails', 'Concert live · 20 h\nEntrée libre', 80, 1400, 920, 200, 64, '#F2F2EE', { weight: 600, lh: 1.25 }),
      e({ type: 'rect', name: 'Bouton', x: 80, y: 1680, w: 520, h: 120, fill: '#FFD23F', radius: 60 }),
      text('Bouton texte', 'Réserver ma place', 80, 1712, 520, 60, 46, '#0F1115', { align: 'center' }),
    ])] }),
  },
  {
    id: 't-review', fr: 'Avis client', en: 'Customer review', formatId: 'story', cat: 'social', tags: 'avis client témoignage étoiles',
    build: () => ({ pages: [P(1080, 1920, '#2E6BFF', [
      text('Étoiles', '★★★★★', 90, 360, 900, 160, 140, '#FFD23F', { align: 'center' }),
      text('Avis', '« Livraison rapide et produit impeccable. Je recommande les yeux fermés. »', 110, 620, 860, 600, 84, '#FFFFFF', { align: 'center', font: 'dmserif', weight: 400, lh: 1.15 }),
      text('Auteur', '— Aminata, Dakar', 90, 1320, 900, 70, 48, '#DCE6FF', { align: 'center', weight: 500 }),
    ])] }),
  },
  {
    id: 't-hiring', fr: 'Annonce « On recrute »', en: '“We’re hiring” post', formatId: 'linkedin', cat: 'social', tags: 'linkedin recrutement emploi on recrute',
    build: () => ({ pages: [P(1200, 1200, '#0F1115', [
      text('Titre', 'ON RECRUTE', 90, 200, 1020, 220, 190, '#F2F2EE', { font: 'anton', weight: 400 }),
      R('Filet', 90, 450, 260, 14, '#30D158'),
      text('Poste', 'Monteur vidéo · CDI · Dakar', 90, 510, 1020, 90, 64, '#30D158', { weight: 700 }),
      text('Texte', 'Tu maîtrises le montage court format et tu aimes raconter des histoires ? Postule avant le 15 octobre.', 90, 640, 980, 260, 46, '#AEAEB2', { weight: 500, lh: 1.3 }),
      e({ type: 'qr', name: 'QR candidature', x: 90, y: 930, w: 200, h: 200, qr: 'https://exemple.com/emploi', fill: '#0F1115' }),
    ])] }),
  },
  {
    id: 't-thumb-reaction', fr: 'Miniature réaction', en: 'Reaction thumbnail', formatId: 'yt-thumb', cat: 'thumb', tags: 'youtube miniature réaction incroyable',
    build: () => ({ pages: [P(1280, 720, '#FFD23F', [
      IMG('Visage', 640, 0, 640, 720),
      text('Titre', 'INCROYABLE !', 50, 180, 620, 300, 150, '#0F1115', { font: 'anton', weight: 400, fx: { outline: true } }),
      e({ type: 'circle', name: 'Pastille', x: 520, y: 470, w: 180, h: 180, fill: '#E84A2F' }),
      text('Pastille texte', '?!', 520, 510, 180, 100, 90, '#FFFFFF', { align: 'center' }),
    ])] }),
  },
  {
    id: 't-thumb-tuto', fr: 'Miniature tuto', en: 'Tutorial thumbnail', formatId: 'yt-thumb', cat: 'thumb', tags: 'youtube miniature tuto tutoriel minutes',
    build: () => ({ pages: [P(1280, 720, '#0F1115', [
      IMG('Capture', 560, 60, 660, 600, 24),
      text('Titre', 'EN 5 MIN', 60, 170, 520, 200, 150, '#30D158', { font: 'anton', weight: 400 }),
      text('Sous-titre', 'Monter un Reel sur son téléphone', 60, 400, 480, 180, 52, '#F2F2EE', { weight: 700, lh: 1.15 }),
    ])] }),
  },
  {
    id: 't-menu', fr: 'Menu restaurant', en: 'Restaurant menu', formatId: 'a4', cat: 'print', tags: 'menu restaurant carte plats',
    build: () => ({ pages: [P(A4.w, A4.h, '#F2F2EE', [
      text('Titre', 'LA CARTE', 80 * k4, 80 * k4, 840 * k4, 150 * k4, 130 * k4, '#0F1115', { align: 'center', font: 'playfair', weight: 800 }),
      R('Filet', 420 * k4, 250 * k4, 160 * k4, 6 * k4, '#E84A2F'),
      text('Entrées', 'ENTRÉES\nPastels au thon · 3 000 F\nSalade avocat-mangue · 3 500 F', 100 * k4, 320 * k4, 800 * k4, 250 * k4, 38 * k4, '#0F1115', { weight: 500, lh: 1.6 }),
      text('Plats', 'PLATS\nThiéboudienne · 6 500 F\nYassa poulet · 5 500 F\nMafé bœuf · 6 000 F', 100 * k4, 620 * k4, 800 * k4, 320 * k4, 38 * k4, '#0F1115', { weight: 500, lh: 1.6 }),
      text('Desserts', 'DESSERTS\nThiakry · 2 000 F\nSalade de fruits · 2 500 F', 100 * k4, 990 * k4, 800 * k4, 250 * k4, 38 * k4, '#0F1115', { weight: 500, lh: 1.6 }),
    ])] }),
  },
  {
    id: 't-invitation', fr: 'Invitation mariage', en: 'Wedding invitation', formatId: 'a5', cat: 'print', tags: 'invitation mariage fête',
    build: () => {
      const { w, h } = fmt('a5');
      const k = w / 1000;
      return { pages: [P(w, h, '#FBF7F0', [
        text('Intro', 'Nous avons la joie de vous convier au mariage de', 100 * k, 220 * k, 800 * k, 120 * k, 40 * k, '#7A6A55', { align: 'center', weight: 400, font: 'serif' }),
        text('Noms', 'Awa & Malik', 60 * k, 380 * k, 880 * k, 220 * k, 150 * k, '#2F2A24', { align: 'center', font: 'caveat', weight: 600 }),
        R('Filet', 400 * k, 640 * k, 200 * k, 4 * k, '#C9A96E'),
        text('Date', 'Samedi 14 novembre 2026 · 16 h', 100 * k, 700 * k, 800 * k, 70 * k, 46 * k, '#2F2A24', { align: 'center', weight: 600, font: 'playfair' }),
        text('Lieu', 'Jardins de la Corniche, Dakar', 100 * k, 790 * k, 800 * k, 70 * k, 38 * k, '#7A6A55', { align: 'center', weight: 400, font: 'serif' }),
      ])] };
    },
  },
  {
    id: 't-cv', fr: 'CV moderne', en: 'Modern resume', formatId: 'a4', cat: 'office', tags: 'cv resume curriculum emploi',
    build: () => ({ pages: [P(A4.w, A4.h, '#FFFFFF', [
      R('Colonne', 0, 0, 330 * k4, A4.h, '#0F1115'),
      IMG('Photo', 65 * k4, 70 * k4, 200 * k4, 200 * k4, 100 * k4),
      text('Contact', 'CONTACT\n+221 77 000 00 00\naminata@exemple.sn\nDakar', 50 * k4, 330 * k4, 250 * k4, 250 * k4, 22 * k4, '#F2F2EE', { weight: 500, lh: 1.6 }),
      text('Compétences', 'COMPÉTENCES\nMontage vidéo\nMotion design\nDirection artistique', 50 * k4, 640 * k4, 250 * k4, 250 * k4, 22 * k4, '#F2F2EE', { weight: 500, lh: 1.6 }),
      text('Nom', 'AMINATA DIOP', 380 * k4, 80 * k4, 580 * k4, 90 * k4, 64 * k4, '#0F1115', { weight: 800 }),
      text('Poste', 'Monteuse vidéo & motion designer', 380 * k4, 180 * k4, 580 * k4, 50 * k4, 30 * k4, '#2E6BFF', { weight: 600 }),
      text('Expérience', 'EXPÉRIENCE\n2023 – aujourd’hui · Monteuse, TechLab Studio\n2020 – 2023 · Assistante de production, Canal Est', 380 * k4, 300 * k4, 580 * k4, 300 * k4, 26 * k4, '#1D1D1F', { weight: 500, lh: 1.6 }),
      text('Formation', 'FORMATION\nLicence audiovisuel · ISM Dakar', 380 * k4, 660 * k4, 580 * k4, 200 * k4, 26 * k4, '#1D1D1F', { weight: 500, lh: 1.6 }),
    ])] }),
  },
  {
    id: 't-report', fr: 'Rapport annuel', en: 'Annual report', formatId: 'slides', cat: 'office', tags: 'rapport annuel chiffres présentation',
    build: () => ({ pages: [
      P(1920, 1080, '#2E6BFF', [text('Titre', '2026 EN CHIFFRES', 140, 380, 1640, 220, 170, '#FFFFFF', { font: 'anton', weight: 400 }), text('Sous-titre', 'Rapport annuel', 140, 620, 1000, 80, 56, '#DCE6FF', { weight: 500 })]),
      P(1920, 1080, '#F2F2EE', [
        text('Titre', 'Les chiffres clés', 140, 110, 1640, 110, 84, '#0F1115'),
        text('KPI 1', '1,2 M\nde vues', 140, 330, 480, 300, 110, '#2E6BFF', { lh: 1 }),
        text('KPI 2', '+48 %\nd’abonnés', 720, 330, 480, 300, 110, '#E84A2F', { lh: 1 }),
        text('KPI 3', '312\nvidéos', 1300, 330, 480, 300, 110, '#0F1115', { lh: 1 }),
      ]),
      P(1920, 1080, '#FFFFFF', [
        text('Titre', 'Répartition du temps de visionnage', 140, 110, 1640, 110, 72, '#0F1115'),
        e({ type: 'chart', name: 'Graphique', x: 140, y: 260, w: 1640, h: 720, kind: 'bar', fill: '#2E6BFF', color: '#0F1115', data: [['Shorts', 46], ['Tutos', 28], ['Tests', 18], ['Lives', 8]] }),
      ]),
    ] }),
  },
  {
    id: 'v-reel-produit', fr: 'Reel produit', en: 'Product reel', formatId: 'v-reels', cat: 'video', tags: 'vidéo reel produit 15 secondes',
    build: () => videoCover('Reel · 0:15', '#E84A2F', 'EN 15 SECONDES'),
    video: () => videoData(1080, 1920, [
      titleClip('EN 15 SECONDES', 0, 2.5, 120, 45, '#FFFFFF', 'anton'),
      titleClip('Léger. Rapide. Solide.', 3, 5, 72, 78, '#FFFFFF', 'sans', undefined, 'slide'),
      titleClip('DISPO EN BOUTIQUE', 11, 4, 90, 50, '#0F1115', 'anton', '#FFD23F'),
    ]),
  },
  {
    id: 'v-tuto', fr: 'Tuto rapide · 3 astuces', en: 'Quick tutorial · 3 tips', formatId: 'v-tiktok', cat: 'video', tags: 'vidéo tiktok tuto astuces',
    build: () => videoCover('TikTok · 0:30', '#30D158', '3 ASTUCES'),
    video: () => videoData(1080, 1920, [
      titleClip('3 ASTUCES', 0, 3, 140, 30, '#FFFFFF', 'anton'),
      titleClip('1', 4, 7, 220, 20, '#30D158', 'anton'),
      titleClip('2', 12, 7, 220, 20, '#30D158', 'anton'),
      titleClip('3', 20, 7, 220, 20, '#30D158', 'anton'),
      titleClip('Abonne-toi pour la suite', 27.5, 2.5, 64, 50, '#0F1115', 'sans', '#FFFFFF', 'zoom'),
    ], [[4, 7, 'Première astuce : active le mode économie'], [12, 15, 'Deuxième astuce : baisse la luminosité'], [20, 23, 'Troisième astuce : coupe les applis en arrière-plan']]),
  },
  {
    id: 'v-intro-yt', fr: 'Intro YouTube', en: 'YouTube intro', formatId: 'v-youtube', cat: 'video', tags: 'vidéo youtube intro épisode',
    build: () => ({ pages: [P(1920, 1080, '#0F1115', [text('Titre', 'ÉPISODE 12', 160, 380, 1600, 240, 200, '#FFFFFF', { align: 'center', font: 'anton', weight: 400 }), text('Type', 'Intro · 0:08', 160, 660, 1600, 80, 48, '#FFD23F', { align: 'center', weight: 600 })])] }),
    video: () => videoData(1920, 1080, [
      titleClip('ÉPISODE 12', 0.3, 3.5, 200, 45, '#FFFFFF', 'anton', undefined, 'zoom'),
      titleClip('Le test complet', 2, 4, 72, 62, '#FFD23F', 'sans', undefined, 'slide'),
      titleClip('C’EST PARTI', 6, 2, 150, 50, '#0F1115', 'anton', '#FFFFFF', 'pop'),
    ]),
  },
  {
    id: 'v-podcast', fr: 'Extrait de podcast', en: 'Podcast clip', formatId: 'v-square', cat: 'video', tags: 'vidéo podcast extrait carré',
    build: () => ({ pages: [P(1080, 1080, '#5E5CE6', [text('Titre', 'LE MOMENT FORT', 90, 400, 900, 200, 120, '#FFFFFF', { align: 'center', font: 'anton', weight: 400 }), text('Type', 'Clip 1:1 · 0:45', 90, 640, 900, 70, 44, '#DCE6FF', { align: 'center', weight: 600 })])] }),
    video: () => videoData(1080, 1080, [
      titleClip('LE MOMENT FORT', 0, 3, 96, 14, '#FFFFFF', 'anton', '#5E5CE6', 'slide'),
      titleClip('Épisode 34 · Entreprendre à Dakar', 0, 45, 40, 92, '#FFFFFF', 'sans', undefined, 'fade'),
    ]),
  },
);

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
