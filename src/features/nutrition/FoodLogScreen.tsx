import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { db } from '@/db/database';
import { Button } from '@/components/Button';
import { Card, CardStat, EmptyState } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { parseFoodTextWithLookup } from '@/features/nutrition/food-lookup';
import { useAllFoodLogItems, useMealLogs, useSavedMeals } from '@/features/nutrition/useFoodLog';
import { useNutritionSummary } from '@/features/nutrition/useNutritionSummary';
import type { ParsedFoodEntry } from '@/lib/food-parser';
import type { WeeklyStatus } from '@/lib/calculations/nutrition-summary';
import type { Confidence, FoodLogItem } from '@/types';

const CONFIDENCE_LABELS: Record<Confidence, string> = { high: 'גבוהה', medium: 'בינונית', low: 'נמוכה' };
const SOURCE_LABELS: Record<string, string> = {
  local: 'מאגר מקומי',
  usda: 'USDA',
  'open-food-facts': 'Open Food Facts',
  custom: 'מאכל אישי',
  manual: 'הזנה ידנית',
};
const WEEKLY_STATUS_LABELS: Record<WeeklyStatus, string> = {
  'on-track': 'על הקצב',
  'slightly-behind': 'מעט מאחור',
  'far-from-target': 'רחוק מהיעד',
  'not-enough-data': 'אין עדיין מספיק נתונים',
};

interface ReviewRow {
  key: string;
  displayName: string;
  foodReferenceId?: string;
  amount: number;
  unit: string;
  estimatedGrams: string;
  kcal: string;
  proteinGrams: string;
  confidence: Confidence;
  assumption?: string;
  conservativeMultiplier: number;
  source: string;
  userEdited: boolean;
}

function entryToRow(entry: ParsedFoodEntry): ReviewRow {
  const { segment, matchedFood, estimate } = entry;
  if (matchedFood && estimate) {
    return {
      key: crypto.randomUUID(),
      displayName: matchedFood.canonicalNameHe,
      foodReferenceId: matchedFood.id,
      amount: segment.quantity,
      unit: segment.unit ?? 'מנה',
      estimatedGrams: String(Math.round(estimate.estimatedGrams)),
      kcal: String(Math.round(estimate.kcal)),
      proteinGrams: String(Math.round(estimate.proteinGrams * 10) / 10),
      confidence: estimate.confidence,
      assumption: estimate.assumption,
      conservativeMultiplier: estimate.conservativeMultiplier,
      source: matchedFood.source,
      userEdited: false,
    };
  }
  return {
    key: crypto.randomUUID(),
    displayName: segment.nameText,
    amount: segment.quantity,
    unit: segment.unit ?? 'מנה',
    estimatedGrams: '',
    kcal: '',
    proteinGrams: '',
    confidence: 'low',
    assumption: 'לא נמצאה התאמה במאגר או במקורות המקוונים — נא להזין ערכים ידנית.',
    conservativeMultiplier: 1,
    source: 'manual',
    userEdited: true,
  };
}

function totalsFor(items: Pick<FoodLogItem, 'kcal' | 'proteinGrams'>[]): { kcal: number; proteinGrams: number } {
  return items.reduce(
    (sum, item) => ({ kcal: sum.kcal + item.kcal, proteinGrams: sum.proteinGrams + item.proteinGrams }),
    { kcal: 0, proteinGrams: 0 },
  );
}

