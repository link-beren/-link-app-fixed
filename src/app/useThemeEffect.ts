import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';

function applyTheme(theme: 'dark' | 'light' | 'system') {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effectiveDark = theme === 'system' ? prefersDark : theme === 'dark';
  document.documentElement.classList.toggle('dark', effectiveDark);
}

// Applies the user's theme preference (default: dark, per spec section 5.3)
// to <html class="dark">. IndexedDB stays the single source of truth; this
// hook is the only piece of transient UI state derived from it.
export function useThemeEffect() {
  const theme = useLiveQuery(async () => (await db.userProfile.get('local-user'))?.theme ?? 'dark', []);

  useEffect(() => {
    const resolved = theme ?? 'dark';
    applyTheme(resolved);
    if (resolved !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyTheme('system');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);
}
