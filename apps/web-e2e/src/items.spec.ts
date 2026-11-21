import { expect, test } from '@playwright/test';

test.describe('items', () => {
  test('renders the create form and the item list', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('H3 Zoom Test');
    await expect(
      page.getByRole('heading', { name: 'Create item' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
  });

  test('submits a text item and shows it processed', async ({ page }) => {
    // Unique per run and per browser project, since all share one database.
    const label = `e2e ${test.info().project.name} ${Date.now()}`;

    await page.goto('/');
    await page.getByLabel('Label').fill(label);
    await page.getByLabel('Value').fill('hello from playwright');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(
      page.getByText('Item submitted for processing.'),
    ).toBeVisible();

    // The row appears via the list query, then flips Pending -> Done when the
    // BullMQ worker finishes (~2s) and the SSE stream pushes the update.
    const row = page.getByRole('button', { name: label });
    await expect(row).toBeVisible();
    await expect(row.getByText('Done')).toBeVisible({ timeout: 15_000 });
  });
});
