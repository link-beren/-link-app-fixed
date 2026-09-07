import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { db } from '@/db/database';
import { Button } from '@/components/Button';
import { Card, CardStat } from '@/components/Card';
import {
  baselineDailyExpenditureKcal,
  computeBmr,
} from '@/lib/calculations/bmr';
import {
  MINOR_SAFETY_DISCLAIMER,
  isBelowBmr,
  isDeficitTooLarge,
  isWeightGainGoal,
  requiredDailyDeficitKcal,
  requiredWeeklyDeficitKcal,
  targetDailyCalories,
  weightToLoseKg,
} from '@/lib/calculations/weight-goal';
import { daysRemaining, isAggressiveRate, requiredWeeklyRateKg, suggestAlternativeDate } from '@/lib/calculations/weigh-in';
import { useActiveWeightGoal, useLatestWeightEntry } from '@/features/nutrition/useWeight';
import { useProfile } from '@/features/settings/useProfile';

function todayDateInputValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function WeightGoalScreen() {
  const [searchParams] = useSearchParams();
  const profile = useProfile();
  const activeGoal = useActiveWeightGoal();
  const latestWeight = useLatestWeightEntry();

  const [startDate, setStartDate] = useState(todayDateInputValue());
  const [currentWeightKg, setCurrentWeightKg] = useState<string | null>(null);
  const [targetWeightKg, setTargetWeightKg] = useState(searchParams.get('targetWeightKg') ?? '');
  const [targetDate, setTargetDate] = useState(searchParams.get('targetDate') ?? '');
  const linkedCompetitionId = searchParams.get('linkedCompetitionId') ?? undefined;
  const [error, setError] = useState('');

  const defaultCurrentWeightKg = latestWeight?.weightKg ?? profile?.currentWeightKg ?? 0;
  const effectiveCurrentWeightKg = currentWeightKg !== null ? Number(currentWeightKg) : defaultCurrentWeightKg;

  const analysis = useMemo(() => {
    if (!profile) return null;
    const parsedTarget = Number(targetWeightKg);
    if (!targetDate || !Number.isFinite(parsedTarget) || parsedTarget <= 0 || effectiveCurrentWeightKg <= 0) return null;

    if (isWeightGainGoal(effectiveCurrentWeightKg, parsedTarget)) {
      return { gainGoal: true } as const;
    }

    const from = new Date(startDate);
    const to = new Date(targetDate);
    const days = daysRemaining(from, to);
    const weeklyRate = requiredWeeklyRateKg(effectiveCurrentWeightKg, parsedTarget, days);
    if (weeklyRate === null) return { gainGoal: false, pastDate: true } as const;

    const aggressive = isAggressiveRate(weeklyRate, effectiveCurrentWeightKg);
    const altDate = aggressive ? suggestAlternativeDate(from, effectiveCurrentWeightKg, parsedTarget) : null;

    const weeklyDeficit = requiredWeeklyDeficitKcal(weeklyRate);
    const dailyDeficit = requiredDailyDeficitKcal(weeklyDeficit);
    const bmr = computeBmr(profile, from);
    const baseline = baselineDailyExpenditureKcal(bmr, profile.nonExerciseActivityLevel);
    const targetCalories = targetDailyCalories(baseline, dailyDeficit);
    const deficitTooLarge = isDeficitTooLarge(dailyDeficit, baseline);
    const belowBmr = isBelowBmr(targetCalories, bmr);

    return {
      gainGoal: false,
      pastDate: false,
      parsedTarget,
      days,
      weeklyRate,
      aggressive,
      altDate,
      weeklyDeficit,
      dailyDeficit,
      bmr,
      baseline,
      targetCalories,
      deficitTooLarge,
      belowBmr,
    } as const;
  }, [profile, targetWeightKg, targetDate, effectiveCurrentWeightKg, startDate]);

  const showWarnings = analysis && !analysis.gainGoal && !analysis.pastDate && (analysis.aggressive || analysis.deficitTooLarge || analysis.belowBmr);

  const save = async () => {
    if (!analysis || analysis.gainGoal || analysis.pastDate) {
      setError('נא להזין משקל יעד ותאריך יעד תקינים בעתיד');
      return;
    }
    setError('');
    const existingActive = await db.weightGoals.toArray();
    await Promise.all(
      existingActive.filter((goal) => goal.active).map((goal) => db.weightGoals.update(goal.id, { active: false })),
    );
    await db.weightGoals.add({
      id: crypto.randomUUID(),
      startDate: new Date(startDate).toISOString(),
      startWeightKg: effectiveCurrentWeightKg,
      targetWeightKg: analysis.parsedTarget,
      targetDate: new Date(targetDate).toISOString(),
      linkedCompetitionId,
      active: true,
      createdAt: new Date().toISOString(),
    });
  };

  const deactivate = async () => {
    if (!activeGoal) return;
    await db.weightGoals.update(activeGoal.id, { active: false });
  };

  if (profile === undefined || latestWeight === undefined || activeGoal === undefined) return null;

  return (
    <div className="safe-x flex flex-col gap-4 p-4 pb-8">
      <Link to="/nutrition" className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
        <ArrowRight size={16} /> חזרה לתזונה
      </Link>
      <h1 className="text-2xl font-bold">יעד משקל</h1>

      {activeGoal ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">היעד הפעיל</h2>
          <div className="grid grid-cols-2 gap-4">
            <CardStat label="משקל התחלה" value={`${activeGoal.startWeightKg.toFixed(1)} ק״ג`} />
            <CardStat label="משקל יעד" value={`${activeGoal.targetWeightKg.toFixed(1)} ק״ג`} />
            <CardStat label="תאריך יעד" value={format(new Date(activeGoal.targetDate), 'dd/MM/yyyy')} />
            <CardStat label="לשינוי" value={`${weightToLoseKg(activeGoal.startWeightKg, activeGoal.targetWeightKg).toFixed(1)} ק״ג`} />
          </div>
          <Button variant="secondary" className="self-start" onClick={deactivate}>
            ביטול היעד הפעיל
          </Button>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{activeGoal ? 'הגדרת יעד חדש' : 'הגדרת יעד משקל'}</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            משקל נוכחי (ק״ג)
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              className="input"
              value={currentWeightKg ?? String(defaultCurrentWeightKg)}
              onChange={(event) => setCurrentWeightKg(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            משקל יעד (ק״ג)
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              className="input"
              value={targetWeightKg}
              onChange={(event) => setTargetWeightKg(event.target.value)}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            תאריך התחלה
            <input type="date" className="input" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            תאריך יעד
            <input type="date" className="input" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
          </label>
        </div>

        {analysis?.gainGoal ? (
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-300">
            מצב עלייה במשקל עדיין אינו נתמך בגרסה הזו. לא ניתן לשמור יעד כזה.
          </p>
        ) : null}

        {analysis && !analysis.gainGoal && !analysis.pastDate ? (
          <div className="grid grid-cols-2 gap-4">
            <CardStat label="ימים שנותרו" value={String(Math.max(0, analysis.days))} />
            <CardStat label="קצב שבועי נדרש" value={`${analysis.weeklyRate.toFixed(2)} ק״ג/שבוע`} />
            <CardStat label="גירעון יומי נדרש" value={`${Math.round(analysis.dailyDeficit)} קק״ל`} />
            <CardStat label="יעד קלוריות יומי" value={`${Math.round(analysis.targetCalories)} קק״ל`} />
          </div>
        ) : null}

        {analysis?.pastDate ? <p className="text-sm text-red-500">תאריך היעד כבר עבר. נא לבחור תאריך עתידי.</p> : null}

        {showWarnings ? (
          <div className="flex flex-col gap-2 rounded-lg bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            {analysis && !analysis.gainGoal && !analysis.pastDate && analysis.aggressive ? (
              <p>
                קצב השינוי המבוקש גדול מ־0.5% ממשקל הגוף בשבוע.
                {analysis.altDate ? ` תאריך יעד חלופי בקצב שמרני יותר: ${format(analysis.altDate, 'dd/MM/yyyy')}.` : ''}
              </p>
            ) : null}
            {analysis && !analysis.gainGoal && !analysis.pastDate && analysis.deficitTooLarge ? (
              <p>הגירעון היומי הנדרש גדול מ־20% מההוצאה היומית המוערכת.</p>
            ) : null}
            {analysis && !analysis.gainGoal && !analysis.pastDate && analysis.belowBmr ? (
              <p>יעד הקלוריות המחושב נמוך מקצב חילוף החומרים הבסיסי (BMR) המשוער.</p>
            ) : null}
            <p className="font-semibold">{MINOR_SAFETY_DISCLAIMER}</p>
          </div>
        ) : null}

        <p className="text-xs text-slate-500 dark:text-slate-400">
          זהו כלי הערכה בלבד ואינו כלי רפואי. ההוצאה האנרגטית היא הערכה שיכולה לסטות משמעותית בין אנשים.
        </p>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <Button className="self-start" onClick={save} disabled={Boolean(analysis?.gainGoal)}>
          שמירת יעד
        </Button>
      </Card>
    </div>
  );
}
