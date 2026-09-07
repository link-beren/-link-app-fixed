import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight } from 'lucide-react';
import { db } from '@/db/database';
import { Button } from '@/components/Button';
import { Card, CardStat, EmptyState } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  computeOneRmEstimates,
  isEstimateLessReliable,
  type OneRmFormula,
} from '@/lib/calculations/one-rm';
import {
  currentBestValue,
  goalGap,
  metricUnitLabel,
  resultValue,
  selectActiveGoal,
  trueOneRepMax,
} from '@/lib/calculations/exercise-stats';
import { checkAndMarkGoalAchievement } from '@/lib/goal-achievement';
import { useProfile } from '@/features/settings/useProfile';
import { useExercise, useExerciseGoals, useStrengthResults } from '@/features/crossfit/useExercises';
import type { ExerciseMetricType, StrengthResult } from '@/types';

const RANGE_OPTIONS = [
  { key: '1m', label: 'חודש', days: 30 },
  { key: '3m', label: '3 חודשים', days: 90 },
  { key: '6m', label: '6 חודשים', days: 180 },
  { key: '1y', label: 'שנה', days: 365 },
  { key: 'all', label: 'הכול', days: null },
] as const;

type RangeKey = (typeof RANGE_OPTIONS)[number]['key'];

interface ResultFormState {
  performedAt: string;
  weightKg: string;
  reps: string;
  rpe: string;
  value: string;
  note: string;
}

function emptyResultForm(): ResultFormState {
  return {
    performedAt: format(new Date(), 'yyyy-MM-dd'),
    weightKg: '',
    reps: '',
    rpe: '',
    value: '',
    note: '',
  };
}

function resultToForm(result: StrengthResult): ResultFormState {
  return {
    performedAt: result.performedAt.slice(0, 10),
    weightKg: result.weightKg?.toString() ?? '',
    reps: result.reps?.toString() ?? '',
    rpe: result.rpe?.toString() ?? '',
    value: result.value?.toString() ?? '',
    note: result.note ?? '',
  };
}

