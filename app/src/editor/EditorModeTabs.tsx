import { useApp, useT } from '../store/app';

export function EditorModeTabs() {
  const T = useT();
  const mode = useApp((s) => s.editorMode);
  const setMode = useApp((s) => s.setEditorMode);
  return (
    <div role="tablist" aria-label={T('Modes de création', 'Creation modes')} className="row" style={{ gap: 2, padding: 3, borderRadius: 10, background: 'var(--panel2)', flex: 'none' }}>
      <button role="tab" aria-selected={mode === 'pages'} className={'btn sm' + (mode === 'pages' ? ' primary' : '')} style={{ height: 26, padding: '0 9px' }} onClick={() => setMode('pages')}>{T('Pages', 'Pages')}</button>
      <button role="tab" aria-selected={mode === 'timeline'} className={'btn sm' + (mode === 'timeline' ? ' primary' : '')} style={{ height: 26, padding: '0 9px' }} onClick={() => setMode('timeline')}>{T('Timeline', 'Timeline')}</button>
    </div>
  );
}
