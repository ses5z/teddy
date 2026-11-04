// Takes the English presentation screenshots: npm run screenshots
// Runs in demo mode with sample data only. The school logo is blocked so it never ends up in the repo.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium, type BrowserContext, type Page } from 'playwright';

const APP = 'http://127.0.0.1:5173';
const HEALTH = 'http://127.0.0.1:3001/api/health';
const OUT = 'docs/screenshots/en';
const CALENDAR_MONTH = '2027-01'; // New Year's Day and final exams

async function health(): Promise<{ aiMode: string; moodleConfigured: boolean } | null> {
  try {
    const response = await fetch(HEALTH);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

async function waitForDemoServer() {
  for (let i = 0; i < 60; i++) {
    const status = await health();
    const client = await fetch(APP).then((r) => r.ok).catch(() => false);
    if (status && client) {
      if (status.moodleConfigured || status.aiMode !== 'demo') throw new Error('Server is not in demo mode.');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('App did not start.');
}

async function newContext(browser: Awaited<ReturnType<typeof chromium.launch>>, width: number, height: number) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    locale: 'en-US',
    timezoneId: 'Europe/Istanbul',
    reducedMotion: 'reduce',
  });
  await context.route('**/brand/**', (route) => route.abort());
  // Sample instructor names are Turkish placeholders in the data, so they are swapped for the English shots only.
  await context.route('**/api/**', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replaceAll('Dr. Örnek Hoca', 'Dr. Sample Instructor').replaceAll('Örnek Hoca', 'Sample Instructor');
    await route.fulfill({ response, body });
  });
  await context.addInitScript(() => {
    localStorage.setItem('teddy.onboarded', 'true');
    localStorage.setItem('teddy.profile', JSON.stringify({ name: 'Alex', courses: ['ECON 101', 'MATH 101'] }));
    localStorage.setItem(
      'teddy.settings',
      JSON.stringify({ language: 'en', theme: 'light', fontSize: 'normal', highContrast: false }),
    );
  });
  return context;
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !document.querySelector('.animate-pulse, [aria-busy="true"]'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

async function open(page: Page, path: string) {
  await page.goto(APP + path);
  await settle(page);
}

async function shoot(page: Page, name: string, fullPage = false) {
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  console.log(`${name}.png`);
}

async function capture(desktop: BrowserContext, mobile: BrowserContext) {
  const page = await desktop.newPage();

  await open(page, '/');
  await page.getByText('Latest announcements').first().waitFor();
  await shoot(page, 'home', true);

  await open(page, '/chat');
  await page.getByLabel('Your message').fill('What are the latest announcements?');
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByText('TEDDY is typing...').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'This answer was helpful' }).scrollIntoViewIfNeeded();
  await shoot(page, 'chat');

  await open(page, '/study?course=ECON%20101');
  await page.locator('section[aria-labelledby="study-samples"] button').first().click();
  await page.getByRole('button', { name: 'One more hint' }).waitFor();
  await shoot(page, 'study-mode');

  await open(page, '/announcements');
  await shoot(page, 'announcements', true);

  await open(page, `/calendar?month=${CALENDAR_MONTH}`);
  await page.getByRole('button', { name: 'Month', exact: true }).click();
  await page.getByRole('heading', { name: 'January 2027' }).or(page.getByText('January 2027', { exact: true })).first().waitFor();
  await shoot(page, 'calendar', true);

  await open(page, '/courses');
  await page.getByRole('link', { name: /ECON 101/ }).click();
  await settle(page);
  await page.getByRole('tab', { name: 'Overview' }).click();
  await shoot(page, 'course-detail', true);

  const phone = await mobile.newPage();
  await open(phone, '/');
  await phone.getByRole('button', { name: /Open menu/ }).click();
  await shoot(phone, 'menu-mobile');
}

async function main() {
  if (await health()) throw new Error('Stop the running app first, it may be using real data.');
  mkdirSync(OUT, { recursive: true });

  // Set but empty values win over server/.env, which stays untouched.
  const server = spawn('npm', ['run', 'dev'], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, MOODLE_URL: '', MOODLE_TOKEN: '', AI_API_KEY: '' },
  });

  const browser = await chromium.launch();
  try {
    await waitForDemoServer();
    await capture(await newContext(browser, 1440, 900), await newContext(browser, 390, 844));
  } finally {
    await browser.close();
    if (server.pid) process.kill(-server.pid);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
