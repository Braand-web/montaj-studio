import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUp, Check, ChevronDown, ChevronUp, Clapperboard, Download, HardDrive, Image as ImageIcon, Layers, Minus, PenTool, Plus,
  Captions, Send, Shuffle, Sparkles, MessageCircle, Type, Play, Smartphone, Store, Briefcase, Megaphone, GraduationCap, HeartHandshake,
  Palette, Mic, ShoppingBag, Coins, Sparkle, Undo2, History, Gauge, ShieldCheck, FileDown,
} from 'lucide-react';
import { useApp, useT } from '../store/app';
import { PLANS } from '../lib/pricing';
import { openEditor } from '../ui/Shell';

// Public marketing page (Montaj Site.dc.html). Every claim here matches what this build really does;
// paid plans are shown as "Bientôt" and no fake purchase is offered.

const GRAD = 'linear-gradient(145deg,#0A84FF,#7D5CFF 58%,#BF5AF2)';

function Logo({ box, bar, gap, h, r }: { box: number; bar: number; gap: number; h: number; r: number }) {
  return (
    <span className="site-logo" style={{ width: box, height: box, borderRadius: r, background: GRAD }}>
      <span style={{ display: 'flex', alignItems: 'flex-end', gap, height: h, marginTop: h * 0.28 }}>
        <span data-bar="0" style={{ width: bar, height: '100%', borderRadius: bar / 2, background: '#fff', transformOrigin: 'bottom' }} />
        <span style={{ position: 'relative', width: bar, height: '52%', borderRadius: bar / 2, background: '#fff' }}>
          <span data-spark="1" style={{ position: 'absolute', left: '50%', top: -bar * 1.6, width: bar, height: bar, marginLeft: -bar / 2, borderRadius: '50%', background: '#FFD60A', boxShadow: `0 0 ${bar}px rgba(255,214,10,.8)` }} />
        </span>
        <span data-bar="1" style={{ width: bar, height: '100%', borderRadius: bar / 2, background: '#fff', transformOrigin: 'bottom' }} />
      </span>
    </span>
  );
}

const tint = (c: string) => `color-mix(in oklab, ${c} 22%, #1C1C1E)`;