function EntryForm({ onSaved }: { onSaved: () => void }) {
  const [rawText, setRawText] = useState('');
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [markDayComplete, setMarkDayComplete] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');

  const parse = async () => {
    if (!rawText.trim()) {
      setError('נא להזין טקסט חופשי לפני הפירוק');
      return;
    }
    setError('');
    setIsParsing(true);
    const entries = await parseFoodTextWithLookup(rawText);
    setRows(entries.map(entryToRow));
    setIsParsing(false);
  };

  const [savedPersonalFoodKeys, setSavedPersonalFoodKeys] = useState<Set<string>>(new Set());

  const updateRow = (key: string, patch: Partial<ReviewRow>) => {
    setRows((prev) => prev?.map((row) => (row.key === key ? { ...row, ...patch, userEdited: true } : row)) ?? null);
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev?.filter((row) => row.key !== key) ?? null);
  };

  // Spec 11.8: saving an estimated item as a personal food makes it take
  // precedence over internet results — it needs no special priority logic,
  // since resolveFoodReference already checks the local foodReferences table
  // (which this writes into) before ever calling USDA/Open Food Facts.
  const savePersonalFood = async (row: ReviewRow) => {
    const grams = Number(row.estimatedGrams);
    const kcal = Number(row.kcal);
    const proteinGrams = Number(row.proteinGrams);
    if (!Number.isFinite(grams) || grams <= 0 || !Number.isFinite(kcal) || !Number.isFinite(proteinGrams)) return;
    await db.foodReferences.add({
      id: crypto.randomUUID(),
      canonicalNameHe: row.displayName,
      canonicalNameEn: row.displayName,
      aliases: [row.displayName],
      kcalPer100g: (kcal / grams) * 100,
      proteinPer100g: (proteinGrams / grams) * 100,
      servingOptions: [{ label: 'מנה', grams }],
      source: 'custom',
      cachedAt: new Date().toISOString(),
    });
    setSavedPersonalFoodKeys((prev) => new Set(prev).add(row.key));
  };

  const reset = () => {
    setRawText('');
    setRows(null);
    setMarkDayComplete(false);
    setError('');
  };

  const save = async () => {
    if (!rows || rows.length === 0) return;
    const parsedRows = rows.map((row) => ({
      row,
      estimatedGrams: Number(row.estimatedGrams),
      kcal: Number(row.kcal),
      proteinGrams: Number(row.proteinGrams),
    }));
    const invalid = parsedRows.some(
      ({ estimatedGrams, kcal, proteinGrams }) =>
        !Number.isFinite(estimatedGrams) || estimatedGrams < 0 || !Number.isFinite(kcal) || kcal < 0 || !Number.isFinite(proteinGrams) || proteinGrams < 0,
    );
    if (invalid) {
      setError('נא למלא משקל, קלוריות וחלבון תקינים (מספרים אי-שליליים) בכל הפריטים');
      return;
    }
    setError('');

    const now = new Date().toISOString();
    const mealId = crypto.randomUUID();
    await db.transaction('rw', db.mealLogs, db.foodLogItems, async () => {
      await db.mealLogs.add({
        id: mealId,
        eatenAt: now,
        originalText: rawText,
        dayCompleteAfterThisMeal: markDayComplete || undefined,
        createdAt: now,
        updatedAt: now,
      });
      for (const { row, estimatedGrams, kcal, proteinGrams } of parsedRows) {
        await db.foodLogItems.add({
          id: crypto.randomUUID(),
          mealId,
          foodReferenceId: row.foodReferenceId,
          displayName: row.displayName,
          amount: row.amount,
          unit: row.unit,
          estimatedGrams,
          kcal,
          proteinGrams,
          confidence: row.confidence,
          assumption: row.assumption,
          conservativeMultiplier: row.conservativeMultiplier,
          source: row.source,
          userEdited: row.userEdited,
        });
      }
    });

    reset();
    onSaved();
  };

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">רישום ארוחה</h2>
      <label className="flex flex-col gap-1 text-sm">
        מה אכלת? (טקסט חופשי)
        <textarea
          className="input min-h-20"
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="לדוגמה: 2 קבבים, 300 גרם אורז וכוס פיוז טי"
        />
      </label>
      {rows === null ? (
        <Button className="self-start" onClick={parse} disabled={isParsing}>
          {isParsing ? 'מפרק לפריטים...' : 'פרק לפריטים'}
        </Button>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">לא זוהו פריטים בטקסט.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((row) => (
                <li key={row.key} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      className="input flex-1"
                      value={row.displayName}
                      onChange={(event) => updateRow(row.key, { displayName: event.target.value })}
                    />
                    <button type="button" className="text-xs font-medium text-red-500" onClick={() => removeRow(row.key)}>
                      הסרה
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1 text-xs">
                      גרם
                      <input
                        type="number"
                        inputMode="decimal"
                        className="input"
                        value={row.estimatedGrams}
                        onChange={(event) => updateRow(row.key, { estimatedGrams: event.target.value })}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      קק״ל
                      <input
                        type="number"
                        inputMode="decimal"
                        className="input"
                        value={row.kcal}
                        onChange={(event) => updateRow(row.key, { kcal: event.target.value })}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      חלבון (גרם)
                      <input
                        type="number"
                        inputMode="decimal"
                        className="input"
                        value={row.proteinGrams}
                        onChange={(event) => updateRow(row.key, { proteinGrams: event.target.value })}
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      ביטחון: {CONFIDENCE_LABELS[row.confidence]} · מקור: {SOURCE_LABELS[row.source] ?? row.source}
                      {row.assumption ? ` · ${row.assumption}` : ''}
                    </p>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-medium text-teal-600 disabled:opacity-50 dark:text-teal-300"
                      disabled={savedPersonalFoodKeys.has(row.key)}
                      onClick={() => savePersonalFood(row)}
                    >
                      {savedPersonalFoodKeys.has(row.key) ? 'נשמר כמאכל אישי' : 'שמירה כמאכל אישי'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={markDayComplete} onChange={(event) => setMarkDayComplete(event.target.checked)} />
            סיימתי להזין להיום
          </label>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <div className="flex gap-2">
            <Button onClick={save} disabled={rows.length === 0}>
              שמירת ארוחה
            </Button>
            <Button variant="secondary" onClick={reset}>
              ביטול
            </Button>
          </div>
        </div>
      )}
      {error && rows === null ? <p className="text-sm text-red-500">{error}</p> : null}
    </Card>
  );
}

