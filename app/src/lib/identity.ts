import { create } from 'zustand';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

interface Viewer { id: string | null; name: string; avatarUrl: string; color: string; isOwner: boolean; canEdit: boolean }
interface UserNs { me(): Promise<Viewer> }
interface PublicConfig { supabaseUrl?: string; supabasePublishableKey?: string; googleAuthEnabled?: boolean }

let supabase: SupabaseClient | null = null;
let authSubscription: { unsubscribe(): void } | null = null;

interface IdentityState {
  status: 'loading' | 'claude' | 'google' | 'local';
  name: string;
  email: string;
  avatarUrl: string | null;
  color: string;
  isOwner: boolean;
  googleAuthEnabled: boolean;
  googleBusy: boolean;
  authError: string | null;
  load(): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
}

function applyUser(user: User | null, set: (patch: Partial<IdentityState>) => void) {
  if (!user) { set({ status: 'local', name: '', email: '', avatarUrl: null, isOwner: true, googleBusy: false, authError: null }); return; }
  const metadata = user.user_metadata ?? {};
  const name = String(metadata.full_name ?? metadata.name ?? user.email ?? '');
  const avatarUrl = metadata.avatar_url ?? metadata.picture;
  set({ status: 'google', name, email: user.email ?? '', avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : null, isOwner: false, googleBusy: false, authError: null });
}

export const useIdentity = create<IdentityState>((set, get) => ({
  status: 'loading',
  name: '',
  email: '',
  avatarUrl: null,
  color: '#0A84FF',
  isOwner: true,
  googleAuthEnabled: false,
  googleBusy: false,
  authError: null,
  async load() {
    try {
      const config: PublicConfig = await fetch('/api/config').then(async (r) => r.ok ? await r.json() as PublicConfig : {});
      const enabled = config.googleAuthEnabled === true;
      set({ googleAuthEnabled: enabled });
      if (config.supabaseUrl && config.supabasePublishableKey) {
        if (!supabase) supabase = createClient(config.supabaseUrl, config.supabasePublishableKey);
        const { data } = await supabase.auth.getSession();
        if (!authSubscription) {
          const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => applyUser(session?.user ?? null, set));
          authSubscription = auth.subscription;
        }
        if (data.session?.user) { applyUser(data.session.user, set); return; }
      }
    } catch { /* Continue with the local editor if the auth endpoint is unavailable. */ }

    try {
      const u = window.claude?.use ? ((await window.claude.use('user')) as UserNs | null) : null;
      if (!u) { set({ status: 'local', isOwner: true }); return; }
      const me = await u.me();
      set({ status: me.id || me.name ? 'claude' : 'local', name: me.name, avatarUrl: me.avatarUrl, color: me.color, isOwner: me.isOwner || !me.id });
    } catch {
      set({ status: 'local', isOwner: true });
    }
  },
  async signInWithGoogle() {
    if (!supabase || !get().googleAuthEnabled) return;
    set({ googleBusy: true, authError: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}${location.pathname}` },
    });
    if (error) set({ googleBusy: false, authError: error.message });
  },
  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) { set({ authError: error.message }); return; }
    set({ status: 'local', name: '', email: '', avatarUrl: null, isOwner: true, authError: null });
  },
}));
