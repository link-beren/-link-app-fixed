import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { ensureSeedData } from '@/db/seed';
import { useThemeEffect } from '@/app/useThemeEffect';
import { BottomNav } from '@/components/BottomNav';
import { InstallPrompt } from '@/components/InstallPrompt';
import { OnboardingScreen } from '@/features/settings/OnboardingScreen';
import { HomeScreen } from '@/features/dashboard/HomeScreen';
import { CrossfitScreen } from '@/features/crossfit/CrossfitScreen';
import { JudoScreen } from '@/features/judo/JudoScreen';
import { NutritionScreen } from '@/features/nutrition/NutritionScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/crossfit/*" element={<CrossfitScreen />} />
      <Route path="/judo/*" element={<JudoScreen />} />
      <Route path="/nutrition/*" element={<NutritionScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function IndexedDbUnavailable() {
  return (
    <div className="safe-top safe-x flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-lg font-semibold">האחסון המקומי אינו זמין</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        הדפדפן חוסם גישה ל־IndexedDB (למשל במצב גלישה פרטית). פתחו את האפליקציה במצב רגיל כדי לשמור נתונים.
      </p>
    </div>
  );
}

function AppInner() {
  useThemeEffect();
  // useLiveQuery returns `undefined` both while the query is still loading and
  // when it resolves to "no such row" — coerce the latter to `null` so the two
  // states are distinguishable and a first-run user isn't stuck on a blank screen.
  const profile = useLiveQuery(async () => (await db.userProfile.get('local-user')) ?? null, []);

  if (profile === undefined) return null;
  if (profile === null || !profile.onboardingCompleted) return <OnboardingScreen />;

  return (
    <div className="flex min-h-full flex-col">
      <InstallPrompt />
      <main className="flex-1 overflow-y-auto">
        <AppRoutes />
      </main>
      <BottomNav />
    </div>
  );
}

function App() {
  const [dbError, setDbError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureSeedData()
      .then(() => setReady(true))
      .catch((error) => {
        console.error('Failed to initialize local database', error);
        setDbError(true);
      });
  }, []);

  if (dbError) return <IndexedDbUnavailable />;
  if (!ready) return null;

  return (
    <HashRouter>
      <AppInner />
    </HashRouter>
  );
}

export default App;
