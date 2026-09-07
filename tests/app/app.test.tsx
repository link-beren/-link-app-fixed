import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { db } from '@/db/database';

afterEach(async () => {
  // Clear rows rather than db.delete(): deleting closes the shared Dexie
  // connection and it does not reopen for the next test's App instance.
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('App', () => {
  it('shows onboarding first, then the home dashboard with bottom nav after completing it', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'ברוכים הבאים' })).toBeInTheDocument();

    // The onboarding form ships with real-profile defaults; clear before typing
    // the test's own values so they don't concatenate onto the prefilled ones.
    await user.clear(screen.getByLabelText('גיל (אם אין תאריך)'));
    await user.type(screen.getByLabelText('גיל (אם אין תאריך)'), '30');
    await user.clear(screen.getByLabelText('גובה (ס״מ)'));
    await user.type(screen.getByLabelText('גובה (ס״מ)'), '178');
    await user.clear(screen.getByLabelText('משקל נוכחי (ק״ג)'));
    await user.type(screen.getByLabelText('משקל נוכחי (ק״ג)'), '82');
    await user.click(screen.getByRole('button', { name: 'התחלה' }));

    expect(await screen.findByRole('heading', { name: 'בית' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'ניווט ראשי' })).toBeInTheDocument();

    await waitFor(async () => {
      const profile = await db.userProfile.get('local-user');
      expect(profile).toMatchObject({
        onboardingCompleted: true,
        heightCm: 178,
        currentWeightKg: 82,
        ageFallback: 30,
      });
    });

    const weightEntries = await db.weightEntries.toArray();
    expect(weightEntries).toHaveLength(1);
    expect(weightEntries[0]).toMatchObject({ weightKg: 82 });
  });

  it('navigates between the five main tabs', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.clear(await screen.findByLabelText('גיל (אם אין תאריך)'));
    await user.type(screen.getByLabelText('גיל (אם אין תאריך)'), '30');
    await user.clear(screen.getByLabelText('גובה (ס״מ)'));
    await user.type(screen.getByLabelText('גובה (ס״מ)'), '178');
    await user.clear(screen.getByLabelText('משקל נוכחי (ק״ג)'));
    await user.type(screen.getByLabelText('משקל נוכחי (ק״ג)'), '82');
    await user.click(screen.getByRole('button', { name: 'התחלה' }));
    await screen.findByRole('heading', { name: 'בית' });

    for (const [label, heading] of [
      ['קרוספיט', 'קרוספיט'],
      ['ג׳ודו', 'ג׳ודו'],
      ['תזונה', 'תזונה'],
      ['הגדרות', 'הגדרות'],
      ['בית', 'בית'],
    ] as const) {
      await user.click(screen.getByRole('link', { name: label }));
      expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    }
  });
});
