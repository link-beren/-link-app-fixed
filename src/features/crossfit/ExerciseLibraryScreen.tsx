import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Pencil, Star } from 'lucide-react';
import { db } from '@/db/database';
import { Button } from '@/components/Button';
import { Card, EmptyState } from '@/components/Card';
import { EXERCISE_CATEGORIES } from '@/db/seed-exercises';
import { searchExercises } from '@/lib/exercise-search';
import { useExercises } from '@/features/crossfit/useExercises';
import type { Exercise, ExerciseMetricType } from '@/types';

const METRIC_TYPE_LABELS: Record<ExerciseMetricType, string> = {
  weight: 'משקל',
  reps: 'חזרות',
  time: 'זמן',
  distance: 'מרחק',
  score: 'ניקוד',
};

interface ExerciseFormState {
  nameHe: string;
  nameEn: string;
  category: string;
  metricType: ExerciseMetricType;
  aliases: string;
}

const EMPTY_FORM: ExerciseFormState = {
  nameHe: '',
  nameEn: '',
  category: EXERCISE_CATEGORIES.strength,
  metricType: 'weight',
  aliases: '',
};

function ExerciseForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: ExerciseFormState;
  onCancel: () => void;
  onSave: (values: ExerciseFormState) => void;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState('');

  const submit = () => {
    if (!values.nameHe.trim() || !values.nameEn.trim() || !values.category.trim()) {
      setError('נא למלא שם עברי, שם אנגלי וקטגוריה');
      return;
    }
    onSave(values);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          שם בעברית
          <input
            className="input"
            value={values.nameHe}
            onChange={(event) => setValues({ ...values, nameHe: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          שם באנגלית
          <input
            className="input"
            value={values.nameEn}
            onChange={(event) => setValues({ ...values, nameEn: event.target.value })}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          קטגוריה
          <input
            className="input"
            list="exercise-categories"
            value={values.category}
            onChange={(event) => setValues({ ...values, category: event.target.value })}
          />
          <datalist id="exercise-categories">
            {Object.values(EXERCISE_CATEGORIES).map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          סוג מדידה
          <select
            className="input"
            value={values.metricType}
            onChange={(event) => setValues({ ...values, metricType: event.target.value as ExerciseMetricType })}
          >
            {Object.entries(METRIC_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        כינויים (מופרדים בפסיק, לחיפוש)
        <input
          className="input"
          value={values.aliases}
          onChange={(event) => setValues({ ...values, aliases: event.target.value })}
        />
      </label>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <div className="flex gap-2">
        <Button onClick={submit}>שמירה</Button>
        <Button variant="secondary" onClick={onCancel}>
          ביטול
        </Button>
      </div>
    </div>
  );
}

function ExerciseRow({ exercise, onEdit }: { exercise: Exercise; onEdit: () => void }) {
  const toggleFavorite = () => db.exercises.update(exercise.id, { favorite: !exercise.favorite });
  const toggleHidden = () => db.exercises.update(exercise.id, { hidden: !exercise.hidden });

  return (
    <li className="flex items-center gap-2 border-b border-slate-200 py-2 last:border-b-0 dark:border-slate-800">
      <Link to={exercise.id} className="flex-1 py-1">
        <span className="block font-medium">{exercise.nameHe}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">
          {exercise.nameEn} · {METRIC_TYPE_LABELS[exercise.metricType]}
        </span>
      </Link>
      <button
        type="button"
        aria-label={exercise.favorite ? 'הסרה ממועדפים' : 'הוספה למועדפים'}
        aria-pressed={exercise.favorite}
        onClick={toggleFavorite}
        className="flex min-h-11 min-w-11 items-center justify-center text-slate-400 hover:text-amber-500 aria-pressed:text-amber-500"
      >
        <Star size={20} fill={exercise.favorite ? 'currentColor' : 'none'} />
      </button>
      {!exercise.builtIn ? (
        <button
          type="button"
          aria-label="עריכת תרגיל"
          onClick={onEdit}
          className="flex min-h-11 min-w-11 items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <Pencil size={18} />
        </button>
      ) : null}
      <button
        type="button"
        aria-label={exercise.hidden ? 'הצגת תרגיל' : 'הסתרת תרגיל'}
        onClick={toggleHidden}
        className="flex min-h-11 min-w-11 items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
      >
        {exercise.hidden ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </li>
  );
}

export function ExerciseLibraryScreen() {
  const exercises = useExercises();
  const [query, setQuery] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (!exercises) return [];
    const filtered = searchExercises(exercises, query).filter((exercise) => showHidden || !exercise.hidden);
    return filtered.sort((a, b) => a.nameHe.localeCompare(b.nameHe, 'he'));
  }, [exercises, query, showHidden]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Exercise[]>();
    for (const exercise of visible) {
      const list = groups.get(exercise.category) ?? [];
      list.push(exercise);
      groups.set(exercise.category, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'he'));
  }, [visible]);

  const editingExercise = exercises?.find((exercise) => exercise.id === editingId);

  const createExercise = async (values: ExerciseFormState) => {
    await db.exercises.add({
      id: crypto.randomUUID(),
      nameHe: values.nameHe.trim(),
      nameEn: values.nameEn.trim(),
      aliases: values.aliases
        .split(',')
        .map((alias) => alias.trim())
        .filter(Boolean),
      category: values.category.trim(),
      metricType: values.metricType,
      builtIn: false,
      favorite: false,
      hidden: false,
    });
    setAdding(false);
  };

  const saveEdit = async (values: ExerciseFormState) => {
    if (!editingId) return;
    await db.exercises.update(editingId, {
      nameHe: values.nameHe.trim(),
      nameEn: values.nameEn.trim(),
      aliases: values.aliases
        .split(',')
        .map((alias) => alias.trim())
        .filter(Boolean),
      category: values.category.trim(),
      metricType: values.metricType,
    });
    setEditingId(null);
  };

  return (
    <div className="safe-x flex flex-col gap-4 p-4 pb-8">
      <h1 className="text-2xl font-bold">קרוספיט</h1>

      <input
        type="search"
        className="input"
        placeholder="חיפוש תרגיל בעברית או אנגלית..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="חיפוש תרגיל"
      />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} />
        הצגת תרגילים מוסתרים
      </label>

      {exercises === undefined ? null : grouped.length === 0 ? (
        <EmptyState title="לא נמצאו תרגילים" description="נסו חיפוש אחר או הוסיפו תרגיל מותאם אישית." />
      ) : (
        grouped.map(([category, items]) => (
          <Card key={category}>
            <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{category}</h2>
            <ul>
              {items.map((exercise) =>
                editingId === exercise.id && editingExercise ? (
                  <li key={exercise.id} className="border-b border-slate-200 py-2 last:border-b-0 dark:border-slate-800">
                    <ExerciseForm
                      initial={{
                        nameHe: editingExercise.nameHe,
                        nameEn: editingExercise.nameEn,
                        category: editingExercise.category,
                        metricType: editingExercise.metricType,
                        aliases: editingExercise.aliases.join(', '),
                      }}
                      onCancel={() => setEditingId(null)}
                      onSave={saveEdit}
                    />
                  </li>
                ) : (
                  <ExerciseRow key={exercise.id} exercise={exercise} onEdit={() => setEditingId(exercise.id)} />
                ),
              )}
            </ul>
          </Card>
        ))
      )}

      <Card>
        {adding ? (
          <ExerciseForm initial={EMPTY_FORM} onCancel={() => setAdding(false)} onSave={createExercise} />
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)} className="w-full">
            + תרגיל מותאם אישית
          </Button>
        )}
      </Card>
    </div>
  );
}
