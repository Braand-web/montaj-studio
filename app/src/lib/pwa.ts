type InstallChoice = { outcome: 'accepted' | 'dismissed'; platform: string };
interface InstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<InstallChoice> }

let deferred: InstallPromptEvent | null = null;
let installed = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => { installed = true; deferred = null; emit(); });
}

export const onPwaChange = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const pwaInstalled = () => installed;
export const pwaInstallReady = () => deferred !== null;

export async function promptPwaInstall(): Promise<'installed' | 'dismissed' | 'manual'> {
  if (installed) return 'installed';
  const prompt = deferred;
  if (!prompt) return 'manual';
  deferred = null;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  if (choice.outcome === 'accepted') installed = true;
  emit();
  return choice.outcome === 'accepted' ? 'installed' : 'dismissed';
}
