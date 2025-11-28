import { test, expect } from '@playwright/test';

test('Pen tool creates nodes and walls', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  await page.goto('http://localhost:5173');
  await page.waitForSelector('svg.pointer-events-auto');

  // Scope to the editor canvas only
  const getCanvasNodes = () => page.locator('svg.pointer-events-auto circle');
  
  const initialNodes = await getCanvasNodes().count();
  console.log(`Initial Canvas Nodes: ${initialNodes}`);

  // Select Pen Tool
  console.log("Clicking Draw Wall button...");
  
  const modeSwitchPromise = page.waitForEvent('console', msg => msg.text().includes('mode: DRAWING'));
  await page.getByTitle('Draw Wall').click({ force: true });
  await modeSwitchPromise;
  
  console.log("Mode switched!");

  // Click 1: Start drawing
  console.log("Clicking canvas (300, 300)...");
  await page.mouse.click(300, 300);
  await page.waitForTimeout(500);
  
  // Click 2: Finish segment
  console.log("Clicking canvas (400, 300)...");
  await page.mouse.click(400, 300);
  await page.waitForTimeout(500);

  const newNodes = await getCanvasNodes().count();
  console.log(`New Canvas Nodes: ${newNodes}`);

  expect(newNodes).toBeGreaterThan(initialNodes);
});
