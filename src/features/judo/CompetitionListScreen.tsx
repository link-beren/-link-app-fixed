import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { db } from '@/db/database';
import { Button } from '@/components/Button';
import { Card, CardStat, EmptyState } from '@/components/Card';
import { computeJudoStats, countdownTarget, MEDAL_LABELS, selectUpcomingCompetition } from '@/lib/calculations/judo-stats';
import { syncCompetitionAchievement } from '@/lib/judo-achievements';
import { CompetitionForm } from '@/features/judo/CompetitionForm';
import { emptyCompetitionForm, formToCompetitionPatch, type CompetitionFormState } from '@/features/judo/competition-form-state';
import { useCompetitions } from '@/features/judo/useCompetitions';
import type { JudoCompetition } from '@/types';

const STATUS_LABELS: Record<JudoCompetition['status'], string> = {
  planned: 'מתוכננת',
  completed: 'הושלמה',
  cancelled: 'בוטלה',
};

const WEEKDAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

function CountdownCard({ competition }: { competition: JudoCompetition }) {
  const target = countdownTarget(competition);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diffMs = Math.max(0, target.getTime() - now);
  const totalSeconds = Math.floor(diffMs / 1000);
  const units: Array<[number, string]> = [
    [Math.floor(totalSeconds / 86400), 'ימים'],
    [Math.floor((totalSeconds % 86400) / 3600), 'שעות'],
    [Math.floor((totalSeconds % 3600) / 60), 'דקות'],
    [totalSeconds % 60, 'שניות'],
  ];

  return (
    <Card className="flex flex-col gap-2">
      <span className="text-sm text-slate-500 dark:text-slate-400">התחרות הקרובה: {competition.name}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {competition.weighInAt ? 'ספירה לאחור לשקילה' : 'ספירה לאחור לתחילת התחרות'}
      </span>
      <div className="flex gap-3" aria-live="polite">
        {units.map(([value, unitLabel]) => (
          <div key={unitLabel} className="flex flex-col items-center">
            <span className="text-2xl font-bold tabular-nums">{value}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{unitLabel}</span>
          </div>
        ))}
      </div>
      <Link to={competition.id} className="text-sm font-medium text-teal-600 dark:text-teal-300">
        פרטי התחרות
      </Link>
    </Card>
  );
}

function StatsCard({ competitions }: { competitions: JudoCompetition[] }) {
  const stats = computeJudoStats(competitions);
  return (
    <Card className="grid grid-cols-2 gap-4">
      <CardStat label="תחרויות שהושלמו" value={String(stats.completedCount)} />
      <CardStat label="ניצחונות / הפסדים" value={`${stats.wins} / ${stats.losses}`} />
      <CardStat label="מדליות זהב" value={String(stats.medals.gold)} />
      <CardStat label="מדליות כסף / ארד" value={`${stats.medals.silver} / ${stats.medals.bronze}`} />
    </Card>
  );
}

function CalendarView({ competitions }: { competitions: JudoCompetition[] }) {
  const [monthStart, setMonthStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, JudoCompetition[]>();
    for (const competition of competitions) {
      const key = new Date(competition.startsAt).toDateString();
      const list = map.get(key) ?? [];
      list.push(competition);
      map.set(key, list);
    }
    return map;
  }, [competitions]);

  const firstWeekday = monthStart.getDay();
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(monthStart.getFullYear(), monthStart.getMonth(), index + 1)),
  ];
  const selectedCompetitions = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1))}
        >
          חודש קודם
        </Button>
        <span className="font-semibold">{monthStart.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</span>
        <Button
          variant="ghost"
          onClick={() => setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1))}
        >
          חודש הבא
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 dark:text-slate-400">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} />;
          const key = date.toDateString();
          const hasCompetition = byDay.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDay(key)}
              aria-pressed={selectedDay === key}
              className={`flex min-h-11 flex-col items-center justify-center rounded-lg text-sm ${
                selectedDay === key ? 'bg-teal-500 text-slate-950' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{date.getDate()}</span>
              {hasCompetition ? <span className="h-1 w-1 rounded-full bg-current" /> : null}
            </button>
          );
        })}
      </div>
      {selectedDay ? (
        selectedCompetitions.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {selectedCompetitions.map((competition) => (
              <li key={competition.id}>
                <Link to={competition.id} className="text-sm font-medium text-teal-600 dark:text-teal-300">
                  {competition.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">אין תחרויות ביום זה.</p>
        )
      ) : null}
    </Card>
  );
}

export function CompetitionListScreen() {
  const competitions = useCompetitions();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [adding, setAdding] = useState(false);

  if (competitions === undefined) return null;

  const upcoming = selectUpcomingCompetition(competitions, new Date());

  const createCompetition = async (values: CompetitionFormState) => {
    const patch = formToCompetitionPatch(values);
    if (!patch) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.judoCompetitions.add({ id, ...patch, createdAt: now, updatedAt: now });
    await syncCompetitionAchievement(db, id);
    setAdding(false);
  };

  return (
    <div className="safe-x flex flex-col gap-4 p-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ג׳ודו</h1>
        <Link to="achievements" className="text-sm font-medium text-teal-600 dark:text-teal-300">
          הישגים
        </Link>
      </div>

      {upcoming ? <CountdownCard competition={upcoming} /> : null}

      <StatsCard competitions={competitions} />

      <div className="flex gap-2" role="radiogroup" aria-label="תצוגה">
        <Button variant={view === 'list' ? 'primary' : 'secondary'} onClick={() => setView('list')} className="flex-1">
          רשימה
        </Button>
        <Button variant={view === 'calendar' ? 'primary' : 'secondary'} onClick={() => setView('calendar')} className="flex-1">
          לוח חודשי
        </Button>
      </div>

      {view === 'calendar' ? (
        <CalendarView competitions={competitions} />
      ) : competitions.length === 0 ? (
        <EmptyState title="אין עדיין תחרויות" description="הוסיפו תחרות ראשונה למטה." />
      ) : (
        <Card>
          <ul>
            {competitions.map((competition) => (
              <li key={competition.id} className="border-b border-slate-200 py-2 last:border-b-0 dark:border-slate-800">
                <Link to={competition.id} className="flex flex-col py-1">
                  <span className="font-medium">{competition.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {format(new Date(competition.startsAt), 'dd/MM/yyyy')} · {STATUS_LABELS[competition.status]}
                    {competition.medal && competition.medal !== 'none' ? ` · מדליית ${MEDAL_LABELS[competition.medal]}` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        {adding ? (
          <CompetitionForm initial={emptyCompetitionForm()} onCancel={() => setAdding(false)} onSave={createCompetition} />
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)} className="w-full">
            + תחרות חדשה
          </Button>
        )}
      </Card>
    </div>
  );
}
