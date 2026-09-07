import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { UserProfile } from '@/types';

export function useProfile(): UserProfile | undefined {
  return useLiveQuery(() => db.userProfile.get('local-user'), []);
}

export function useAppSettings() {
  return useLiveQuery(() => db.appSettings.get('settings'), []);
}
