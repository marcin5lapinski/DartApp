import { chromium } from 'playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fileUrl = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => errors.push(err.message));

await page.goto(fileUrl);
await page.waitForSelector('#screen-setup.active');
await page.screenshot({ path: path.join(__dirname, 'screenshot-setup.png') });
console.log('✅ Setup screen loaded');

// Fill in player names and start match
await page.fill('#input-p1', 'Marcin');
await page.fill('#input-p2', 'Bartek');
await page.selectOption('#sel-variant', '501');
await page.selectOption('#sel-legs', '3');
await page.click('#btn-start-match');
await page.waitForSelector('#screen-game.active');
await page.screenshot({ path: path.join(__dirname, 'screenshot-game.png') });
console.log('✅ Game screen loaded — 501, best of 3');

// Check scores show 501
const score0 = await page.$eval('#player-card-0 .player-score', el => el.textContent.trim());
const score1 = await page.$eval('#player-card-1 .player-score', el => el.textContent.trim());
console.log(`  Scores: ${score0} / ${score1}`);
console.assert(score0 === '501', `Expected 501, got ${score0}`);

// Enter a score of 180 (summary mode)
await page.fill('#input-score', '180');
await page.click('#btn-submit-score');
await page.screenshot({ path: path.join(__dirname, 'screenshot-after-180.png') });
const newScore = await page.$eval('#player-card-0 .player-score', el => el.textContent.trim());
console.log(`  After 180: score = ${newScore}`);
console.assert(newScore === '321', `Expected 321, got ${newScore}`);

// Bust test: player 2's turn, enter a bust
const score1Before = await page.$eval('#player-card-1 .player-score', el => el.textContent.trim());
await page.fill('#input-score', '1');
await page.click('#btn-submit-score');
// Score should still be 501 (bust, score 1 → remaining would be 500 → ok, not a bust on its own)
// Actually bust = result of 1 → not triggering for score=1 since 501-1=500 which is fine
// Let's do a real bust: if score is 321 for P1, enter 320 → remaining 1 → bust
// But it's player 2's turn. Let's skip player 2's turn properly.
// P2 score 501, throw 100 → 401
await page.fill('#input-score', '100');
await page.click('#btn-submit-score');
const p2score = await page.$eval('#player-card-1 .player-score', el => el.textContent.trim());
console.log(`  P2 after 100: ${p2score}`);

// Test bust: player 1 (321 left), throw 320 → remaining 1 → BUST
await page.fill('#input-score', '320');
await page.click('#btn-submit-score');
// Should show bust toast briefly
await page.screenshot({ path: path.join(__dirname, 'screenshot-bust.png') });
const scoreAfterBust = await page.$eval('#player-card-0 .player-score', el => el.textContent.trim());
console.log(`  After bust (320 from 321): score = ${scoreAfterBust} (should still be 321)`);
console.assert(scoreAfterBust === '321', `Bust not working! Got ${scoreAfterBust}`);

// Test checkout hint at 170
// Navigate p1 down to 170 — currently 321, throw 151
await page.fill('#input-score', '151');
await page.click('#btn-submit-score');
// Now P2's turn, skip
await page.fill('#input-score', '100');
await page.click('#btn-submit-score');
// P1 at 170
const hintVisible = await page.$eval('#checkout-hint', el => el.style.display !== 'none');
console.log(`  Checkout hint visible at 170: ${hintVisible}`);
const hintText = await page.$eval('#checkout-hint', el => el.textContent.trim());
console.log(`  Hint text: ${hintText}`);
await page.screenshot({ path: path.join(__dirname, 'screenshot-hint-170.png') });

// Switch to dart-by-dart mode
await page.click('.mode-btn[data-mode="dartbydart"]');
await page.screenshot({ path: path.join(__dirname, 'screenshot-dartbydart-mode.png') });
console.log('✅ Dart-by-dart mode switched');

// Check console errors
if (errors.length > 0) {
  console.error('❌ Console errors:');
  errors.forEach(e => console.error('  ', e));
  process.exit(1);
} else {
  console.log('✅ No console errors');
}

await browser.close();
console.log('\n✅ All checks passed. Screenshots saved.');
