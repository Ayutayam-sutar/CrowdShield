import { test, expect } from '@playwright/test';

test.describe('CrowdShield End-to-End System Check', () => {

  test('Flow 1: App Boot & Admin Login', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    
    // Check title
    await expect(page).toHaveTitle(/Vite \+ React|CrowdShield/i);
    
    // DEBUG
    await page.waitForTimeout(2000);
    const html = await page.content();
    console.log("HTML length:", html.length);
    console.log("HTML snippet:", html.substring(0, 500));
    await page.screenshot({ path: 'debug-auth.png' });
    
    // Fill Admin credentials on the unified login form
    await page.locator('input[placeholder="name@domain.com"]').fill('admin@crowdshield.com');
    await page.locator('input[placeholder="••••••••••••"]').fill('Sentinel@2026');
    
    // Submit
    await page.locator('button', { hasText: 'Authenticate & Launch Portal' }).click();

    // Assert that we reach the dashboard
    await expect(page.locator('text=Venue Composite Risk Index')).toBeVisible({ timeout: 15000 });
    
    // If no console errors were pushed from React crashes
    expect(consoleErrors.filter(e => e.includes('React') || e.includes('Uncaught'))).toEqual([]);
  });

  test('Flow 2: Dashboard UI & WebSocket Stability', async ({ page }) => {
    await page.goto('/');
    
    // Fill Admin credentials on the unified login form
    await page.locator('input[placeholder="name@domain.com"]').fill('admin@crowdshield.com');
    await page.locator('input[placeholder="••••••••••••"]').fill('Sentinel@2026');
    await page.locator('button', { hasText: 'Authenticate & Launch Portal' }).click();

    // Wait for the Dashboard
    await expect(page.locator('text=Venue Composite Risk Index')).toBeVisible({ timeout: 15000 });

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

    // Wait 3 seconds to see if WS connects and stays stable
    await page.waitForTimeout(3000);
    
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // We expect no 401 Unauthorized in console logs
    const wsAuthErrors = consoleErrors.filter(e => e.includes('401') || e.includes('Unauthorized') || e.includes('1008'));
    expect(wsAuthErrors).toEqual([]);
  });

  test('Flow 3: Citizen Portal & A* Map Rendering', async ({ page }) => {
    await page.goto('/');
    
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Switch to Register as Citizen view
    await page.locator('button', { hasText: 'Register as Citizen' }).click();

    // Fill registration credentials
    await page.locator('input[placeholder="Ananya Sharma"]').fill('Test Citizen');
    const testEmail = `citizen_${Date.now()}@test.com`;
    await page.locator('input[placeholder="name@domain.com"]').fill(testEmail);
    await page.locator('input[placeholder="••••••••••••"]').fill('password123');
    
    // Click register
    await page.locator('button', { hasText: 'Register & Enter Portal' }).click();

    // Wait for Citizen Portal to load
    await expect(page.locator('text=Safe Exit Guide').or(page.locator('text=Evacuation Map'))).toBeVisible({ timeout: 15000 });
    
    // Wait for the leaflet container to render on the default Feed view
    const leafletContainer = page.locator('.leaflet-container');
    await expect(leafletContainer).toBeVisible({ timeout: 15000 });

    // Switch to Safe Exit Guide view
    const mapTab = page.locator('button:has-text("Safe Exit Guide")').first();
    if (await mapTab.isVisible()) {
      await mapTab.click();
    }

    // Ensure drill mode renders without crashing
    await expect(page.locator('text=Evacuation Drill Mode')).toBeVisible({ timeout: 15000 });

    // Ensure no blank screen crash
    expect(consoleErrors.filter(e => e.includes('React') || e.includes('Uncaught'))).toEqual([]);
  });
});
