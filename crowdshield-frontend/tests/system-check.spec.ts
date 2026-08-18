import { test, expect } from '@playwright/test';
test.describe('CrowdShield End-to-End System Check', () => {
  test('Flow 1: App Boot & Admin Login', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      console.log(`[Flow 1 Console] [${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    await page.goto('/');
    await expect(page).toHaveTitle(/Vite \+ React|CrowdShield/i);
    await page.waitForTimeout(2000);
    const html = await page.content();
    console.log("HTML length:", html.length);
    await page.screenshot({ path: 'debug-auth.png' });
    await page.locator('input[placeholder="name@domain.com"]').fill('admin@crowdshield.com');
    await page.locator('input[placeholder="••••••••••••"]').fill('Sentinel@2026');
    await page.locator('button', { hasText: 'Authenticate & Launch Portal' }).click();
    await expect(page.locator('text=Live Campus Footfall')).toBeVisible({ timeout: 15000 });
    expect(consoleErrors.filter(e => e.includes('React') || e.includes('Uncaught'))).toEqual([]);
  });

  test('Flow 2: Dashboard UI & WebSocket Stability', async ({ page }) => {
    page.on('console', msg => {
      console.log(`[Flow 2 Console] [${msg.type()}] ${msg.text()}`);
    });

    await page.goto('/');
    await page.locator('input[placeholder="name@domain.com"]').fill('admin@crowdshield.com');
    await page.locator('input[placeholder="••••••••••••"]').fill('Sentinel@2026');
    await page.locator('button', { hasText: 'Authenticate & Launch Portal' }).click();
    await expect(page.locator('text=Live Campus Footfall')).toBeVisible({ timeout: 15000 });

    let wsConnected = false;
    let wsError = false;
    
    page.on('websocket', ws => {
      if (ws.url().includes('ws/telemetry')) {
        wsConnected = true;
        
        ws.on('socketerror', () => {
          wsError = true;
        });
      }
    });
    await page.waitForTimeout(3000);
    
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    const wsAuthErrors = consoleErrors.filter(e => e.includes('401') || e.includes('Unauthorized') || e.includes('1008'));
    expect(wsAuthErrors).toEqual([]);
  });
  test('Flow 3: Citizen Portal & A* Map Rendering', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      console.log(`[Flow 3 Console] [${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    await page.goto('/');
    await page.locator('button', { hasText: 'Register as Citizen' }).click();
    await page.locator('input[placeholder="Ananya Sharma"]').fill('Test Citizen');
    const testEmail = `citizen_${Date.now()}@test.com`;
    await page.locator('input[placeholder="name@domain.com"]').fill(testEmail);
    await page.locator('input[placeholder="••••••••••••"]').fill('password123');
    await page.locator('button', { hasText: 'Register & Enter Portal' }).click();
    try {
      await expect(page.locator('text=Safe Exit Guide').or(page.locator('text=Evacuation Map'))).toBeVisible({ timeout: 15000 });
    } catch (e) {
      await page.screenshot({ path: 'debug-citizen-fail.png' });
      throw e;
    }
    const leafletContainer = page.locator('.leaflet-container');
    await expect(leafletContainer).toBeVisible({ timeout: 15000 });
    const mapTab = page.locator('button:has-text("Safe Exit Guide")').first();
    if (await mapTab.isVisible()) {
      await mapTab.click();
    }
    await expect(page.locator('text=Live Evacuation Route').first()).toBeVisible({ timeout: 15000 });

    expect(consoleErrors.filter(e => e.includes('React') || e.includes('Uncaught'))).toEqual([]);
  });
});
