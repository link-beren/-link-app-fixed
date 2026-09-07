import { Route, Routes } from 'react-router-dom';
import { CompetitionListScreen } from '@/features/judo/CompetitionListScreen';
import { CompetitionDetailScreen } from '@/features/judo/CompetitionDetailScreen';
import { AchievementsScreen } from '@/features/judo/AchievementsScreen';

export function JudoScreen() {
  return (
    <Routes>
      <Route index element={<CompetitionListScreen />} />
      <Route path="achievements" element={<AchievementsScreen />} />
      <Route path=":competitionId" element={<CompetitionDetailScreen />} />
    </Routes>
  );
}
