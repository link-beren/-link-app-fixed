import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { db } from '@/db/database';
import { Button } from '@/components/Button';
import { Card, CardStat, EmptyState } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { buildCompetitionIcs } from '@/lib/ics';
import { daysRemaining, isAggressiveRate, requiredWeeklyRateKg, suggestAlternativeDate } from '@/lib/calculations/weigh-in';
import { countdownTarget, MEDAL_LABELS } from '@/lib/calculations/judo-stats';
import { syncCompetitionAchievement } from '@/lib/judo-achievements';
import { CompetitionForm } from '@/features/judo/CompetitionForm';
import { competitionToForm, formToCompetitionPatch, type CompetitionFormState } from '@/features/judo/competition-form-state';
import { useCompetition } from '@/features/judo/useCompetitions';
import { useLatestWeightEntry } from '@/features/nutrition/useWeight';
import type { JudoCompetition } from '@/types';

const STATUS_LABELS: Record<JudoCompetition['status'], string> = {
  planned: 'מתוכננת',
  completed: 'הושלמה',
  cancelled: 'בוטלה',
};

function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function weightGoalDeepLink(competition: JudoCompetition): string {
  const params = new URLSearchParams({ linkedCompetitionId: competition.id });
  const weighInDate = competition.weighInAt ?? competition.startsAt;
  if (weighInDate) params.set('targetDate', toDateInputValue(new Date(weighInDate)));
  if (competition.targetWeighInKg) params.set('targetWeightKg', String(competition.targetWeighInKg));
  return `/nutrition/goal?${params.toString()}`;
}

function WeighInModeCard({ competition }: { competition: JudoCompetition }) {
  const latestWeight = useLatestWeightEntry();
  if (latestWeight === undefined) return null;

  if (!latestWeight || !competition.targetWeighInKg) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">מצב משקל לתחרות</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          יש להזין שקילה וקטגוריית יעד לשקילה אישית כדי להציג ניתוח קצב.
        </p>
        <Link to={weightGoalDeepLink(competition)} className="text-sm font-medium text-teal-600 dark:text-teal-300">
          הגדרת יעד משקל בתזונה
        </Link>
      </Card>
    );
  }

  const target = countdownTarget(competition);
  const days = daysRemaining(new Date(), target);
  const weeklyRate = requiredWeeklyRateKg(latestWeight.weightKg, competition.targetWeighInKg, days);
  const aggressive = weeklyRate !== null && isAggressiveRate(weeklyRate, latestWeight.weightKg);
  const altDate = aggressive ? suggestAlternativeDate(new Date(), latestWeight.weightKg, competition.targetWeighInKg) : null;
  const gap = latestWeight.weightKg - competition.targetWeighInKg;

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">מצב משקל לתחרות</h2>
      <div className="grid grid-cols-2 gap-4">
        <CardStat label="משקל אחרון שנמדד" value={`${latestWeight.weightKg.toFixed(1)} ק״ג`} />
        <CardStat label="פער מהיעד" value={`${gap >= 0 ? '+' : ''}${gap.toFixed(1)} ק״ג`} />
        <CardStat label="ימים שנותרו" value={String(Math.max(0, days))} />
        <CardStat label="קצב שבועי דרוש" value={weeklyRate !== null ? `${weeklyRate.toFixed(2)} ק״ג/שבוע` : '—'} />
      </div>
      {aggressive ? (
        <div className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          <p className="font-semibold">קצב השינוי הדרוש לתאריך זה חורג מהקצב השמרני המומלץ.</p>
          {altDate ? <p>תאריך יעד חלופי בקצב מתון יותר: {format(altDate, 'dd/MM/yyyy')}.</p> : null}
        </div>
      ) : null}
      <Link to={weightGoalDeepLink(competition)} className="text-sm font-medium text-teal-600 dark:text-teal-300">
        מעבר להגדרת יעד משקל בתזונה
      </Link>
    </Card>
  );
}

