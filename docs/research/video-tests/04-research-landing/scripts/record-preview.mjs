import {chromium} from '/home/bartek/linux-agent/services/browser-worker/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const root='/home/bartek/linux-agent-tutorial-04';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:root+'/evidence/page-video',size:{width:1440,height:900}}});
const page=await context.newPage();const start=Date.now();const markers=[];
const mark=name=>markers.push({name,atMs:Date.now()-start});
await page.goto('file:///home/bartek/linux-agent-tutorial-landing-workspace/index.html');await page.evaluate(()=>document.fonts.ready);mark('hero');await page.waitForTimeout(3500);
await page.locator('#tips').scrollIntoViewIfNeeded();mark('tips');await page.waitForTimeout(3000);
await page.locator('#compare').scrollIntoViewIfNeeded();mark('comparison');await page.waitForTimeout(2500);
const slider=page.locator('#compareSlider');await slider.focus();await page.keyboard.press('Home');mark('dark');await page.waitForTimeout(2000);await page.keyboard.press('End');mark('bright');await page.waitForTimeout(2200);await page.keyboard.press('Home');await page.waitForTimeout(1500);
await page.locator('#checklist').scrollIntoViewIfNeeded();mark('checklist');await page.waitForTimeout(1600);
for(const box of await page.locator('.checklist-input').all()){await box.check();await page.waitForTimeout(420)}
mark('all_checked');await page.waitForTimeout(1400);await page.locator('#resetChecklist').click();await page.waitForTimeout(1400);
await page.locator('#lighting').scrollIntoViewIfNeeded();mark('lighting');await page.waitForTimeout(2400);
await page.locator('#sources').scrollIntoViewIfNeeded();mark('sources');await page.waitForTimeout(2800);
await page.evaluate(()=>window.scrollTo({top:0,behavior:'smooth'}));await page.waitForTimeout(1000);mark('hero_end');await page.waitForTimeout(2500);
const video=page.video();await context.close();const p=await video.path();fs.copyFileSync(p,root+'/public/landing-preview.webm');fs.writeFileSync(root+'/evidence/preview-markers.json',JSON.stringify({capturedAt:new Date().toISOString(),durationMs:Date.now()-start,markers,scope:'Host Chromium replay of the generated local page, performed by reviewer after the app task. No live app actions are simulated.'},null,2));await browser.close();console.log('Preview recorded');
