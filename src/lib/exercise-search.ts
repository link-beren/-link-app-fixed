import type { Exercise } from '@/types';

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function matchesExerciseQuery(exercise: Exercise, query: string): boolean {
  const q = normalize(query);
  if (q === '') return true;
  return (
    normalize(exercise.nameHe).includes(q) ||
    normalize(exercise.nameEn).includes(q) ||
    exercise.aliases.some((alias) => normalize(alias).includes(q))
  );
}

export function searchExercises(exercises: Exercise[], query: string): Exercise[] {
  return exercises.filter((exercise) => matchesExerciseQuery(exercise, query));
}