function IcsExportCard({ competition }: { competition: JudoCompetition }) {
  const [weekBefore, setWeekBefore] = useState(true);
  const [dayBefore, setDayBefore] = useState(true);

  const exportIcs = () => {
    const reminders = [weekBefore ? 7 : null, dayBefore ? 1 : null].filter((days): days is number => days !== null);
    const ics = buildCompetitionIcs(competition, reminders);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${competition.name}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">הוספה ליומן</h2>
      <div className="flex flex-col gap-1 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={weekBefore} onChange={(event) => setWeekBefore(event.target.checked)} />
          תזכורת שבוע לפני
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={dayBefore} onChange={(event) => setDayBefore(event.target.checked)} />
          תזכורת יום לפני
        </label>
      </div>
      <Button onClick={exportIcs} className="self-start">
        הוסף ליומן
      </Button>
    </Card>
  );
}

export function CompetitionDetailScreen() {
  const { competitionId } = useParams<{ competitionId: string }>();
  const competition = useCompetition(competitionId);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (competition === undefined) return null;
  if (competition === null) {
    return (
      <div className="safe-x flex flex-col gap-4 p-4 pb-8">
        <EmptyState title="התחרות לא נמצאה" />
      </div>
    );
  }

  const save = async (values: CompetitionFormState) => {
    const patch = formToCompetitionPatch(values);
    if (!patch) return;
    await db.judoCompetitions.update(competition.id, { ...patch, updatedAt: new Date().toISOString() });
    await syncCompetitionAchievement(db, competition.id);
    setEditing(false);
  };

  const remove = async () => {
    const linkedAchievement = await db.achievements
      .where('competitionId')
      .equals(competition.id)
      .filter((achievement) => achievement.autoGenerated)
      .first();
    if (linkedAchievement) await db.achievements.delete(linkedAchievement.id);
    await db.judoCompetitions.delete(competition.id);
    setDeleting(false);
    navigate('/judo');
  };

  const isUpcoming = competition.status === 'planned' && countdownTarget(competition).getTime() >= Date.now();

  return (
    <div className="safe-x flex flex-col gap-4 p-4 pb-8">
      <Link to="/judo" className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
        <ArrowRight size={16} /> חזרה ללוח התחרויות
      </Link>

      {editing ? (
        <Card>
          <CompetitionForm initial={competitionToForm(competition)} onCancel={() => setEditing(false)} onSave={save} />
        </Card>
      ) : (
        <>
          <header className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold">{competition.name}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {format(new Date(competition.startsAt), 'dd/MM/yyyy HH:mm')} · {STATUS_LABELS[competition.status]}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditing(true)}>
                עריכה
              </Button>
              <Button variant="ghost" className="text-red-500" onClick={() => setDeleting(true)}>
                מחיקה
              </Button>
            </div>
          </header>

          <Card className="flex flex-col gap-2 text-sm">
            {competition.location ? <p>מקום: {competition.location}</p> : null}
            {competition.address ? <p>כתובת: {competition.address}</p> : null}
            {competition.weighInAt ? <p>שקילה: {format(new Date(competition.weighInAt), 'dd/MM/yyyy HH:mm')}</p> : null}
            <p>קטגוריית משקל: {competition.weightClassKg} ק״ג</p>
            {competition.targetWeighInKg ? <p>יעד שקילה אישי: {competition.targetWeighInKg} ק״ג</p> : null}
            {competition.notes ? <p>הערות: {competition.notes}</p> : null}
          </Card>

          {competition.status === 'completed' ? (
            <Card className="flex flex-col gap-2 text-sm">
              <h2 className="text-lg font-semibold">תוצאות</h2>
              {competition.finalPlace ? <p>דירוג סופי: {competition.finalPlace}</p> : null}
              {competition.medal && competition.medal !== 'none' ? <p>מדליה: {MEDAL_LABELS[competition.medal]}</p> : null}
              <p>
                ניצחונות / הפסדים: {competition.wins ?? 0} / {competition.losses ?? 0}
              </p>
            </Card>
          ) : null}

          {isUpcoming ? <WeighInModeCard competition={competition} /> : null}

          <IcsExportCard competition={competition} />
        </>
      )}

      <ConfirmDialog
        open={deleting}
        title="מחיקת תחרות"
        description="לא ניתן לשחזר תחרות שנמחקה."
        confirmLabel="מחיקה"
        onConfirm={remove}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
}