function ResultForm({
  metricType,
  initial,
  onCancel,
  onSave,
}: {
  metricType: ExerciseMetricType;
  initial: ResultFormState;
  onCancel: () => void;
  onSave: (values: ResultFormState) => Promise<void>;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!values.performedAt) {
      setError('נא לבחור תאריך');
      return;
    }
    if (metricType === 'weight') {
      const weight = Number(values.weightKg);
      const reps = Number(values.reps);
      if (!(weight > 0) || !(reps > 0) || !Number.isInteger(reps)) {
        setError('נא להזין משקל חיובי ומספר חזרות שלם וחיובי');
        return;
      }
      if (values.rpe && (Number(values.rpe) < 1 || Number(values.rpe) > 10)) {
        setError('RPE חייב להיות בין 1 ל־10');
        return;
      }
    } else {
      const value = Number(values.value);
      if (!Number.isFinite(value) || value < 0) {
        setError('נא להזין ערך תקין');
        return;
      }
    }
    setError('');
    setSaving(true);
    try {
      await onSave(values);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        תאריך
        <input
          type="date"
          className="input"
          value={values.performedAt}
          onChange={(event) => setValues({ ...values, performedAt: event.target.value })}
        />
      </label>

      {metricType === 'weight' ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              משקל (ק״ג)
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                className="input"
                value={values.weightKg}
                onChange={(event) => setValues({ ...values, weightKg: event.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              חזרות
              <input
                type="number"
                inputMode="numeric"
                className="input"
                value={values.reps}
                onChange={(event) => setValues({ ...values, reps: event.target.value })}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            RPE (אופציונלי, 1–10)
            <input
              type="number"
              min={1}
              max={10}
              inputMode="numeric"
              className="input"
              value={values.rpe}
              onChange={(event) => setValues({ ...values, rpe: event.target.value })}
            />
          </label>
        </>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          ערך ({metricUnitLabel(metricType)})
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            className="input"
            value={values.value}
            onChange={(event) => setValues({ ...values, value: event.target.value })}
          />
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        הערה (אופציונלי)
        <input className="input" value={values.note} onChange={(event) => setValues({ ...values, note: event.target.value })} />
      </label>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving}>
          שמירה
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          ביטול
        </Button>
      </div>
    </div>
  );
}

export function ExerciseDetailScreen() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const exercise = useExercise(exerciseId);
  const results = useStrengthResults(exerciseId);
  const goals = useExerciseGoals(exerciseId);
  const profile = useProfile();

  const [formula, setFormula] = useState<OneRmFormula>('epley');
  const [range, setRange] = useState<RangeKey>('3m');
  const [addingResult, setAddingResult] = useState(false);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [deletingResultId, setDeletingResultId] = useState<string | null>(null);
  const [addingGoal, setAddingGoal] = useState(false);
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [goalError, setGoalError] = useState('');

  const displayFormula = profile?.oneRmFormula ?? formula;

  const chartData = useMemo(() => {
    if (!exercise || !results) return [];
    const cutoffDays = RANGE_OPTIONS.find((option) => option.key === range)?.days ?? null;
    const cutoff = cutoffDays ? Date.now() - cutoffDays * 24 * 60 * 60 * 1000 : null;
    return results
      .filter((result) => !cutoff || new Date(result.performedAt).getTime() >= cutoff)
      .map((result) => ({
        date: format(new Date(result.performedAt), 'dd/MM/yy'),
        value: resultValue(result, exercise.metricType, displayFormula),
      }))
      .filter((point) => point.value !== null);
  }, [exercise, results, range, displayFormula]);

  if (exercise === undefined || results === undefined || goals === undefined) return null;
  if (exercise === null) {
    return (
      <div className="safe-x flex flex-col gap-4 p-4 pb-8">
        <EmptyState title="התרגיל לא נמצא" />
      </div>
    );
  }

  const current = currentBestValue(results, exercise.metricType, displayFormula);
  const truePr = exercise.metricType === 'weight' ? trueOneRepMax(results) : null;
  const activeGoal = selectActiveGoal(goals);
  const unit = metricUnitLabel(exercise.metricType);
  const historyDesc = [...results].reverse();
  const lessReliable =
    exercise.metricType === 'weight' &&
    results.some((result) => result.reps != null && isEstimateLessReliable(result.reps));

  const saveResult = async (values: ResultFormState, existingId?: string) => {
    const performedAt = new Date(values.performedAt).toISOString();
    const base: Omit<StrengthResult, 'id'> = {
      exerciseId: exercise.id,
      performedAt,
      note: values.note.trim() || undefined,
    };
    if (exercise.metricType === 'weight') {
      const weightKg = Number(values.weightKg);
      const reps = Number(values.reps);
      const estimates = computeOneRmEstimates(weightKg, reps);
      Object.assign(base, {
        weightKg,
        reps,
        rpe: values.rpe ? Number(values.rpe) : undefined,
        estimatedOneRmEpley: estimates.epley ?? undefined,
        estimatedOneRmBrzycki: estimates.brzycki ?? undefined,
      });
    } else {
      Object.assign(base, { value: Number(values.value) });
    }

    if (existingId) {
      await db.strengthResults.update(existingId, base);
    } else {
      await db.strengthResults.add({ id: crypto.randomUUID(), ...base });
    }
    await checkAndMarkGoalAchievement(db, exercise.id);
    setAddingResult(false);
    setEditingResultId(null);
  };

  const deleteResult = async () => {
    if (!deletingResultId) return;
    await db.strengthResults.delete(deletingResultId);
    setDeletingResultId(null);
  };

  const submitGoal = async () => {
    const target = Number(goalTarget);
    if (!(target > 0)) {
      setGoalError('נא להזין יעד מספרי חיובי');
      return;
    }
    await db.exerciseGoals.add({
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      targetValue: target,
      targetDate: goalDate || undefined,
      createdAt: new Date().toISOString(),
    });
    await checkAndMarkGoalAchievement(db, exercise.id);
    setAddingGoal(false);
    setGoalTarget('');
    setGoalDate('');
    setGoalError('');
  };

  return (
    <div className="safe-x flex flex-col gap-4 p-4 pb-8">
      <Link to="/crossfit" className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
        <ArrowRight size={16} /> חזרה לספרייה
      </Link>
      <header>
        <h1 className="text-2xl font-bold">{exercise.nameHe}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {exercise.nameEn} · {exercise.category}
        </p>
      </header>

      <Card className="flex flex-col gap-3">
        {exercise.metricType === 'weight' ? (
          <div className="flex gap-2" role="radiogroup" aria-label="נוסחת RM1 לתצוגה">
            {(['epley', 'brzycki'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={displayFormula === value}
                onClick={() => setFormula(value)}
                className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  displayFormula === value
                    ? 'border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-300'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                {value === 'epley' ? 'Epley' : 'Brzycki'}
              </button>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          <CardStat
            label={exercise.metricType === 'weight' ? 'RM1 נוכחי' : 'שיא נוכחי'}
            value={current !== null ? `${current.toFixed(1)} ${unit}` : '—'}
          />
          {exercise.metricType === 'weight' ? (
            <CardStat label="שיא אמיתי (חזרה אחת)" value={truePr !== null ? `${truePr.toFixed(1)} ${unit}` : '—'} />
          ) : null}
        </div>
        {lessReliable ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            חלק מההערכות מבוססות על יותר מ־12 חזרות ולכן פחות מדויקות.
          </p>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">יעד</h2>
        {activeGoal ? (
          <div className="flex flex-col gap-1 text-sm">
            <span>
              יעד: {activeGoal.targetValue} {unit}
              {activeGoal.targetDate ? ` עד ${format(new Date(activeGoal.targetDate), 'dd/MM/yyyy')}` : ''}
            </span>
            {activeGoal.achievedAt ? (
              <span className="text-teal-600 dark:text-teal-300">
                🎉 היעד הושג בתאריך {format(new Date(activeGoal.achievedAt), 'dd/MM/yyyy')}
              </span>
            ) : current !== null ? (
              (() => {
                const gap = goalGap(current, activeGoal.targetValue, exercise.metricType);
                return (
                  <span className="text-slate-500 dark:text-slate-400">
                    פער: {gap.diff.toFixed(1)} {unit} ({gap.percentOfTarget.toFixed(0)}% מהיעד)
                  </span>
                );
              })()
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">לא הוגדר יעד עדיין.</p>
        )}
        {addingGoal ? (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                ערך יעד ({unit})
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={goalTarget}
                  onChange={(event) => setGoalTarget(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                תאריך יעד (אופציונלי)
                <input type="date" className="input" value={goalDate} onChange={(event) => setGoalDate(event.target.value)} />
              </label>
            </div>
            {goalError ? <p className="text-sm text-red-500">{goalError}</p> : null}
            <div className="flex gap-2">
              <Button onClick={submitGoal}>שמירת יעד</Button>
              <Button variant="secondary" onClick={() => setAddingGoal(false)}>
                ביטול
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" className="self-start" onClick={() => setAddingGoal(true)}>
            {activeGoal && !activeGoal.achievedAt ? 'עדכון יעד' : 'יעד חדש'}
          </Button>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">גרף התקדמות</h2>
          <div className="flex flex-wrap gap-1">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={range === option.key}
                onClick={() => setRange(option.key)}
                className={`min-h-8 rounded-md px-2 text-xs font-medium ${
                  range === option.key
                    ? 'bg-teal-500 text-slate-950'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {chartData.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">אין עדיין מספיק נתונים להצגת גרף.</p>
        ) : (
          <div className="h-56 w-full" data-testid="progress-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">היסטוריה</h2>
          {!addingResult ? (
            <Button onClick={() => setAddingResult(true)}>+ תוצאה</Button>
          ) : null}
        </div>

        {addingResult ? (
          <ResultForm
            metricType={exercise.metricType}
            initial={emptyResultForm()}
            onCancel={() => setAddingResult(false)}
            onSave={(values) => saveResult(values)}
          />
        ) : null}

        {historyDesc.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">אין עדיין תוצאות. הוסיפו את הראשונה למעלה.</p>
        ) : (
          <ul>
            {historyDesc.map((result) =>
              editingResultId === result.id ? (
                <li key={result.id} className="border-b border-slate-200 py-2 last:border-b-0 dark:border-slate-800">
                  <ResultForm
                    metricType={exercise.metricType}
                    initial={resultToForm(result)}
                    onCancel={() => setEditingResultId(null)}
                    onSave={(values) => saveResult(values, result.id)}
                  />
                </li>
              ) : (
                <li
                  key={result.id}
                  className="flex items-center gap-2 border-b border-slate-200 py-2 text-sm last:border-b-0 dark:border-slate-800"
                >
                  <div className="flex-1">
                    <span className="block">{format(new Date(result.performedAt), 'dd/MM/yyyy')}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {exercise.metricType === 'weight'
                        ? `${result.weightKg} ק״ג × ${result.reps} חזרות${result.rpe ? ` · RPE ${result.rpe}` : ''}`
                        : `${result.value} ${unit}`}
                      {result.note ? ` · ${result.note}` : ''}
                    </span>
                  </div>
                  <Button variant="ghost" className="px-2 text-xs" onClick={() => setEditingResultId(result.id)}>
                    עריכה
                  </Button>
                  <Button variant="ghost" className="px-2 text-xs text-red-500" onClick={() => setDeletingResultId(result.id)}>
                    מחיקה
                  </Button>
                </li>
              ),
            )}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={deletingResultId !== null}
        title="מחיקת תוצאה"
        description="לא ניתן לשחזר תוצאה שנמחקה."
        confirmLabel="מחיקה"
        onConfirm={deleteResult}
        onCancel={() => setDeletingResultId(null)}
      />
    </div>
  );
}
