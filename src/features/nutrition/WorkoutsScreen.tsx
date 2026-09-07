import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { db } from '@/db/database';
import { Button } from '@/components/Button';
import { Card, CardStat, EmptyState } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DEFAULT_MET_BY_INTENSITY, effectiveDailyNetExerciseKcal, netExerciseKcal } from '@/lib/calculations/workout-plan';
import { useWeeklyWorkoutTemplates, useWorkoutLogs } from '@/features/nutrition/useWorkouts';
import { useProfile } from '@/features/settings/useProfile';
import type { Intensity, SportType, WeeklyWorkoutTemplate } from '@/types';

const WEEKDAY_LABELS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const SPORT_TYPE_LABELS: Record<SportType, string> = {
  judo: 'ג׳ודו',
  crossfit: 'קרוספיט',
  strength: 'כוח',
  run: 'ריצה',
  walk: 'הליכה',
  other: 'אחר',
};
const INTENSITY_LABELS: Record<Intensity, string> = { low: 'נמוכה', moderate: 'בינונית', high: 'גבוהה' };

interface TemplateFormState {
  weekday: number;
  sportType: SportType;
  title: string;
  durationMinutes: string;
  intensity: Intensity;
  metValue: string;
  plannedStartTime: string;
  active: boolean;
}

function emptyTemplateForm(): TemplateFormState {
  return {
    weekday: new Date().getDay(),
    sportType: 'crossfit',
    title: '',
    durationMinutes: '60',
    intensity: 'moderate',
    metValue: String(DEFAULT_MET_BY_INTENSITY.moderate),
    plannedStartTime: '',
    active: true,
  };
}

function templateToForm(template: WeeklyWorkoutTemplate): TemplateFormState {
  return {
    weekday: template.weekday,
    sportType: template.sportType,
    title: template.title,
    durationMinutes: String(template.durationMinutes),
    intensity: template.intensity,
    metValue: String(template.metValue),
    plannedStartTime: template.plannedStartTime ?? '',
    active: template.active,
  };
}

function TemplateForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: TemplateFormState;
  onCancel: () => void;
  onSave: (values: TemplateFormState) => Promise<void>;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState('');

  const set = <K extends keyof TemplateFormState>(key: K, value: TemplateFormState[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const duration = Number(values.durationMinutes);
    const met = Number(values.metValue);
    if (!values.title.trim() || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(met) || met < 0) {
      setError('נא למלא כותרת, משך חיובי וערך MET תקין');
      return;
    }
    setError('');
    await onSave(values);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          יום בשבוע
          <select className="input" value={values.weekday} onChange={(event) => set('weekday', Number(event.target.value))}>
            {WEEKDAY_LABELS.map((label, index) => (
              <option key={label} value={index}>
                יום {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          סוג פעילות
          <select
            className="input"
            value={values.sportType}
            onChange={(event) => set('sportType', event.target.value as SportType)}
          >
            {(Object.entries(SPORT_TYPE_LABELS) as Array<[SportType, string]>).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        כותרת
        <input className="input" value={values.title} onChange={(event) => set('title', event.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          משך (דקות)
          <input
            type="number"
            inputMode="numeric"
            className="input"
            value={values.durationMinutes}
            onChange={(event) => set('durationMinutes', event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          שעה מתוכננת (אופציונלי)
          <input
            type="time"
            className="input"
            value={values.plannedStartTime}
            onChange={(event) => set('plannedStartTime', event.target.value)}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          עצימות
          <select
            className="input"
            value={values.intensity}
            onChange={(event) => {
              const intensity = event.target.value as Intensity;
              set('intensity', intensity);
              set('metValue', String(DEFAULT_MET_BY_INTENSITY[intensity]));
            }}
          >
            {(Object.entries(INTENSITY_LABELS) as Array<[Intensity, string]>).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          ערך MET
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            className="input"
            value={values.metValue}
            onChange={(event) => set('metValue', event.target.value)}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.active} onChange={(event) => set('active', event.target.checked)} />
        פעיל
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

function LogWorkoutForm({
  defaultTemplate,
  weightKg,
  onDone,
}: {
  defaultTemplate: WeeklyWorkoutTemplate | null;
  weightKg: number;
  onDone: () => void;
}) {
  const [templateId] = useState(defaultTemplate?.id);
  const [sportType, setSportType] = useState<SportType>(defaultTemplate?.sportType ?? 'crossfit');
  const [title, setTitle] = useState(defaultTemplate?.title ?? '');
  const [durationMinutes, setDurationMinutes] = useState(String(defaultTemplate?.durationMinutes ?? 60));
  const [intensity, setIntensity] = useState<Intensity>(defaultTemplate?.intensity ?? 'moderate');
  const [metValue, setMetValue] = useState(String(defaultTemplate?.metValue ?? DEFAULT_MET_BY_INTENSITY.moderate));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    const duration = Number(durationMinutes);
    const met = Number(metValue);
    if (!title.trim() || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(met) || met < 0) {
      setError('נא למלא כותרת, משך חיובי וערך MET תקין');
      return;
    }
    setError('');
    const estimatedNetKcal = netExerciseKcal(met, weightKg, duration);
    await db.workoutLogs.add({
      id: crypto.randomUUID(),
      templateId,
      performedAt: new Date().toISOString(),
      sportType,
      title,
      durationMinutes: duration,
      intensity,
      metValue: met,
      estimatedNetKcal,
      note: note || undefined,
    });
    onDone();
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        כותרת
        <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          סוג פעילות
          <select className="input" value={sportType} onChange={(event) => setSportType(event.target.value as SportType)}>
            {(Object.entries(SPORT_TYPE_LABELS) as Array<[SportType, string]>).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          משך (דקות)
          <input
            type="number"
            inputMode="numeric"
            className="input"
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          עצימות
          <select
            className="input"
            value={intensity}
            onChange={(event) => {
              const value = event.target.value as Intensity;
              setIntensity(value);
              setMetValue(String(DEFAULT_MET_BY_INTENSITY[value]));
            }}
          >
            {(Object.entries(INTENSITY_LABELS) as Array<[Intensity, string]>).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          ערך MET
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            className="input"
            value={metValue}
            onChange={(event) => setMetValue(event.target.value)}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        הערה (אופציונלי)
        <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        הוצאת האימון הנטו היא הערכה בלבד ולא מדידה ישירה.
      </p>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <div className="flex gap-2">
        <Button onClick={submit}>שמירת אימון</Button>
        <Button variant="secondary" onClick={onDone}>
          ביטול
        </Button>
      </div>
    </div>
  );
}

export function WorkoutsScreen() {
  const templates = useWeeklyWorkoutTemplates();
  const logs = useWorkoutLogs();
  const profile = useProfile();

  const [addingTemplate, setAddingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [loggingTemplate, setLoggingTemplate] = useState<WeeklyWorkoutTemplate | null | undefined>(undefined);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const todaysWeekday = now.getDay();

  const todaysEffectiveKcal = useMemo(() => {
    if (!templates || !logs || !profile) return null;
    return effectiveDailyNetExerciseKcal(now, templates, logs, profile.currentWeightKg, now);
  }, [templates, logs, profile, now]);

  const todaysLoggedIds = useMemo(
    () =>
      new Set(
        (logs ?? [])
          .filter((log) => isSameDate(log.performedAt, now))
          .map((log) => log.templateId)
          .filter((id): id is string => id != null),
      ),
    [logs, now],
  );

  const saveTemplate = async (values: TemplateFormState, existingId?: string) => {
    const patch: Omit<WeeklyWorkoutTemplate, 'id'> = {
      weekday: values.weekday,
      sportType: values.sportType,
      title: values.title,
      durationMinutes: Number(values.durationMinutes),
      intensity: values.intensity,
      metValue: Number(values.metValue),
      plannedStartTime: values.plannedStartTime || undefined,
      active: values.active,
    };
    if (existingId) {
      await db.weeklyWorkoutTemplates.update(existingId, patch);
      setEditingTemplateId(null);
    } else {
      await db.weeklyWorkoutTemplates.add({ id: crypto.randomUUID(), ...patch });
      setAddingTemplate(false);
    }
  };

  const removeTemplate = async () => {
    if (!deletingTemplateId) return;
    await db.weeklyWorkoutTemplates.delete(deletingTemplateId);
    setDeletingTemplateId(null);
  };

  const removeLog = async () => {
    if (!deletingLogId) return;
    await db.workoutLogs.delete(deletingLogId);
    setDeletingLogId(null);
  };

  if (templates === undefined || logs === undefined || profile === undefined) return null;

  const recentLogs = [...logs].slice(0, 10);
  const todaysTemplates = templates.filter((template) => template.active && template.weekday === todaysWeekday);

  return (
    <div className="safe-x flex flex-col gap-4 p-4 pb-8">
      <Link to="/nutrition" className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
        <ArrowRight size={16} /> חזרה לתזונה
      </Link>
      <h1 className="text-2xl font-bold">אימונים</h1>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">היום</h2>
        <CardStat
          label="הוצאת אימון נטו משוערת היום"
          value={todaysEffectiveKcal !== null ? `${Math.round(todaysEffectiveKcal)} קק״ל` : '—'}
          sub="הערכה בלבד, לא מדידה ישירה"
        />
        {todaysTemplates.length > 0 ? (
          <ul className="flex flex-col gap-2 text-sm">
            {todaysTemplates.map((template) => {
              const logged = todaysLoggedIds.has(template.id);
              return (
                <li key={template.id} className="flex items-center justify-between gap-2">
                  <span>
                    {template.title} · {SPORT_TYPE_LABELS[template.sportType]} · {template.durationMinutes} דק׳
                    {template.plannedStartTime ? ` · ${template.plannedStartTime}` : ''}
                  </span>
                  {logged ? (
                    <span className="text-xs font-medium text-teal-600 dark:text-teal-300">הושלם</span>
                  ) : (
                    <Button variant="secondary" onClick={() => setLoggingTemplate(template)}>
                      סימון כהושלם
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">אין אימון מתוכנן להיום.</p>
        )}
        <Button variant="secondary" className="self-start" onClick={() => setLoggingTemplate(null)}>
          + אימון בפועל שלא היה מתוכנן
        </Button>
      </Card>

      {loggingTemplate !== undefined ? (
        <Card>
          <LogWorkoutForm
            defaultTemplate={loggingTemplate}
            weightKg={profile.currentWeightKg}
            onDone={() => setLoggingTemplate(undefined)}
          />
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">לוח שבועי קבוע</h2>
          {!addingTemplate ? (
            <Button variant="secondary" onClick={() => setAddingTemplate(true)}>
              + אימון שבועי
            </Button>
          ) : null}
        </div>

        {addingTemplate ? (
          <TemplateForm initial={emptyTemplateForm()} onCancel={() => setAddingTemplate(false)} onSave={(values) => saveTemplate(values)} />
        ) : null}

        {templates.length === 0 ? (
          <EmptyState title="אין עדיין אימונים בלוח השבועי" />
        ) : (
          <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
            {templates.map((template) =>
              editingTemplateId === template.id ? (
                <li key={template.id} className="py-3">
                  <TemplateForm
                    initial={templateToForm(template)}
                    onCancel={() => setEditingTemplateId(null)}
                    onSave={(values) => saveTemplate(values, template.id)}
                  />
                </li>
              ) : (
                <li key={template.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div>
                    <p className="font-medium">
                      יום {WEEKDAY_LABELS[template.weekday]} · {template.title}
                      {!template.active ? ' (לא פעיל)' : ''}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {SPORT_TYPE_LABELS[template.sportType]} · {template.durationMinutes} דק׳ · עצימות{' '}
                      {INTENSITY_LABELS[template.intensity]} (MET {template.metValue})
                      {template.plannedStartTime ? ` · ${template.plannedStartTime}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-teal-600 dark:text-teal-300"
                      onClick={() => setEditingTemplateId(template.id)}
                    >
                      עריכה
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-red-500"
                      onClick={() => setDeletingTemplateId(template.id)}
                    >
                      מחיקה
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">היסטוריית אימונים</h2>
        {recentLogs.length === 0 ? (
          <EmptyState title="אין עדיין אימונים בפועל" />
        ) : (
          <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
            {recentLogs.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {log.title} · {format(new Date(log.performedAt), 'dd/MM/yyyy HH:mm')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {log.durationMinutes} דק׳ · {Math.round(log.estimatedNetKcal)} קק״ל נטו (הערכה)
                  </p>
                </div>
                <button type="button" className="text-xs font-medium text-red-500" onClick={() => setDeletingLogId(log.id)}>
                  מחיקה
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={deletingTemplateId !== null}
        title="מחיקת אימון שבועי"
        description="לא ניתן לשחזר לאחר מחיקה."
        confirmLabel="מחיקה"
        onConfirm={removeTemplate}
        onCancel={() => setDeletingTemplateId(null)}
      />
      <ConfirmDialog
        open={deletingLogId !== null}
        title="מחיקת אימון בפועל"
        description="לא ניתן לשחזר לאחר מחיקה."
        confirmLabel="מחיקה"
        onConfirm={removeLog}
        onCancel={() => setDeletingLogId(null)}
      />
    </div>
  );
}

function isSameDate(isoDate: string, day: Date): boolean {
  const date = new Date(isoDate);
  return (
    date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate()
  );
}
