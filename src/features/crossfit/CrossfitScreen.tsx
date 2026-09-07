import { Route, Routes } from 'react-router-dom';
import { ExerciseLibraryScreen } from '@/features/crossfit/ExerciseLibraryScreen';
import { ExerciseDetailScreen } from '@/features/crossfit/ExerciseDetailScreen';

export function CrossfitScreen() {
  return (
    <Routes>
      <Route index element={<ExerciseLibraryScreen />} />
      <Route path=":exerciseId" element={<ExerciseDetailScreen />} />
    </Routes>
  );
}
