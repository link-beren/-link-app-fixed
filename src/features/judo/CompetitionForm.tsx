import { useState } from 'react';
import { Button } from '@/components/Button';
import { formToCompetitionPatch, type CompetitionFormState } from '@/features/judo/competition-form-state';

export function CompetitionForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: CompetitionFormState;
  onCancel: () => void;
  onSave: (values: CompetitionFormState) => Promise<void>;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof CompetitionFormState>(key: K, value: CompetitionFormState[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!formToCompetitionPatch(values)) {
      setError('נא למלא שם, תאריך התחלה וקטגוריית משקל חיובית');
      return;
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
        שם התחרות
        <input className="input" value={values.name} onChange={(event) => set('name', event.target.value)} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          תאריך התחלה
          <input type="date" className="input" value={values.startsAtDate} onChange={(event) => set('startsAtDate', event.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          שעת התחלה
          <input type="time" className="input" value={values.startsAtTime} onChange={(event) => set('startsAtTime', event.target.value)} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          תאריך שקילה (אם שונה)
          <input type="date" className="input" value={values.weighInAtDate} onChange={(event) => set('weighInAtDate', event.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          שעת שקילה
          <input type="time" className="input" value={values.weighInAtTime} onChange={(event) => set('weighInAtTime', event.target.value)} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          מקום
          <input className="input" value={values.location} onChange={(event) => set('location', event.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          כתובת (אופציונלי)
          <input className="input" value={values.address} onChange={(event) => set('address', event.target.value)} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          קטגוריית משקל (ק״ג)
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            className="input"
            value={values.weightClassKg}
            onChange={(event) => set('weightClassKg', event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          יעד שקילה אישי (ק״ג)
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            className="input"
            value={values.targetWeighInKg}
            onChange={(event) => set('targetWeighInKg', event.target.value)}
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-1 text-sm">
        <legend>סטטוס</legend>
        <div className="flex gap-4">
          {(
            [
              ['planned', 'מתוכננת'],
              ['completed', 'הושלמה'],
              ['cancelled', 'בוטלה'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="radio"
                checked={values.status === value}
                onChange={() => set('status', value)}
              />{' '}
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {values.status === 'completed' ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              דירוג סופי
              <input
                type="number"
                inputMode="numeric"
                className="input"
                value={values.finalPlace}
                onChange={(event) => set('finalPlace', event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              מדליה
              <select className="input" value={values.medal} onChange={(event) => set('medal', event.target.value as CompetitionFormState['medal'])}>
                <option value="">—</option>
                <option value="gold">זהב</option>
                <option value="silver">כסף</option>
                <option value="bronze">ארד</option>
                <option value="none">ללא מדליה</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              ניצחונות
              <input
                type="number"
                inputMode="numeric"
                className="input"
                value={values.wins}
                onChange={(event) => set('wins', event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              הפסדים
              <input
                type="number"
                inputMode="numeric"
                className="input"
                value={values.losses}
                onChange={(event) => set('losses', event.target.value)}
              />
            </label>
          </div>
        </>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        הערות
        <textarea className="input" value={values.notes} onChange={(event) => set('notes', event.target.value)} />
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
