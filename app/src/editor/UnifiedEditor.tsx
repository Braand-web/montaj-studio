import { useApp } from '../store/app';
import { DesignEditor } from '../design/DesignEditor';
import { VideoEditor } from '../video/VideoEditor';

/** One project editor with linked Pages and Timeline work modes. */
export function UnifiedEditor() {
  const mode = useApp((s) => s.editorMode);
  return mode === 'timeline' ? <VideoEditor /> : <DesignEditor />;
}
