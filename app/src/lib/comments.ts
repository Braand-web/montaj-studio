// Opens the claude.ai comment composer on an element (composer-only capability): the
// comment is posted by the viewer with their own account and reaches the artifact's owner.

interface CommentsNs { openComposer(t: { element: Element }): Promise<{ opened: boolean }> }
let p: Promise<CommentsNs | null> | null = null;

export function getComments(): Promise<CommentsNs | null> {
  if (!p) p = window.claude?.use ? (window.claude.use('comments') as Promise<CommentsNs | null>).catch(() => null) : Promise.resolve(null);
  return p;
}

export async function openComposerOn(el: Element): Promise<'opened' | 'busy' | 'unavailable'> {
  const c = await getComments();
  if (!c) return 'unavailable';
  try {
    const r = await c.openComposer({ element: el });
    return r.opened ? 'opened' : 'busy';
  } catch {
    return 'unavailable';
  }
}
