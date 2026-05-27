# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.ts >> AI Money Coach full workflow
- Location: tests/e2e.spec.ts:3:1

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=/Hoàn tất|Complete/')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 120000ms
  - waiting for locator('text=/Hoàn tất|Complete/')

```

```yaml
- list:
  - listitem:
    - link "Money Coach Personal finance":
      - /url: /app/overview
- text: Tài chính của bạn
- list:
  - listitem:
    - link "Tổng quan":
      - /url: /app/overview
  - listitem:
    - link "Giao dịch":
      - /url: /app/transactions
  - listitem:
    - link "Chờ duyệt":
      - /url: /app/review
    - text: "1"
  - listitem:
    - link "Phân tích":
      - /url: /app/spending
  - listitem:
    - link "Ngân sách":
      - /url: /app/budgets
  - listitem:
    - link "Định kỳ":
      - /url: /app/recurring
  - listitem:
    - link "Trợ lý":
      - /url: /app/coach
- text: Quản lý
- list:
  - listitem:
    - link "Nhập sao kê":
      - /url: /app/import
  - listitem:
    - link "Lịch sử nhập":
      - /url: /app/imports
  - listitem:
    - link "Cài đặt":
      - /url: /app/settings
- list:
  - listitem:
    - button "Đăng xuất demo"
- button "Toggle Sidebar"
- main:
  - button "Toggle Sidebar"
  - paragraph: Nhập sao kê
  - text: Demo data
  - button "Use English"
  - button "Đổi giao diện màu"
  - link "Nhập CSV":
    - /url: /app/import
  - main:
    - heading "Nhập sao kê" [level=1]
    - paragraph: Tải CSV ngân hàng; dữ liệu demo được phân loại tại trình duyệt.
    - text: Tải file CSV date, description, amount
    - group:
      - text: Sao kê ngân hàng
      - button "Sao kê ngân hàng" [disabled]
      - paragraph: Chỉ dùng CSV; số âm là chi tiêu, số dương là thu nhập.
    - text: Đang lưu kết quả 88%
    - progressbar
    - button "Dùng CSV mẫu" [disabled]
    - text: Pipeline phân loại Luồng backend dự kiến 1
    - paragraph: CSV -> S3
    - paragraph: Private statement storage
    - text: "2"
    - paragraph: Rule matching
    - paragraph: Known merchants, no AI call
    - text: "3"
    - paragraph: Bedrock
    - paragraph: Unclear descriptions only
    - text: "4"
    - paragraph: Review queue
    - paragraph: Confidence below threshold
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('AI Money Coach full workflow', async ({ page }) => {
  4  |   // Go to sign-in page directly
  5  |   await page.goto('http://localhost:3000/auth/sign-in');
  6  | 
  7  |   // Click Use demo account (supports both vi and en)
  8  |   const demoButton = page.locator('button', {
  9  |     hasText: /Dùng tài khoản demo|Use demo account/,
  10 |   });
  11 |   await demoButton.click();
  12 | 
  13 |   // Wait for Dashboard (Overview)
  14 |   await page.waitForURL('**/app/overview**');
  15 | 
  16 |   // Verify overview page loaded
  17 |   await expect(page).toHaveURL(/.*overview/);
  18 | 
  19 |   // Navigate to Import page
  20 |   await page.goto('http://localhost:3000/app/import');
  21 | 
  22 |   // Click Use sample CSV (supports both vi and en)
  23 |   const sampleButton = page.locator('button', {
  24 |     hasText: /Dùng CSV mẫu|Use sample CSV/,
  25 |   });
  26 |   await sampleButton.click();
  27 | 
  28 |   // Wait for processing to complete - look for the success alert
  29 |   const completeText = page.locator('text=/Hoàn tất|Complete/');
> 30 |   await expect(completeText).toBeVisible({ timeout: 120000 });
     |                              ^ Error: expect(locator).toBeVisible() failed
  31 | 
  32 |   // Check if Review button appeared
  33 |   const reviewButton = page.locator('button', {
  34 |     hasText: /Xem mục cần duyệt|Review uncertain items/,
  35 |   });
  36 |   await expect(reviewButton).toBeVisible({ timeout: 5000 });
  37 | 
  38 |   // Click Review button to go to Review Queue
  39 |   await reviewButton.click();
  40 |   await expect(page).toHaveURL(/.*review/);
  41 | });
  42 | 
```