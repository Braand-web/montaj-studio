import { create } from 'zustand';

// Who is using the app: the claude.ai account viewing the page (`user` capability).
// Outside claude.ai there is no account; the app runs in local mode.

interface Viewer { id: string | null; name: string; avatarUrl: string; color: string; isOwner: boolean; canEdit: boolean }
interface UserNs { me(): Promise<Viewer> }

interface IdentityState {
  status: 'loading' | 'claude' | 'local';
  name: string;
  avatarUrl: string | null;
  color: string;
  isOwner: boolean;
  load(): Promise<void>;
}

export const useIdentity = create<IdentityState>((set) => ({
  status: 'loading',
  name: '',
  avatarUrl: null,
  color: '#0A84FF',
  isOwner: true,
  async load() {
    try {
      const u = window.claude?.use ? ((await window.claude.use('user')) as UserNs | null) : null;
      if (!u) { set({ status: 'local', isOwner: true }); return; }
      const me = await u.me();
      set({ status: me.id || me.name ? 'claude' : 'local', name: me.name, avatarUrl: me.avatarUrl, color: me.color, isOwner: me.isOwner || !me.id });
    } catch {
      set({ status: 'local', isOwner: true });
    }
  },
}));
