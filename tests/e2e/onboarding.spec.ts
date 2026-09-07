import { test, expect } from '@playwright/test';

async function completeOnboarding(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ברוכים הבאים' })).toBeVisible();
  await page.getByLabel('גיל (אם אין תאריך)').fill('30');
  await page.getByLabel('גובה (ס״מ)').fill('178');
  await page.getByLabel('משקל נוכחי (ק״ג)').fill('82');
  await page.getByRole('button', { name: 'התחלה' }).click();
  await expect(page.getByRole('heading', { name: 'בית' })).toBeVisible();
}

test('new user completes onboarding and reaches the home dashboard', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page.getByRole('navigation', { name: 'ניווט ראשי' })).toBeVisible();
});

test('reloading and reopening the app does not lose data', async ({ page }) => {
  await completeOnboarding(page);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'בית' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ברוכים הבאים' })).not.toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'בית' })).toBeVisible();
});

test('offline mode still allows navigating between local screens', async ({ page, context }) => {
  await completeOnboarding(page);

  // The service worker only controls the page after it has installed and a
  // navigation has happened under its control, so reload once while still
  // online to let it take over before we cut the network.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'בית' })).toBeVisible();

  await page.getByRole('link', { name: 'הגדרות' }).click();
  await expect(page.getByRole('heading', { name: 'הגדרות' })).toBeVisible();

  await context.setOffline(false);
});