function SavedMealsSection() {
  const savedMeals = useSavedMeals();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [addingId, setAddingId] = useState<string | null>(null);
  const [multiplier, setMultiplier] = useState('1');

  // Spec 11.8: quick-add lets the quantity be scaled before saving.
  const confirmQuickAdd = async (mealId: string) => {
    const meal = savedMeals?.find((saved) => saved.id === mealId);
    if (!meal) return;
    const factor = Number(multiplier);
    if (!Number.isFinite(factor) || factor <= 0) return;
    const now = new Date().toISOString();
    const newMealId = crypto.randomUUID();
    await db.transaction('rw', db.mealLogs, db.foodLogItems, async () => {
      await db.mealLogs.add({
        id: newMealId,
        eatenAt: now,
        originalText: `הוספה מהירה: ${meal.name}${factor !== 1 ? ` (כמות × ${factor})` : ''}`,
        createdAt: now,
        updatedAt: now,
      });
      for (const item of meal.items) {
        await db.foodLogItems.add({
          id: crypto.randomUUID(),
          mealId: newMealId,
          foodReferenceId: item.foodReferenceId,
          displayName: item.displayName,
          amount: item.estimatedGrams * factor,
          unit: 'גרם',
          estimatedGrams: item.estimatedGrams * factor,
          kcal: item.kcal * factor,
          proteinGrams: item.proteinGrams * factor,
          confidence: 'high',
          conservativeMultiplier: 1,
          source: 'custom',
          userEdited: factor !== 1,
        });
      }
    });
    setAddingId(null);
    setMultiplier('1');
  };

  const remove = async () => {
    if (!deletingId) return;
    await db.savedMeals.delete(deletingId);
    setDeletingId(null);
  };

  if (savedMeals === undefined) return null;

  return (
    <Card className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">ארוחות שמורות</h2>
      {savedMeals.length === 0 ? (
        <EmptyState title="אין עדיין ארוחות שמורות" description="שמרו ארוחה מההיסטוריה כדי להוסיף אותה במהירות בפעם הבאה." />
      ) : (
        <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
          {savedMeals.map((meal) => {
            const totals = totalsFor(meal.items);
            return (
              <li key={meal.id} className="flex flex-col gap-2 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{meal.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {Math.round(totals.kcal)} קק״ל · {Math.round(totals.proteinGrams * 10) / 10} גרם חלבון
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setAddingId(meal.id)}>
                      הוספה מהירה
                    </Button>
                    <button type="button" className="text-xs font-medium text-red-500" onClick={() => setDeletingId(meal.id)}>
                      מחיקה
                    </button>
                  </div>
                </div>
                {addingId === meal.id ? (
                  <div className="flex items-center gap-2">
                    <label className="flex flex-1 flex-col gap-1 text-xs">
                      כמות (מכפיל)
                      <input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        className="input"
                        value={multiplier}
                        onChange={(event) => setMultiplier(event.target.value)}
                      />
                    </label>
                    <Button onClick={() => confirmQuickAdd(meal.id)}>אישור</Button>
                    <Button variant="secondary" onClick={() => setAddingId(null)}>
                      ביטול
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={deletingId !== null}
        title="מחיקת ארוחה שמורה"
        description="לא ניתן לשחזר לאחר מחיקה. ארוחות שכבר נרשמו לא ישתנו."
        confirmLabel="מחיקה"
        onConfirm={remove}
        onCancel={() => setDeletingId(null)}
      />
    </Card>
  );
}

function MealHistorySection() {
  const mealLogs = useMealLogs();
  const allItems = useAllFoodLogItems();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');

  const remove = async () => {
    if (!deletingId) return;
    await db.transaction('rw', db.mealLogs, db.foodLogItems, async () => {
      await db.foodLogItems.where('mealId').equals(deletingId).delete();
      await db.mealLogs.delete(deletingId);
    });
    setDeletingId(null);
  };

  const saveAsTemplate = async (mealId: string) => {
    if (!templateName.trim() || !allItems) return;
    const items = allItems.filter((item) => item.mealId === mealId);
    const now = new Date().toISOString();
    await db.savedMeals.add({
      id: crypto.randomUUID(),
      name: templateName.trim(),
      items: items.map((item) => ({
        foodReferenceId: item.foodReferenceId,
        displayName: item.displayName,
        estimatedGrams: item.estimatedGrams,
        kcal: item.kcal,
        proteinGrams: item.proteinGrams,
      })),
      createdAt: now,
      updatedAt: now,
    });
    setSavingId(null);
    setTemplateName('');
  };

  if (mealLogs === undefined || allItems === undefined) return null;

  const recentMeals = mealLogs.slice(0, 15);

  return (
    <Card className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">היסטוריית ארוחות</h2>
      {recentMeals.length === 0 ? (
        <EmptyState title="אין עדיין ארוחות רשומות" />
      ) : (
        <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
          {recentMeals.map((meal) => {
            const items = allItems.filter((item) => item.mealId === meal.id);
            const totals = totalsFor(items);
            return (
              <li key={meal.id} className="flex flex-col gap-2 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{format(new Date(meal.eatenAt), 'dd/MM/yyyy HH:mm')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{meal.originalText}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {Math.round(totals.kcal)} קק״ל · {Math.round(totals.proteinGrams * 10) / 10} גרם חלבון
                      {meal.dayCompleteAfterThisMeal ? ' · יום הושלם' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-teal-600 dark:text-teal-300"
                      onClick={() => setSavingId(meal.id)}
                    >
                      שמירה כתבנית
                    </button>
                    <button type="button" className="text-xs font-medium text-red-500" onClick={() => setDeletingId(meal.id)}>
                      מחיקה
                    </button>
                  </div>
                </div>
                {savingId === meal.id ? (
                  <div className="flex gap-2">
                    <input
                      className="input flex-1"
                      placeholder="שם התבנית"
                      value={templateName}
                      onChange={(event) => setTemplateName(event.target.value)}
                    />
                    <Button onClick={() => saveAsTemplate(meal.id)}>שמירה</Button>
                    <Button variant="secondary" onClick={() => setSavingId(null)}>
                      ביטול
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={deletingId !== null}
        title="מחיקת ארוחה"
        description="לא ניתן לשחזר לאחר מחיקה."
        confirmLabel="מחיקה"
        onConfirm={remove}
        onCancel={() => setDeletingId(null)}
      />
    </Card>
  );
}

function SummarySection() {
  const summary = useNutritionSummary();

  if (summary === undefined) return null;
  if (summary === null) {
    return (
      <Card>
        <EmptyState title="השלימו את פרטי הפרופיל כדי לראות סיכום תזונה" />
      </Card>
    );
  }

  const { daily, weekly } = summary;

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">סיכום יומי ושבועי</h2>
      <div className="grid grid-cols-2 gap-4">
        <CardStat label="קלוריות שנאכלו היום" value={`${Math.round(daily.kcalEaten)} קק״ל`} />
        <CardStat
          label="חלבון היום"
          value={`${Math.round(daily.proteinEaten * 10) / 10} / ${Math.round(daily.proteinTargetGrams)} גרם`}
        />
        <CardStat label="הוצאה משוערת היום" value={`${Math.round(daily.estimatedExpenditureKcal)} קק״ל`} />
        <CardStat label="מאזן יומי משוער" value={`${Math.round(daily.estimatedBalanceKcal)} קק״ל`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CardStat
          label="סטטוס שבועי"
          value={WEEKLY_STATUS_LABELS[weekly.status]}
        />
        <CardStat
          label="גירעון מצטבר עד כה"
          value={`${Math.round(weekly.cumulativeDeficitSoFarKcal)} קק״ל`}
        />
        {weekly.forecastEndOfWeekDeficitKcal !== null ? (
          <CardStat label="תחזית גירעון לסוף השבוע" value={`${Math.round(weekly.forecastEndOfWeekDeficitKcal)} קק״ל`} />
        ) : null}
        {weekly.kcalRemainingInWeeklyBudgetKcal !== null ? (
          <CardStat label="נותר בתקציב השבועי" value={`${Math.round(weekly.kcalRemainingInWeeklyBudgetKcal)} קק״ל`} />
        ) : null}
      </div>

      <details className="text-sm text-slate-500 dark:text-slate-400">
        <summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-300">איך חישבנו?</summary>
        <div className="mt-2 flex flex-col gap-2">
          <p>
            ההוצאה היומית מבוססת על הערכת BMR לפי הפרופיל, מוכפלת בגורם פעילות, בתוספת הוצאת אימונים בפועל (או מתוכננת
            לימים עתידיים).
          </p>
          <p>
            ימים שכבר עברו נספרים לפי מה שנרשם בפועל. יום שסומן כ״סיימתי להזין להיום״ נספר כיום שלם; אחרת הוא נחשב חלקי.
          </p>
          <p>
            ימים עתידיים בשבוע מוערכים לפי צריכת הקלוריות הממוצעת שלכם ב-3 עד 7 הימים השלמים האחרונים (גם אם היו לפני
            תחילת השבוע הנוכחי). אם אין לפחות 3 ימים שלמים כאלה, לא מוצגת תחזית מספרית.
          </p>
          <p>היעד השבועי לגירעון קלורי נגזר מיעד המשקל הפעיל, אם קיים.</p>
        </div>
      </details>
    </Card>
  );
}

export function FoodLogScreen() {
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="safe-x flex flex-col gap-4 p-4 pb-8">
      <Link to="/nutrition" className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
        <ArrowRight size={16} /> חזרה לתזונה
      </Link>
      <h1 className="text-2xl font-bold">יומן אוכל</h1>

      <SummarySection />
      <EntryForm key={formKey} onSaved={() => setFormKey((key) => key + 1)} />
      <SavedMealsSection />
      <MealHistorySection />
    </div>
  );
}
