import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useT } from '../store/app';
import { onPwaChange, promptPwaInstall, pwaInstallReady, pwaInstalled } from '../lib/pwa';

export function InstallPwaButton({ className = 'btn', style }: { className?: string; style?: React.CSSProperties }) {
  const T = useT();
  const [, refresh] = useState(0);
  const [hint, setHint] = useState(false);
  useEffect(() => onPwaChange(() => refresh((n) => n + 1)), []);
  if (pwaInstalled()) return null;

  const click = async () => {
    const result = await promptPwaInstall();
    setHint(result === 'manual');
  };
  const manual = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  return (
    <span className="col" style={{ gap: 5, alignItems: 'center' }}>
      <button type="button" className={className} style={style} onClick={() => void click()}>
        <Download size={15} />{T('Installer Montaj', 'Install Montaj')}
      </button>
      {hint && <span role="status" className="faint" style={{ maxWidth: 330, textAlign: 'center', fontSize: 11 }}>
        {manual ? T('Dans Safari : Partager, puis « Sur l’écran d’accueil ».', 'In Safari: Share, then “Add to Home Screen.”') : pwaInstallReady() ? T('Le navigateur va ouvrir l’installation.', 'Your browser will open the install prompt.') : T('Ouvre le menu du navigateur et choisis « Installer Montaj Studio » ou « Ajouter à l’écran d’accueil ».', 'Open the browser menu and choose “Install Montaj Studio” or “Add to Home Screen.”')}
      </span>}
    </span>
  );
}
