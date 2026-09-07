import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '@/db/database';
import { Button } from '@/components/Button';
import { Card, CardStat, EmptyState } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { actualWeeklyRateKg, computeWeightTrend } from '@/lib/calculations/weight-trend';
import { requiredWeeklyRateKg, daysRemaining } from '@/lib/calculations/weigh-in';
import { useActiveWeightGoal, useWeightEntries } from '@/features/nutrition/useWeight';
import { useProfile } from '@/features/settings/useProfile';

function nowLocalDateInputValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function nowLocalTimeInputValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function AddWeightEntryForm({ onDone }: { onDone: () => void }) {
  const [measuredAtDate, setMeasuredAtDate] = useState(nowLocalDateInputValue());
  const [measuredAtTime, setMeasuredAtTime] = useState(nowLocalTimeInputValue());
  const [weightKg, setWeightKg] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    const parsed = Number(weightKg);
    if (!measuredAtDate || !Number.isFinite(parsed) || parsed <= 0) {
      setError('נא להזין תאריך ומשקל חיובי');
      return;
    }
    setError('');
    const isoMeasuredAt = new Date(`${measuredAtDate}T${measuredAtTime || '00:00'}`).toISOString();
    await db.weightEntries.add({
      id: crypto.randomUUID(),
      measuredAt: isoMeasuredAt,
      weightKg: parsed,
      note: note || undefined,
      excludedFromTrend: false,
    });
    // Spec section 6: weighing in via the nutrition screen also updates the
    // profile's current weight, but never rewrites or deletes past entries.
    const profile = await db.userProfile.get('local-user');
    if (profile) {
      await db.userProfile.update('local-user', { currentWeightKg: parsed, updatedAt: new Date().toISOString() });
    }
    onDone();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          תאריך
          <input
            type="date"
            className="input"
            value={measuredAtDate}
            onChange={(event) => setMeasuredAtDate(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          שעה
          <input
            type="time"
            className="input"
            value={measuredAtTime}
            onChange={(event) => setMeasuredAtTime(event.target.value)}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        משקל (ק״ג)
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          className="input"
          value={weightKg}
          onChange={(event) => setWeightKg(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        הערה (אופציונלי)
        <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <div className="flex gap-2">
        <Button onClick={submit}>שמירת שקילה</Button>
        <Button variant="secondary" onClick={onDone}>
          ביטול
        </Button>
      </div>
    </div>
  );
}

export function WeightScreen() {
  const entries = useWeightEntries();
  const profile = useProfile();
  const activeGoal = useActiveWeightGoal();
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const trend = useMemo(() => computeWeightTrend(entries ?? []), [entries]);
  const now = useMemo(() => new Date(), []);
  const actualRate = useMemo(() => actualWeeklyRateKg(entries ?? [], now), [entries, now]);

  const requiredRate = useMemo(() => {
    if (!activeGoal || trend.length === 0) return null;
    const latestWeight = trend[trend.length - 1].weightKg;
    const days = daysRemaining(now, new Date(activeGoal.targetDate));
    return requiredWeeklyRateKg(latestWeight, activeGoal.targetWeightKg, days);
  }, [activeGoal, trend, now]);

  const chartData = useMemo(
    () =>
      trend.map((point) => ({
        date: format(new Date(point.measuredAt), 'dd/MM'),
        weightKg: point.weightKg,
        movingAverageKg: Number(point.movingAverageKg.toFixed(1)),
      })),
    [trend],
  );

  const toggleExcluded = async (id: string, excludedFromTrend: boolean) => {
    await db.weightEntries.update(id, { excludedFromTrend: !excludedFromTrend });
  };

  const remove = async () => {
    if (!deletingId) return;
    await db.weightEntries.delete(deletingId);
    setDeletingId(null);
  };

  if (entries === undefined || profile === undefined) return null;

  const sortedDesc = [...entries].sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());

  return (
    <div className="safe-x flex flex-col gap-4 p-4 pb-8">
      <Link to="/nutrition" className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
        <ArrowRight size={16} /> חזרה לתזונה
      </Link>
      <h1 className="text-2xl font-bold">יומן שקילות</h1>

      <Card className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-4">
          <CardStat
            label="שינוי מהשבוע הקודם"
            value={actualRate !== null ? `${actualRate >= 0 ? '+' : ''}${actualRate.toFixed(1)} ק״ג` : '—'}
            sub="ממוצע נע 7 ימים מול השבוע שלפניו"
          />
          <CardStat
            label="קצב בפועל מול קצב נדרש"
            value={
              actualRate !== null && requiredRate !== null
                ? `${actualRate.toFixed(2)} / ${requiredRate.toFixed(2)} ק״ג/שבוע`
                : '—'
            }
            sub={activeGoal ? undefined : 'אין יעד משקל פעיל'}
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">גרף משקל</h2>
        {chartData.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">הוסיפו שקילה ראשונה כדי לראות גרף.</p>
        ) : (
          <div className="h-56 w-full" data-testid="weight-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} domain={['auto', 'auto']} />
                <Tooltip />
                {activeGoal ? (
                  <ReferenceLine y={activeGoal.targetWeightKg} stroke="#f59e0b" strokeDasharray="4 4" label="יעד" />
                ) : null}
                <Line type="monotone" dataKey="weightKg" stroke="#94a3b8" strokeWidth={1.5} dot={{ r: 2 }} name="משקל" />
                <Line
                  type="monotone"
                  dataKey="movingAverageKg"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  dot={false}
                  name="ממוצע נע"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          קו המגמה הוא ממוצע נע ל־7 ימים; שקילות שסומנו כחריגות מוחרגות מהגרף וממנו בלבד.
        </p>
      </Card>

      {adding ? (
        <Card>
          <AddWeightEntryForm onDone={() => setAdding(false)} />
        </Card>
      ) : (
        <Button className="self-start" onClick={() => setAdding(true)}>
          + שקילה חדשה
        </Button>
      )}

      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">היסטוריה</h2>
        {sortedDesc.length === 0 ? (
          <EmptyState title="אין עדיין שקילות" />
        ) : (
          <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
            {sortedDesc.map((weightEntry) => (
              <li key={weightEntry.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {weightEntry.weightKg.toFixed(1)} ק״ג · {format(new Date(weightEntry.measuredAt), 'dd/MM/yyyy HH:mm')}
                  </p>
                  {weightEntry.note ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{weightEntry.note}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs font-medium text-amber-600 dark:text-amber-300"
                    onClick={() => toggleExcluded(weightEntry.id, weightEntry.excludedFromTrend)}
                  >
                    {weightEntry.excludedFromTrend ? 'ביטול החרגה' : 'החרגה ממגמה'}
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-500"
                    onClick={() => setDeletingId(weightEntry.id)}
                  >
                    מחיקה
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={deletingId !== null}
        title="מחיקת שקילה"
        description="לא ניתן לשחזר שקילה שנמחקה."
        confirmLabel="מחיקה"
        onConfirm={remove}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
