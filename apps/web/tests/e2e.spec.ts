import { test, expect } from '@playwright/test';

test('AI Money Coach full workflow', async ({ page }) => {
  // Go to sign-in page directly
  await page.goto('http://localhost:3000/auth/sign-in');

  // Click Use demo account (supports both vi and en)
  const demoButton = page.locator('button', {
    hasText: /Dùng tài khoản demo|Use demo account/,
  });
  await demoButton.click();

  // Wait for Dashboard (Overview)
  await page.waitForURL('**/app/overview**');

  // Verify overview page loaded
  await expect(page).toHaveURL(/.*overview/);

  // Navigate to Import page
  await page.goto('http://localhost:3000/app/import');

  // Click Use sample CSV (supports both vi and en)
  const sampleButton = page.locator('button', {
    hasText: /Dùng CSV mẫu|Use sample CSV/,
  });
  await sampleButton.click();

  // Wait for processing to complete - look for the success alert
  const completeText = page.locator('text=/Hoàn tất|Complete/');
  await expect(completeText).toBeVisible({ timeout: 120000 });

  // Check if Review button appeared
  const reviewButton = page.locator('button', {
    hasText: /Xem mục cần duyệt|Review uncertain items/,
  });
  await expect(reviewButton).toBeVisible({ timeout: 5000 });

  // Click Review button to go to Review Queue
  await reviewButton.click();
  await expect(page).toHaveURL(/.*review/);
});