export function Site() {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const onboarded = useApp((s) => s.onboarded);
  const go = useApp((s) => s.go);
  const [menu, setMenu] = useState(false);
  const [faq, setFaq] = useState(0);
  const [t, setT] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [tilt, setTilt] = useState(8);
  const root = useRef<HTMLDivElement>(null);

  const start = () => go(onboarded ? 'home' : 'onboarding');
  const toSection = (id: string) => { setMenu(false); root.current?.querySelector('#' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  useEffect(() => {
    const iv = setInterval(() => setT((x) => x + 1), 100);
    const el = root.current!;
    const onScroll = () => { const y = el.scrollTop; setScrolled(y > 40); setTilt(Math.max(0, 8 - y / 60)); };
    el.addEventListener('scroll', onScroll, { passive: true });
    let io: IntersectionObserver | undefined;
    const anims: Animation[] = [];
    if (!(typeof window.matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) && 'animate' in HTMLElement.prototype) {
      const E = 'cubic-bezier(.2,.8,.2,1)';
      const q = (s: string) => Array.from(el.querySelectorAll<HTMLElement>(s));
      const loop = (n: HTMLElement, k: Keyframe[], o: KeyframeAnimationOptions) => anims.push(n.animate(k, { iterations: Infinity, ...o }));
      q('[data-w]').forEach((n, i) => n.animate([{ opacity: 0, transform: 'translateY(45%)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 800, delay: 200 + i * 110, easing: E, fill: 'both' }));
      q('[data-rise]').forEach((n) => { const i = +n.dataset.rise!; n.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: i === 0 ? 80 : 600 + i * 120, easing: E, fill: 'both' }); });
      q('[data-orb]').forEach((n, i) => loop(n, [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${60 - i * 40}px,${-40 + i * 25}px) scale(1.18)` }, { transform: `translate(${-50 + i * 30}px,${35 - i * 10}px) scale(.92)` }, { transform: 'translate(0,0) scale(1)' }], { duration: 16000 + i * 4000, easing: 'ease-in-out' }));
      q('[data-float]').forEach((n, i) => loop(n, [{ transform: 'translateY(0) rotate(0deg)' }, { transform: `translateY(-10px) rotate(${i % 2 ? -1.5 : 1.5}deg)` }, { transform: 'translateY(0) rotate(0deg)' }], { duration: 5200 + i * 900, easing: 'ease-in-out' }));
      q('[data-bar]').forEach((n) => loop(n, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.62)' }, { transform: 'scaleY(1)' }], { duration: 1400, delay: +n.dataset.bar! * 350, easing: 'ease-in-out' }));
      q('[data-spark]').forEach((n) => loop(n, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 1400, easing: 'ease-in-out' }));
      q('[data-caret]').forEach((n) => loop(n, [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }], { duration: 1000, easing: 'steps(2, jump-none)' }));
      q('[data-pulse]').forEach((n) => loop(n, [{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], { duration: 1800, easing: 'ease-in-out' }));
      q('[data-marquee]').forEach((n) => loop(n, [{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], { duration: 32000 }));
      const reveal = new Map(q('[data-reveal]').map((n) => {
        const a = n.animate([{ opacity: 0, transform: 'translateY(34px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 850, delay: (+n.dataset.reveal! || 0) * 110, easing: E, fill: 'both' });
        a.pause(); a.currentTime = 0;
        return [n as Element, a] as const;
      }));
      if (typeof IntersectionObserver !== 'undefined') {
        io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { reveal.get(e.target)?.play(); io!.unobserve(e.target); } }), { root: el, threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        reveal.forEach((_, n) => io!.observe(n));
      } else reveal.forEach((a) => a.play());
    }
    return () => { clearInterval(iv); el.removeEventListener('scroll', onScroll); io?.disconnect(); anims.forEach((a) => a.cancel()); };
  }, [lang]);

  const heroWords = lang === 'fr' ? ['Éditeur vidéo', 'et design', 'en ligne gratuit.'] : ['Free online', 'video and design', 'editor.'];
  const prompts = lang === 'fr'
    ? ['Affiche pour ma soirée de lancement, samedi 18 h', 'Story Instagram pour les soldes de ma boutique', '3 miniatures YouTube pour ma vidéo de test', 'Vidéo verticale avec un titre accrocheur']
    : ['Poster for my launch party, Saturday 6 pm', 'Instagram story for my shop’s sale', '3 YouTube thumbnails for my review video', 'Vertical video with a catchy title'];
  const typed = (() => { let k = t; for (let i = 0; i < 400; i++) { const p = prompts[i % prompts.length], L = p.length + 28; if (k < L) return p.slice(0, Math.min(p.length, k)); k -= L; } return ''; })();

  const menuItems: [React.ElementType, string, string, string, string][] = [
    [Sparkles, '#BF5AF2', 'Studio Chat', T('Designs et vidéos créés en discutant avec Claude.', 'Designs and videos created by chatting with Claude.'), 'chat'],
    [Clapperboard, '#64D2FF', T('Éditeur vidéo', 'Video editor'), T('Timeline multipiste, titres, sous-titres, export.', 'Multitrack timeline, titles, captions, export.'), 'video'],
    [PenTool, '#FF9F0A', T('Éditeur design', 'Design editor'), T('Posts, affiches, miniatures, cartes, présentations.', 'Posts, posters, thumbnails, cards, decks.'), 'design'],
    [HardDrive, '#30D158', T('Local et privé', 'Local and private'), T('Tes fichiers restent dans ton navigateur.', 'Your files stay in your browser.'), 'local'],
    [Layers, '#0A84FF', T('Création en masse', 'Bulk creation'), T('Un modèle, un CSV, des dizaines de visuels.', 'One template, one CSV, dozens of visuals.'), 'design'],
    [Coins, '#FF375F', T('Tarifs', 'Pricing'), T('Gratuit pour commencer, dès 7,99 € ensuite.', 'Free to start, from €7.99 after.'), 'tarifs'],
  ];

  const audiences: [React.ElementType, string][] = [[Play, 'YouTubeurs'], [Smartphone, T('TikTokeurs', 'TikTokers')], [Store, T('Commerçants', 'Shop owners')], [Briefcase, T('Agences', 'Agencies')], [Megaphone, T('Équipes marketing', 'Marketing teams')], [GraduationCap, T('Enseignants', 'Teachers')], [HeartHandshake, T('Associations', 'Non-profits')], [Palette, T('Graphistes', 'Designers')], [Mic, T('Podcasteurs', 'Podcasters')], [ShoppingBag, 'E-commerce']];
  const pillars: [React.ElementType, string, string][] = [[Sparkles, T('Générer', 'Generate'), 'chat'], [Clapperboard, T('Monter', 'Edit'), 'video'], [PenTool, T('Designer', 'Design'), 'design'], [Captions, T('Sous-titrer', 'Caption'), 'video'], [Send, T('Publier', 'Publish'), 'local']];

  const feats = [
    { id: 'chat', I: Sparkles, badge: 'Studio Chat', c: '#BF5AF2', soft: '#F4E9FD', ink: '#8E2FC2', glow: 'rgba(191,90,242,.22)', kind: 'chat',
      title: T('Demande-le en une phrase, retrouve-le dans tes documents.', 'Ask in one sentence, find it in your documents.'),
      points: [T('Claude crée des designs et des vidéos à partir de ta demande', 'Claude creates designs and videos from your request'), T('Trois modes : Demander, Assister (tu valides) ou Agent (il modifie en direct)', 'Three modes: Ask, Assist (you approve) or Agent (edits live)'), T('Chaque appel apparaît dans Utilisation IA, avec une limite par jour', 'Every call shows up in AI usage, with a daily limit')] },
    { id: 'video', I: Clapperboard, badge: T('Éditeur vidéo', 'Video editor'), c: '#0A84FF', soft: '#E6F1FF', ink: '#0066CC', glow: 'rgba(10,132,255,.2)', kind: 'video',
      title: T('Un vrai montage, sans rien installer.', 'Real editing, nothing to install.'),
      points: [T('Timeline multipiste : découpe, titres, images, musique', 'Multitrack timeline: cuts, titles, images, music'), T('Sous-titres éditables, import et export SRT / WebVTT', 'Editable captions, SRT / WebVTT import and export'), T('Export vidéo sans filigrane (MP4 ou WebM selon ton navigateur)', 'Watermark-free video export (MP4 or WebM depending on your browser)')] },
    { id: 'design', I: PenTool, badge: T('Éditeur design', 'Design editor'), c: '#FF9F0A', soft: '#FFF2E0', ink: '#C46A00', glow: 'rgba(255,159,10,.22)', kind: 'design',
      title: T('Du post Instagram à l’affiche A3.', 'From Instagram post to A3 poster.'),
      points: [T('Calques, magnétisme, kit de marque et templates prêts', 'Layers, snapping, brand kit and ready templates'), T('Décline un visuel en story, miniature ou flyer en un clic', 'Resize a visual into a story, thumbnail or flyer in one click'), T('Export PNG, JPG et PDF multipage', 'PNG, JPG and multipage PDF export')] },
    { id: 'local', I: HardDrive, badge: T('Local et privé', 'Local and private'), c: '#30D158', soft: '#E4F8EA', ink: '#1E8A48', glow: 'rgba(48,209,88,.2)', kind: 'local',
      title: T('Tes fichiers restent chez toi.', 'Your files stay with you.'),
      points: [T('Projets, médias et versions sont stockés dans ton navigateur', 'Projects, media and versions are stored in your browser'), T('Pas de compte à créer pour commencer', 'No account needed to start'), T('Sauvegarde et restauration en un fichier, depuis les Paramètres', 'One-file backup and restore from Settings')] },
  ];

  const fr = useApp((st) => st.lang) === 'fr';
  const PCOL = { free: '#AEAEB2', creator: '#FF9F0A', pro: '#30D158', team: '#BF5AF2' } as const;
  const PICO = { free: Sparkle, creator: Coins, pro: Sparkles, team: Briefcase } as const;
  const plans = PLANS.map((p) => ({
    I: PICO[p.id], c: PCOL[p.id], name: fr ? p.fr : p.en,
    price: p.eurMonth ? (fr ? p.eurMonth.toLocaleString('fr-FR') + ' €' : '€' + p.eurMonth) : '0 €',
    per: p.eurMonth ? (p.perSeat ? T('/ siège / mois', '/ seat / month') : T('/ mois', '/ month')) : T('pour toujours', 'forever'),
    desc: p.xofMonth ? T(`ou ${p.xofMonth.toLocaleString('fr-FR')} FCFA / mois · −17 % à l’année`, `or ${p.xofMonth.toLocaleString('fr-FR')} FCFA / month · −17% yearly`) : T('Sans carte bancaire.', 'No credit card.'),
    feats: p.features.map((f) => (fr ? f.fr : f.en)),
    btn: p.eurMonth ? T('Choisir', 'Choose') : T('Commencer', 'Get started'), live: true, dark: p.id === 'pro',
  }));

  const faqs: [string, string][] = [
    [T('Est-ce vraiment gratuit ?', 'Is it really free?'), T('Oui. Les éditeurs vidéo et design, l’export sans filigrane et les templates sont gratuits, sans limite de projets, avec 100 crédits IA offerts chaque mois. Dans claude.ai, l’assistant utilise directement ton compte Claude.', 'Yes. The video and design editors, watermark-free export and templates are free, with no project limit and 100 AI credits every month. Inside claude.ai, the assistant uses your Claude account directly.')],
    [T('Faut-il créer un compte ?', 'Do I need an account?'), T('Non. Tu peux tout utiliser tout de suite. Tes projets restent sur cet appareil ; pense à faire une sauvegarde depuis les Paramètres.', 'No. You can use everything right away. Your projects stay on this device; make a backup from Settings.')],
    [T('Mes fichiers sont-ils envoyés sur un serveur ?', 'Are my files sent to a server?'), T('Non. Tes médias, le rendu et les exports restent dans ton navigateur. Quand tu utilises l’assistant, seuls ta demande et la description du document sont envoyés à Claude.', 'No. Your media, rendering and exports stay in your browser. When you use the assistant, only your request and a description of the document are sent to Claude.')],
    [T('Quels formats puis-je exporter ?', 'Which formats can I export?'), T('PNG, JPG et PDF pour les designs ; MP4 ou WebM pour les vidéos selon ton navigateur ; SRT et WebVTT pour les sous-titres.', 'PNG, JPG and PDF for designs; MP4 or WebM for videos depending on your browser; SRT and WebVTT for captions.')],
    [T('Comment fonctionnent les crédits ?', 'How do credits work?'), T('1 crédit = 0,01 €. Chaque requête IA consomme selon sa taille réelle (un texte court : 1 à 3 crédits, une création complète : 25 à 60). L’édition et l’export ne consomment rien. Des packs sans abonnement sont aussi disponibles, dès 5 €.', '1 credit = €0.01. Each AI request uses credits based on its real size (short copy: 1 to 3 credits, a full creation: 25 to 60). Editing and exporting are free. No-subscription packs are available too, from €5.')],
    [T('Puis-je modifier ce que l’IA fait ?', 'Can I change what the AI does?'), T('Oui. En mode Assister tu valides ou refuses chaque proposition, tout s’annule avec ⌘Z et l’historique des versions garde chaque étape.', 'Yes. In Assist mode you approve or refuse each proposal, everything undoes with ⌘Z and version history keeps each step.')],
  ];

  const shotsOn = (i: number, per: number, base: number) => (t % per) >= base + i * 7;
  const capWords = lang === 'fr' ? ['CE PIXEL', 'TIENT DEUX', 'JOURS', 'SANS CHARGE', 'ÇA CHANGE', 'TOUT'] : ['THIS PHONE', 'LASTS TWO', 'DAYS', 'ON ONE CHARGE', 'IT CHANGES', 'EVERYTHING'];
  const shots = [['#FF9F0A', '#FF375F', T('Accroche', 'Hook')], ['#0A84FF', '#64D2FF', T('Démo', 'Demo')], ['#BF5AF2', '#FF375F', T('Avis', 'Review')], ['#30D158', '#0A84FF', T('Offre', 'Offer')]];

  return (
    <div ref={root} className="site">
      <div className="site-nav-wrap">
        <div className="site-nav" style={{ maxWidth: menu ? 680 : scrolled ? 620 : 660, background: scrolled ? 'rgba(28,28,30,.86)' : '#1C1C1E', boxShadow: scrolled ? '0 18px 50px rgba(0,0,0,.3)' : '0 12px 40px rgba(0,0,0,.22)' }}>
          <div className="row" style={{ gap: 4 }}>
            <button className="site-bare" onClick={() => toSection('top')} aria-label="Montaj Studio" style={{ marginRight: 8 }}><Logo box={40} bar={5} gap={3} h={18} r={12} /></button>
            <button className="site-navlink" onClick={() => setMenu(!menu)} style={{ color: menu ? '#fff' : '#AEAEB2' }}>{T('Fonctionnalités', 'Features')}{menu ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
            <button className="site-navlink hide-sm" onClick={() => toSection('tarifs')}>{T('Tarifs', 'Pricing')}</button>
            <button className="site-navlink hide-sm" onClick={() => toSection('faq')}>FAQ</button>
            <div style={{ flex: 1 }} />
            <button className="site-navlink hide-sm" onClick={() => useApp.getState().toggleLang()} title={T('Langue', 'Language')}>{lang === 'fr' ? 'EN' : 'FR'}</button>
            <button className="site-cta" onClick={start}><Sparkles size={15} />{onboarded ? T('Ouvrir l’app', 'Open the app') : T('Commencer', 'Get started')}</button>
          </div>
          {menu && (
            <div className="site-menu">
              {menuItems.map(([I, c, title, text, id]) => (
                <button key={title} className="site-menu-card" style={{ background: tint(c) }} onClick={() => toSection(id)}>
                  <span style={{ width: 38, height: 38, borderRadius: 19, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}><I size={18} color="#111113" /></span>
                  <span style={{ fontSize: 17, fontWeight: 700 }}>{title}</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,.72)', lineHeight: 1.4 }}>{text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <section id="top" className="site-hero">
        <div className="site-orbs" aria-hidden>
          <div data-orb="0" style={{ left: '8%', top: '10%', width: 420, height: 420, background: 'radial-gradient(circle, rgba(10,132,255,.28), rgba(10,132,255,0) 65%)' }} />
          <div data-orb="1" style={{ right: '6%', top: 0, width: 480, height: 480, background: 'radial-gradient(circle, rgba(191,90,242,.26), rgba(191,90,242,0) 65%)' }} />
          <div data-orb="2" style={{ left: '38%', top: '42%', width: 360, height: 360, background: 'radial-gradient(circle, rgba(255,159,10,.2), rgba(255,159,10,0) 65%)' }} />
        </div>
        <div data-float="0" className="z1"><Logo box={88} bar={11} gap={6} h={40} r={26} /></div>
        <span data-rise="0" className="site-pill z1"><span style={{ width: 8, height: 8, borderRadius: 4, background: '#30D158' }} />{T('Nouveau : Studio Chat crée designs et vidéos avec Claude', 'New: Studio Chat creates designs and videos with Claude')}</span>
        <h1 className="site-h1 z1">
          {heroWords.map((w, i) => <span key={w} data-w="1" style={i === 2 ? { background: 'linear-gradient(90deg,#0A84FF,#BF5AF2 55%,#FF375F)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : undefined}>{w}</span>)}
        </h1>
        <p data-rise="1" className="site-lead z1">{T('Monte des vidéos avec titres et sous-titres, ou crée des visuels et des miniatures dans ton navigateur. Les deux éditeurs sont gratuits et sans filigrane.', 'Edit videos with titles and captions, or create graphics and thumbnails in your browser. Both editors are free and watermark-free.')}</p>
        <div data-rise="2" className="row wrap z1" style={{ gap: 10, justifyContent: 'center' }}>
          <button className="site-btn primary" onClick={start}>{T('Commencer gratuitement', 'Start for free')}<ArrowRight size={17} /></button>
          <button className="site-btn soft" onClick={() => go('chat')}><Sparkles size={16} color="#BF5AF2" />{T('Essayer Studio Chat', 'Try Studio Chat')}</button>
        </div>
        <span data-rise="3" className="z1" style={{ fontSize: 13, color: '#8E8E93' }}>{T('Sans compte · Sans carte bancaire · Tes projets restent sur ton appareil', 'No account · No credit card · Your projects stay on your device')}</span>
      </section>

      <section style={{ padding: '30px 24px 80px', display: 'flex', justifyContent: 'center' }}>
        <div data-reveal="0" className="site-preview" style={{ transform: `perspective(1800px) rotateX(${tilt.toFixed(2)}deg)` }}>
          <div className="site-preview-in">
            <div className="site-prev-side">
              <div className="row" style={{ gap: 8, padding: '4px 6px 12px' }}><Logo box={26} bar={3} gap={2} h={12} r={8} /><span style={{ color: '#F5F5F7', fontSize: 13, fontWeight: 600 }}>Studio Chat</span></div>
              {[T('Affiche lancement', 'Launch poster'), T('Soldes boutique', 'Shop sale'), T('Miniatures YouTube', 'YouTube thumbnails'), T('Vidéo verticale', 'Vertical video')].map((l, i) => (
                <div key={l} className="row" style={{ height: 32, padding: '0 10px', borderRadius: 9, background: i === 0 ? '#2C2C2E' : 'transparent', color: '#D1D1D6', fontSize: 12, gap: 8, whiteSpace: 'nowrap', overflow: 'hidden' }}><MessageCircle size={12} color="#8E8E93" />{l}</div>
              ))}
            </div>
            <div className="col" style={{ padding: 22, gap: 14, minWidth: 0 }}>
              <div style={{ alignSelf: 'flex-end', maxWidth: '78%', padding: '10px 14px', borderRadius: '18px 18px 6px 18px', background: '#0A84FF', color: '#fff', fontSize: 14 }}>{T('Vidéo verticale pour ma crème au karité, 4 plans', 'Vertical video for my shea butter cream, 4 shots')}</div>
              <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 28, height: 28, borderRadius: 14, background: 'linear-gradient(135deg,#0A84FF,#BF5AF2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Sparkles size={13} color="#fff" /></span>
                <div className="col" style={{ gap: 10, minWidth: 0, flex: 1 }}>
                  <span style={{ color: '#F5F5F7', fontSize: 14 }}>{T('J’ai créé la vidéo en 4 plans avec un titre par plan. Ajoute tes rushs dans l’éditeur pour les remplacer.', 'I created the video in 4 shots with a title on each. Add your footage in the editor to replace them.')}</span>
                  <div className="site-shots">
                    {shots.map(([a, b, l], i) => { const on = shotsOn(i, 70, 8); return (
                      <div key={l} style={{ aspectRatio: '9/16', borderRadius: 12, background: `linear-gradient(160deg,${a},${b})`, position: 'relative', opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(10px) scale(.94)', transition: 'opacity .45s ease, transform .45s cubic-bezier(.2,.8,.2,1)' }}>
                        <span style={{ position: 'absolute', left: 6, bottom: 6, right: 6, padding: '3px 6px', borderRadius: 6, background: 'rgba(20,20,22,.6)', color: '#fff', fontSize: 10 }}>{l}</span>
                      </div>); })}
                  </div>
                  <div className="row wrap" style={{ gap: 8 }}>
                    <span className="site-chip" style={{ background: '#0A84FF', color: '#fff', fontWeight: 600 }}><Download size={12} />{T('Exporter', 'Export')}</span>
                    <span className="site-chip" style={{ background: '#2C2C2E', color: '#F5F5F7' }}><Shuffle size={12} />{T('Autre accroche', 'Another hook')}</span>
                  </div>
                </div>
              </div>
              <div className="row" style={{ marginTop: 'auto', borderRadius: 20, background: '#1C1C1E', border: '1px solid #3A3A3C', padding: '12px 14px', gap: 10, color: '#8E8E93', fontSize: 13 }}>
                <span className="ell" style={{ flex: 1, color: '#F5F5F7' }}>{typed}<span data-caret="1" style={{ display: 'inline-block', width: 2, height: 15, marginLeft: 2, background: '#0A84FF', verticalAlign: -2 }} /></span>
                <span className="site-chip hide-sm" style={{ background: 'rgba(191,90,242,.18)', color: '#D69CF7', height: 26, fontSize: 11 }}><Sparkles size={11} />Claude</span>
                <span style={{ width: 32, height: 32, borderRadius: 16, background: '#0A84FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><ArrowUp size={15} color="#fff" /></span>
              </div>
            </div>
            <div className="site-prev-side right">
              <span style={{ color: '#8E8E93', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase' }}>{T('Tâches', 'Tasks')}</span>
              {[[Clapperboard, T('Créer la vidéo', 'Create the video'), '#30D158', 0], [Type, T('Ajouter 4 titres', 'Add 4 titles'), '#30D158', 0], [Captions, T('Sous-titres', 'Captions'), '#FF9F0A', 1], [Undo2, T('Version enregistrée', 'Version saved'), '#0A84FF', 0]].map(([I, l, c, bar], i) => {
                const pct = Math.floor((t * 1.6) % 100);
                const Ic = I as React.ElementType;
                return (
                  <div key={i} className="row" style={{ gap: 10 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 10, background: '#2C2C2E', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Ic size={16} color="#D1D1D6" /></span>
                    <span className="col" style={{ gap: 2, minWidth: 0 }}>
                      <span className="ell" style={{ color: '#F5F5F7', fontSize: 12 }}>{l as string}</span>
                      <span style={{ color: c as string, fontSize: 11 }}>{bar ? T('En cours', 'Running') + ' · ' + pct + ' %' : T('Terminé', 'Done')}</span>
                      {!!bar && <span style={{ display: 'block', width: 120, height: 3, borderRadius: 2, background: '#3A3A3C', overflow: 'hidden', marginTop: 3 }}><span style={{ display: 'block', height: '100%', width: pct + '%', background: '#FF9F0A' }} /></span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '0 24px 90px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <span style={{ fontSize: 15, color: '#8E8E93' }}>{T('Pensé pour ceux qui créent tous les jours', 'Made for people who create every day')}</span>
        <div className="site-marquee-mask">
          <div data-marquee="1" className="row" style={{ gap: 48, width: 'max-content' }}>
            {[...audiences, ...audiences].map(([I, l], i) => <span key={i} className="row" style={{ gap: 8, fontSize: 19, fontWeight: 600, color: '#AEAEB2', whiteSpace: 'nowrap' }}><I size={19} />{l}</span>)}
          </div>
        </div>
      </section>

      <section className="site-dark">
        <h2 data-reveal="0" className="site-h2" style={{ color: '#F5F5F7', maxWidth: 760 }}>{T('Montaj n’est pas qu’un éditeur. C’est tout ce qui vient avant et après.', 'Montaj is not just an editor. It is everything before and after.')}</h2>
        <div className="row wrap" style={{ gap: '28px 56px', justifyContent: 'center' }}>
          {pillars.map(([I, l, id], i) => <button key={l} data-reveal={i} className="site-pillar" onClick={() => toSection(id)}><I size={44} color="#AEAEB2" /><span style={{ fontSize: 17, fontWeight: 500 }}>{l}</span></button>)}
        </div>
      </section>

      <div style={{ background: '#fff', borderRadius: '36px 36px 0 0', marginTop: -36, position: 'relative' }}>
        {feats.map((f, i) => (
          <section key={f.id} id={f.id} style={{ padding: '110px 24px 40px', display: 'flex', justifyContent: 'center' }}>
            <div className="site-feat">
              <div data-reveal="0" className="col" style={{ order: i % 2 ? 2 : 1, gap: 22, padding: '0 8px' }}>
                <span style={{ alignSelf: 'flex-start', height: 40, padding: '0 16px', borderRadius: 20, background: f.soft, color: f.ink, fontSize: 16, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}><f.I size={17} />{f.badge}</span>
                <h2 className="site-h2" style={{ textAlign: 'left' }}>{f.title}</h2>
                <div className="col" style={{ gap: 14, marginTop: 8 }}>
                  {f.points.map((p) => <span key={p} data-reveal="2" className="row" style={{ gap: 12, alignItems: 'flex-start', fontSize: 18, lineHeight: 1.4 }}><span style={{ width: 22, height: 22, borderRadius: 11, background: f.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginTop: 2 }}><Check size={13} color="#fff" /></span><span className="pretty">{p}</span></span>)}
                </div>
                <button className="site-link" style={{ color: f.ink }} onClick={() => f.id === 'chat' ? go('chat') : f.id === 'local' ? start() : void openEditor(f.id === 'video' ? 'video' : 'design')}>
                  {f.id === 'chat' ? T('Ouvrir Studio Chat', 'Open Studio Chat') : f.id === 'video' ? T('Ouvrir l’éditeur vidéo', 'Open the video editor') : f.id === 'design' ? T('Ouvrir l’éditeur design', 'Open the design editor') : T('Commencer', 'Get started')}<ArrowRight size={16} />
                </button>
              </div>
              <div data-reveal="1" className="site-vis" style={{ order: i % 2 ? 1 : 2, background: `radial-gradient(ellipse at 50% 50%, ${f.glow}, rgba(255,255,255,0) 70%)` }}>
                {f.kind === 'chat' && <ChatVis t={t} T={T} />}
                {f.kind === 'video' && <VideoVis t={t} words={capWords} />}
                {f.kind === 'design' && <DesignVis t={t} T={T} />}
                {f.kind === 'local' && <LocalVis t={t} T={T} />}
              </div>
            </div>
          </section>
        ))}

        <section id="tarifs" style={{ padding: '120px 24px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
          <div className="col" style={{ alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <span className="site-pill">{T('Tarifs', 'Pricing')}</span>
            <h2 className="site-h2 big" style={{ maxWidth: 760 }}>{T('Les éditeurs sont gratuits. Tu paies seulement l’IA que tu utilises.', 'The editors are free. You only pay for the AI you use.')}</h2>
          </div>
          <div className="site-plans">
            {plans.map((p, i) => (
              <div key={p.name} data-reveal={i} className="site-plan-h">
                <div className="col" style={{ height: '100%', borderRadius: 28, background: p.dark ? '#111113' : '#F5F5F7', color: p.dark ? '#F5F5F7' : '#1D1D1F', padding: 28, gap: 14, border: `1px solid ${p.dark ? '#30D158' : 'transparent'}` }}>
                  <span style={{ width: 42, height: 42, borderRadius: 21, background: p.c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p.I size={19} color="#111113" /></span>
                  <span className="row" style={{ gap: 8, fontSize: 21, fontWeight: 700 }}>{p.name}{p.dark && <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#30D158', color: '#111113' }}>{T('Populaire', 'Popular')}</span>}</span>
                  <div className="row" style={{ alignItems: 'baseline', gap: 6 }}><span style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-.04em' }}>{p.price}</span><span style={{ fontSize: 15, opacity: 0.65 }}>{p.per}</span></div>
                  <span className="pretty" style={{ fontSize: 15, opacity: 0.75, lineHeight: 1.45 }}>{p.desc}</span>
                  <div className="col" style={{ gap: 10, margin: '6px 0 10px' }}>
                    {p.feats.map((ft) => <span key={ft} className="row" style={{ gap: 10, fontSize: 15, lineHeight: 1.4, alignItems: 'flex-start' }}><span style={{ width: 20, height: 20, borderRadius: 10, background: p.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginTop: 1 }}><Check size={12} color="#111113" /></span><span className="pretty">{ft}</span></span>)}
                  </div>
                  <button className="site-plan-btn" disabled={!p.live} onClick={start} style={{ background: p.dark ? '#30D158' : '#1D1D1F', color: p.dark ? '#111113' : '#fff' }}>{p.btn}</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" style={{ padding: '80px 24px 100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
          <h2 className="site-h2 big">{T('Questions fréquentes', 'Frequently asked questions')}</h2>
          <div className="col" style={{ width: '100%', maxWidth: 780, gap: 10 }}>
            {faqs.map(([q, a], i) => (
              <div key={q} data-reveal={i} style={{ borderRadius: 20, background: '#F5F5F7', overflow: 'hidden' }}>
                <button className="site-faq-q" aria-expanded={faq === i} onClick={() => setFaq(faq === i ? -1 : i)}><span style={{ flex: 1 }}>{q}</span>{faq === i ? <Minus size={18} color="#8E8E93" /> : <Plus size={18} color="#8E8E93" />}</button>
                {faq === i && <p className="pretty" style={{ margin: 0, padding: '0 22px 20px', fontSize: 16, lineHeight: 1.55, color: '#48484A' }}>{a}</p>}
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: '0 24px 80px', display: 'flex', justifyContent: 'center' }}>
          <div data-reveal="0" className="site-final">
            <div data-float="2"><Logo box={72} bar={9} gap={5} h={33} r={22} /></div>
            <h2 className="site-h2 big" style={{ color: '#fff', maxWidth: 720 }}>{T('Ta prochaine vidéo commence par une phrase.', 'Your next video starts with a sentence.')}</h2>
            <p style={{ margin: 0, maxWidth: 520, color: 'rgba(255,255,255,.75)', fontSize: 18, lineHeight: 1.5 }}>{T('Ouvre Montaj Studio, écris ce que tu veux, et modifie le résultat comme tu l’entends.', 'Open Montaj Studio, write what you want, and change the result however you like.')}</p>
            <button className="site-btn" style={{ background: '#fff', color: '#111113' }} onClick={start}>{T('Commencer gratuitement', 'Start for free')}<ArrowRight size={17} /></button>
          </div>
        </section>

        <footer style={{ borderTop: '1px solid #E5E5EA', padding: '36px 24px 48px', display: 'flex', justifyContent: 'center' }}>
          <div className="row wrap" style={{ width: '100%', maxWidth: 1180, gap: 24, justifyContent: 'space-between', fontSize: 14, color: '#6E6E73' }}>
            <div className="row" style={{ gap: 10 }}><Logo box={28} bar={4} gap={2} h={13} r={9} /><span style={{ color: '#1D1D1F', fontWeight: 600 }}>Montaj Studio</span><span>© 2026</span></div>
            <div className="row wrap" style={{ gap: 22 }}>
              <button className="site-foot" onClick={() => toSection('tarifs')}>{T('Tarifs', 'Pricing')}</button>
              <button className="site-foot" onClick={() => toSection('faq')}>FAQ</button>
              <button className="site-foot" onClick={() => go('legal')}>{T('Confidentialité', 'Privacy')}</button>
              <button className="site-foot" onClick={() => go('legal')}>{T('CGU', 'Terms')}</button>
              <button className="site-foot" onClick={() => go('feedback')}>{T('Idées & bugs', 'Ideas & bugs')}</button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

type TT = (fr: string, en: string) => string;

function ChatVis({ t, T }: { t: number; T: TT }) {
  const cards = [['#0A84FF', '#BF5AF2', 'SOLDES -30 %'], ['#FF9F0A', '#FF375F', 'NOUVEAU'], ['#30D158', '#0A84FF', 'LIVE 18H'], ['#1D1D1F', '#7D5CFF', 'TEST PIXEL']];
  return (
    <div className="col" style={{ width: '100%', maxWidth: 440, borderRadius: 24, background: '#fff', boxShadow: '0 30px 80px rgba(0,0,0,.14)', padding: 16, gap: 12 }}>
      <div style={{ alignSelf: 'flex-end', padding: '9px 13px', borderRadius: '16px 16px 5px 16px', background: '#0A84FF', color: '#fff', fontSize: 13 }}>{T('4 variantes de post pour mes soldes', '4 post variants for my sale')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cards.map(([a, b, l], i) => { const on = (t % 80) >= 10 + i * 6; return (
          <div key={l} style={{ aspectRatio: '4/5', borderRadius: 14, background: `linear-gradient(160deg,${a},${b})`, opacity: on ? 1 : 0, transform: on ? 'none' : 'scale(.9)', transition: 'opacity .5s ease, transform .5s cubic-bezier(.2,.8,.2,1)', display: 'flex', alignItems: 'flex-end', padding: 12 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-.02em', lineHeight: 1 }}>{l}</span>
          </div>); })}
      </div>
      <div className="row wrap" style={{ gap: 6, justifyContent: 'center' }}>
        {[[ImageIcon, T('Ouvrir', 'Open')], [Undo2, T('Annuler', 'Undo')], [History, T('Versions', 'Versions')], [FileDown, T('Exporter', 'Export')]].map(([I, l]) => { const Ic = I as React.ElementType; return <span key={l as string} className="site-chip" style={{ background: '#F2F2F7', color: '#1D1D1F' }}><Ic size={12} />{l as string}</span>; })}
      </div>
    </div>
  );
}

function VideoVis({ t, words }: { t: number; words: string[] }) {
  const tracks: [number, string, number][][] = [[[3, '#8E3FB8', 1], [5, 'transparent', 0], [2, '#8E3FB8', 1]], [[10, '#C98A0A', 1]], [[4, '#1F5FBF', 1], [3, '#1F5FBF', 1], [3, '#1F5FBF', 1]], [[10, '#1E8A48', 1]]];
  return (
    <div className="col" style={{ width: '100%', maxWidth: 500, borderRadius: 22, background: '#1C1C1E', boxShadow: '0 30px 80px rgba(0,0,0,.25)', padding: 14, gap: 12 }}>
      <div style={{ aspectRatio: '16/9', borderRadius: 14, background: 'radial-gradient(ellipse at 30% 30%, #3A6FD8, transparent 60%), radial-gradient(ellipse at 75% 70%, #BF5AF2, transparent 55%), #0B0B14', position: 'relative' }}>
        <span style={{ position: 'absolute', left: '10%', right: '10%', bottom: '14%', display: 'flex', justifyContent: 'center' }}><span style={{ padding: '4px 10px', borderRadius: 8, background: '#fff', color: '#111113', fontWeight: 800, fontSize: 15 }}>{words[Math.floor((t % 90) / 15)]}</span></span>
      </div>
      <div className="col" style={{ position: 'relative', gap: 5 }}>
        <div style={{ position: 'absolute', top: -6, bottom: -6, left: ((t % 90) / 90 * 100).toFixed(2) + '%', width: 2, marginLeft: -1, borderRadius: 1, background: '#fff', boxShadow: '0 0 10px rgba(255,255,255,.7)', zIndex: 2 }} />
        {tracks.map((tr, i) => <div key={i} className="row" style={{ gap: 4, height: 22 }}>{tr.map(([f, c, o], k) => <div key={k} style={{ flex: f, height: '100%', borderRadius: 6, background: c, opacity: o }} />)}</div>)}
      </div>
    </div>
  );
}

function DesignVis({ t, T }: { t: number; T: TT }) {
  const layers: [React.ElementType, string][] = [[Type, T('Titre', 'Title')], [Type, 'Date'], [ImageIcon, 'Logo'], [ImageIcon, T('Photo boutique', 'Shop photo')]];
  const on = Math.floor(t / 18) % 4;
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 460, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 280, maxWidth: '72%', aspectRatio: '4/5', borderRadius: 18, background: 'radial-gradient(ellipse at 20% 15%, #FF375F, transparent 55%), radial-gradient(ellipse at 85% 40%, #7D5CFF, transparent 55%), #140A2E', boxShadow: '0 30px 80px rgba(0,0,0,.2)', position: 'relative', overflow: 'hidden' }}>
        <div className="col" style={{ position: 'absolute', inset: 'auto 18px 22px 18px', gap: 6 }}>
          <span style={{ color: '#fff', fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1 }}>{T('SOIRÉE DE LANCEMENT', 'LAUNCH NIGHT')}</span>
          <span style={{ color: '#fff', fontSize: 13 }}>{T('Samedi 26 septembre · 18 h', 'Saturday, September 26 · 6 pm')}</span>
        </div>
        <div data-pulse="1" style={{ position: 'absolute', top: 14, left: 14, right: 14, bottom: 120, border: '1.5px dashed rgba(255,255,255,.9)', borderRadius: 8 }} />
      </div>
      <div data-float="1" className="col" style={{ position: 'absolute', right: 0, top: 30, width: 170, borderRadius: 16, background: '#fff', boxShadow: '0 20px 50px rgba(0,0,0,.15)', padding: 10, gap: 4 }}>
        <span style={{ fontSize: 11, color: '#8E8E93', padding: '2px 6px' }}>{T('Calques', 'Layers')}</span>
        {layers.map(([I, l], i) => <span key={l} className="row" style={{ height: 28, padding: '0 8px', borderRadius: 8, background: on === i ? '#E6F1FF' : 'transparent', transition: 'background-color .3s ease', fontSize: 12, gap: 6 }}><I size={12} color="#8E8E93" />{l}</span>)}
      </div>
    </div>
  );
}

function LocalVis({ t, T }: { t: number; T: TT }) {
  const tiles: [React.ElementType, string, string][] = [[PenTool, T('Designs', 'Designs'), '#FF9F0A'], [Clapperboard, T('Vidéos', 'Videos'), '#64D2FF'], [ImageIcon, T('Médias', 'Media'), '#BF5AF2'], [History, T('Versions', 'Versions'), '#0A84FF'], [Palette, T('Kit de marque', 'Brand kit'), '#FF375F'], [Gauge, T('Utilisation IA', 'AI usage'), '#FFD60A'], [ShieldCheck, T('Persistant', 'Persistent'), '#30D158'], [Download, T('Sauvegarde', 'Backup'), '#AEAEB2'], [Undo2, T('Corbeille 30 j', 'Trash 30 d'), '#E5E5EA']];
  return (
    <div style={{ width: '100%', maxWidth: 460, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
      {tiles.map(([I, name, c], i) => { const on = Math.floor(t / 7) % 9 === i; return (
        <div key={name} className="col" style={{ aspectRatio: '1', borderRadius: 20, background: '#fff', boxShadow: on ? '0 22px 50px rgba(48,209,88,.28)' : '0 12px 34px rgba(0,0,0,.08)', transform: on ? 'translateY(-8px) scale(1.04)' : 'none', transition: 'transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s ease', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8, textAlign: 'center' }}>
          <span style={{ width: 36, height: 36, borderRadius: 18, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I size={16} color="#111113" /></span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{name}</span>
        </div>); })}
    </div>
  );
}
