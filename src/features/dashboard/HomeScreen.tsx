import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardStat, EmptyState } from '@/components/Card';
import { useCompetitions } from '@/features/judo/useCompetitions';
import { useLatestStrengthResult } from '@/features/crossfit/useExercises';
import { useActiveWeightGoal, useLatestWeightEntry, useWeightEntries } from '@/features/nutrition/useWeight';
import { countdownTarget, selectUpcomingCompetition } from '@/lib/calculations/judo-stats';
import { daysRemaining } from '@/lib/calculations/weigh-in';
import { actualWeeklyRateKg } from '@/lib/calculations/weight-trend';

const linkClass =
  'min-h-11 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-400 flex items-center';
const linkClassSecondary =
  'min-h-11 rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 flex items-center';

function UpcomingCompetitionCard() {
  const competitions = useCompetitions();
  const latestWeight = useLatestWeightEntry();
  if (competitions === undefined || latestWeight === undefined) return null;

  const upcoming = selectUpcomingCompetition(competitions, new Date());
  if (!upcoming) return null;

  const days = daysRemaining(new Date(), countdownTarget(upcoming));

  return (
    <Link to={`/judo/${upcoming.id}`}>
      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">התחרות הקרובה</h2>
        <p className="text-base font-medium">{upcoming.name}</p>
        <div className="grid grid-cols-3 gap-3">
          <CardStat label="ימים שנותרו" value={String(Math.max(0, days))} />
          <CardStat label="קטגוריית משקל" value={`${upcoming.weightClassKg} ק״ג`} />
          <CardStat label="משקל אחרון" value={latestWeight ? `${latestWeight.weightKg.toFixed(1)} ק״ג` : '—'} />
        </div>
      </Card>
    </Link>
  );
}

function LatestPrCard() {
  const latest = useLatestStrengthResult();
  if (latest === undefined || latest === null) return null;

  const { result, exercise } = latest;
  const valueText =
    result.weightKg != null
      ? `${result.weightKg} ק״ג${result.reps ? ` × ${result.reps}` : ''}`
      : result.value != null
        ? String(result.value)
        : '—';

  return (
    <Link to={`/crossfit/${exercise.id}`}>
      <Card className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">השיא האחרון</h2>
        <p className="text-base font-medium">{exercise.nameHe}</p>
        <div className="grid grid-cols-2 gap-3">
          <CardStat label="תוצאה" value={valueText} />
          <CardStat label="תאריך" value={format(new Date(result.performedAt), 'dd/MM/yyyy')} />
        </div>
      </Card>
    </Link>
  );
}

function WeightStatusCard() {
  const latestWeight = useLatestWeightEntry();
  const activeGoal = useActiveWeightGoal();
  const entries = useWeightEntries();
  if (latestWeight === undefined || activeGoal === undefined || entries === undefined) return null;
  if (!latestWeight) return null;

  const actualRate = actualWeeklyRateKg(entries, new Date());

  return (
    <Link to="/nutrition/weight">
      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">משקל</h2>
        <div className="grid grid-cols-2 gap-3">
          <CardStat label="משקל אחרון" value={`${latestWeight.weightKg.toFixed(1)} ק״ג`} />
          {activeGoal ? (
            <CardStat label="יעד פעיל" value={`${activeGoal.targetWeightKg.toFixed(1)} ק״ג`} />
          ) : (
            <CardStat label="יעד פעיל" value="אין" />
          )}
        </div>
        {actualRate !== null ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            שינוי שבועי אחרון: {actualRate >= 0 ? '+' : ''}
            {actualRate.toFixed(1)} ק״ג
          </p>
        ) : null}
      </Card>
    </Link>
  );
}

export function HomeScreen() {
  const competitions = useCompetitions();
  const latestPr = useLatestStrengthResult();
  const latestWeight = useLatestWeightEntry();

  const stillLoading = competitions === undefined || latestPr === undefined || latestWeight === undefined;
  const hasAnyData =
    !stillLoading &&
    ((competitions?.length ?? 0) > 0 || latestPr !== null || latestWeight !== null);

  return (
    <div className="safe-x flex flex-col gap-4 p-4 pb-8">
      <h1 className="text-2xl font-bold">בית</h1>

      {stillLoading ? null : hasAnyData ? (
        <>
          <UpcomingCompetitionCard />
          <LatestPrCard />
          <WeightStatusCard />
        </>
      ) : (
        <EmptyState
          title="עדיין אין נתונים להצגה"
          description="ברגע שתוסיפו תחרות, תוצאת כוח או שקילה, כאן יופיע סיכום מהיר."
        />
      )}

      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">פעולות מהירות</h2>
        <div className="flex flex-wrap gap-2">
          <Link to="/crossfit" className={linkClass}>
            תוצאה בקרוספיט
          </Link>
          <Link to="/judo" className={linkClassSecondary}>
            תחרות
          </Link>
          <Link to="/nutrition/weight" className={linkClassSecondary}>
            שקילה
          </Link>
          <Link to="/nutrition" className={linkClassSecondary}>
            הוספת אוכל
          </Link>
        </div>
      </Card>
    </div>
  );
}
