import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import App from '@/App';
import { db } from '@/db/database';
import { buildSeedWeeklyWorkoutTemplates } from '@/db/workout-seed-data';
import { netExerciseKcal } from '@/lib/calculations/workout-plan';
import { suggestAlternativeDate } from '@/lib/calculations/weigh-in';
import { MINOR_SAFETY_DISCLAIMER } from '@/lib/calculations/weight-goal';

// HashRouter reads window.location.hash, which jsdom keeps across tests in the
// same file (unlike a real browser tab reload), so reset it before each test.
beforeEach(() => {
  window.location.hash = '';
});

afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

function futureDateInputValue(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function completeOnboardingAndOpenNutrition(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await user.clear(await screen.findByLabelText('גיל (אם אין תאריך)'));
  await user.type(screen.getByLabelText('גיל (אם אין תאריך)'), '30');
  await user.clear(screen.getByLabelText('גובה (ס״מ)'));
  await user.type(screen.getByLabelText('גובה (ס״מ)'), '178');
  await user.clear(screen.getByLabelText('משקל נוכחי (ק״ג)'));
  await user.type(screen.getByLabelText('משקל נוכחי (ק״ג)'), '82');
  await user.click(screen.getByRole('button', { name: 'התחלה' }));
  await screen.findByRole('heading', { name: 'בית' });
  await user.click(screen.getByRole('link', { name: 'תזונה' }));
  await screen.findByRole('heading', { name: 'תזונה' });
}

describe('Nutrition module', () => {
  it('weigh-in: adding, excluding from trend and deleting an entry updates history and profile', async () => {
    const user = userEvent.setup();
    await completeOnboardingAndOpenNutrition(user);

    await user.click(screen.getByRole('link', { name: /יומן שקילות/ }));
    await screen.findByRole('heading', { name: 'יומן שקילות', level: 1 });

    // Onboarding itself records an initial weigh-in.
    expect(screen.getByText(/82\.0 ק״ג/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ שקילה חדשה' }));
    await user.type(screen.getByLabelText('משקל (ק״ג)'), '80.5');
    await user.type(screen.getByLabelText('הערה (אופציונלי)'), 'אחרי אימון');
    await user.click(screen.getByRole('button', { name: 'שמירת שקילה' }));

    expect(await screen.findByText(/80\.5 ק״ג/)).toBeInTheDocument();

    const profile = await db.userProfile.get('local-user');
    expect(profile?.currentWeightKg).toBe(80.5);

    let entries = await db.weightEntries.toArray();
    expect(entries).toHaveLength(2);

    // Exclude the new entry from the trend.
    const newEntryItem = screen.getByText(/80\.5 ק״ג/).closest('li');
    if (!newEntryItem) throw new Error('weigh-in list item not found');
    await user.click(within(newEntryItem).getByRole('button', { name: 'החרגה ממגמה' }));
    await within(newEntryItem).findByRole('button', { name: 'ביטול החרגה' });

    entries = await db.weightEntries.toArray();
    expect(entries.find((entry) => entry.weightKg === 80.5)?.excludedFromTrend).toBe(true);

    // Delete the original onboarding entry.
    const oldEntryItem = screen.getByText(/82\.0 ק״ג/).closest('li');
    if (!oldEntryItem) throw new Error('weigh-in list item not found');
    await user.click(within(oldEntryItem).getByRole('button', { name: 'מחיקה' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'מחיקה' }));

    expect(screen.queryByText(/82\.0 ק״ג/)).not.toBeInTheDocument();
    entries = await db.weightEntries.toArray();
    expect(entries).toHaveLength(1);
  });

  it('weight goal: blocks a weight-gain target and warns with an alternative date for an aggressive loss target', async () => {
    const user = userEvent.setup();
    await completeOnboardingAndOpenNutrition(user);

    await user.click(screen.getByRole('link', { name: /יעד משקל/ }));
    await screen.findByRole('heading', { name: 'יעד משקל' });

    const targetWeightInput = screen.getByLabelText('משקל יעד (ק״ג)');
    const targetDateInput = screen.getByLabelText('תאריך יעד');
    const saveButton = screen.getByRole('button', { name: 'שמירת יעד' });

    // A gain target (target above current 82kg) must be blocked outright.
    await user.type(targetWeightInput, '90');
    await user.type(targetDateInput, futureDateInputValue(30));
    await screen.findByText('מצב עלייה במשקל עדיין אינו נתמך בגרסה הזו. לא ניתן לשמור יעד כזה.');
    expect(saveButton).toBeDisabled();

    // Switch to an aggressive loss target: 12kg in 14 days is far above the
    // conservative 0.5%-of-bodyweight-per-week cap for an 82kg starting point.
    await user.clear(targetWeightInput);
    await user.type(targetWeightInput, '70');
    await user.clear(targetDateInput);
    await user.type(targetDateInput, futureDateInputValue(14));

    await screen.findByText(/קצב השינוי המבוקש גדול מ־0.5% ממשקל הגוף בשבוע/);
    expect(screen.getByText(MINOR_SAFETY_DISCLAIMER)).toBeInTheDocument();

    const expectedAltDate = suggestAlternativeDate(new Date(), 82, 70);
    expect(screen.getByText(new RegExp(format(expectedAltDate, 'dd/MM/yyyy')))).toBeInTheDocument();

    expect(saveButton).not.toBeDisabled();
    await user.click(saveButton);

    await screen.findByRole('heading', { name: 'היעד הפעיל' });
    expect(screen.getByText('70.0 ק״ג')).toBeInTheDocument();

    const goals = await db.weightGoals.toArray();
    expect(goals).toHaveLength(1);
    expect(goals[0]).toMatchObject({ active: true, targetWeightKg: 70 });
  });

  it('workouts: logging a planned session avoids double-counting and both can be deleted', async () => {
    const user = userEvent.setup();
    await completeOnboardingAndOpenNutrition(user);

    await user.click(screen.getByRole('link', { name: /אימונים/ }));
    await screen.findByRole('heading', { name: 'אימונים', level: 1 });

    const todaysWeekday = new Date().getDay();

    // The app seeds a default personal training load (2 high-intensity
    // CrossFit + 4 high-intensity judo sessions every day), so "היום" already
    // lists 6 planned items before we add our own.
    const seededTodayKcal = buildSeedWeeklyWorkoutTemplates()
      .filter((template) => template.weekday === todaysWeekday)
      .reduce((sum, template) => sum + netExerciseKcal(template.metValue, 82, template.durationMinutes), 0);

    await user.click(screen.getByRole('button', { name: '+ אימון שבועי' }));
    await user.type(screen.getByLabelText('כותרת'), 'אימון בוקר');
    await user.selectOptions(screen.getByLabelText('יום בשבוע'), String(todaysWeekday));
    await user.click(screen.getByRole('button', { name: 'שמירה' }));

    // The template is scheduled for today; scope to its own list item since
    // the seeded templates also show up under "היום" with the same button label.
    const todayCard = screen.getByRole('heading', { name: 'היום' }).closest('.rounded-2xl');
    if (!todayCard) throw new Error('today card not found');
    const todayItem = within(todayCard).getByText(/אימון בוקר/).closest('li');
    if (!todayItem) throw new Error("today's list item for the new template not found");
    await user.click(within(todayItem).getByRole('button', { name: 'סימון כהושלם' }));
    await user.click(screen.getByRole('button', { name: 'שמירת אימון' }));

    // Default template values: moderate intensity (MET 5), 60 minutes, 82kg profile weight.
    // netExerciseKcal = (5 - 1) * 82 * (60 / 60) = 328. It must count exactly
    // once (not double-counted as both "logged" and "still planned") on top
    // of the seeded sessions' kcal.
    await within(todayItem).findByText('הושלם');
    const expectedTotalKcal = Math.round(seededTodayKcal + 328);
    expect(screen.getByText(`${expectedTotalKcal} קק״ל`)).toBeInTheDocument();

    let logs = await db.workoutLogs.toArray();
    expect(logs).toHaveLength(1);
    const templates = await db.weeklyWorkoutTemplates.toArray();
    const ownTemplate = templates.find((template) => template.title === 'אימון בוקר');
    expect(logs[0].templateId).toBe(ownTemplate?.id);
    expect(logs[0].estimatedNetKcal).toBeCloseTo(328);

    // Delete the log: today's status button should return to "pending".
    const historyCard = screen.getByRole('heading', { name: 'היסטוריית אימונים' }).closest('.rounded-2xl');
    if (!historyCard) throw new Error('history card not found');
    await user.click(within(historyCard).getByRole('button', { name: 'מחיקה' }));
    let dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'מחיקה' }));

    await within(todayItem).findByRole('button', { name: 'סימון כהושלם' });
    logs = await db.workoutLogs.toArray();
    expect(logs).toHaveLength(0);

    // Delete the weekly template itself (scope to the schedule card, since
    // the template title also appears in the "היום" card above it).
    const templatesCard = screen.getByRole('heading', { name: 'לוח שבועי קבוע' }).closest('.rounded-2xl');
    if (!templatesCard) throw new Error('templates card not found');
    const templateItem = within(templatesCard).getByText(/אימון בוקר/).closest('li');
    if (!templateItem) throw new Error('template list item not found');
    await user.click(within(templateItem).getByRole('button', { name: 'מחיקה' }));
    dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'מחיקה' }));

    expect(screen.queryByText(/אימון בוקר/)).not.toBeInTheDocument();
    const remainingTemplates = await db.weeklyWorkoutTemplates.toArray();
    expect(remainingTemplates).toHaveLength(buildSeedWeeklyWorkoutTemplates().length);
  });
});
