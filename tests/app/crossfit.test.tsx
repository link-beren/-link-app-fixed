import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { db } from '@/db/database';

// HashRouter reads window.location.hash, which jsdom keeps across tests in the
// same file (unlike a real browser tab reload), so reset it before each test.
beforeEach(() => {
  window.location.hash = '';
});

afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

async function completeOnboardingAndOpenCrossfit(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await user.clear(await screen.findByLabelText('גיל (אם אין תאריך)'));
  await user.type(screen.getByLabelText('גיל (אם אין תאריך)'), '30');
  await user.clear(screen.getByLabelText('גובה (ס״מ)'));
  await user.type(screen.getByLabelText('גובה (ס״מ)'), '178');
  await user.clear(screen.getByLabelText('משקל נוכחי (ק״ג)'));
  await user.type(screen.getByLabelText('משקל נוכחי (ק״ג)'), '82');
  await user.click(screen.getByRole('button', { name: 'התחלה' }));
  await screen.findByRole('heading', { name: 'בית' });
  await user.click(screen.getByRole('link', { name: 'קרוספיט' }));
  await screen.findByRole('heading', { name: 'קרוספיט' });
}

describe('CrossFit module', () => {
  it('adding a Deadlift result updates RM1 and the progress chart', async () => {
    const user = userEvent.setup();
    await completeOnboardingAndOpenCrossfit(user);

    await user.type(screen.getByLabelText('חיפוש תרגיל'), 'דדליפט');
    await user.click(await screen.findByRole('link', { name: /הרמת כפיפת גב/ }));
    await screen.findByRole('heading', { name: /הרמת כפיפת גב/ });

    expect(screen.getByText('אין עדיין תוצאות. הוסיפו את הראשונה למעלה.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ תוצאה' }));
    await user.type(screen.getByLabelText('משקל (ק״ג)'), '100');
    await user.type(screen.getByLabelText('חזרות'), '5');
    await user.click(screen.getByRole('button', { name: 'שמירה' }));

    await waitFor(() => {
      expect(screen.getByText(/116\.7 ק"ג/)).toBeInTheDocument();
    });
    expect(screen.getByTestId('progress-chart')).toBeInTheDocument();

    const results = await db.strengthResults.toArray();
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ weightKg: 100, reps: 5 });
    expect(results[0].estimatedOneRmEpley).toBeCloseTo(100 * (1 + 5 / 30));
  });

  it('setting a goal and reaching it marks it achieved with a celebration', async () => {
    const user = userEvent.setup();
    await completeOnboardingAndOpenCrossfit(user);

    await user.type(screen.getByLabelText('חיפוש תרגיל'), 'דדליפט');
    await user.click(await screen.findByRole('link', { name: /הרמת כפיפת גב/ }));
    await screen.findByRole('heading', { name: /הרמת כפיפת גב/ });

    await user.click(screen.getByRole('button', { name: 'יעד חדש' }));
    await user.type(screen.getByLabelText(/ערך יעד/), '140');
    await user.click(screen.getByRole('button', { name: 'שמירת יעד' }));

    expect(await screen.findByText(/יעד: 140/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ תוצאה' }));
    await user.type(screen.getByLabelText('משקל (ק״ג)'), '150');
    await user.type(screen.getByLabelText('חזרות'), '1');
    await user.click(screen.getByRole('button', { name: 'שמירה' }));

    expect(await screen.findByText(/היעד הושג בתאריך/)).toBeInTheDocument();

    const goals = await db.exerciseGoals.toArray();
    expect(goals).toHaveLength(1);
    expect(goals[0].achievedAt).toBeDefined();
  });
});
