// Same goal/date as browser-use/jev-ultrafast/examples/flights.py (retrieved 2026-09-17).
// The benchmark never selects or books a flight. Verification is independent of model output.
export function flightDateSpec(iso, {requireFuture=false, now=new Date()}={}) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso??''))throw Error('Flight date must be YYYY-MM-DD');
  const date=new Date(iso+'T00:00:00Z');
  if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==iso)throw Error('Invalid calendar date');
  if(requireFuture&&iso<=now.toISOString().slice(0,10))throw Error('Flight date must be in the future');
  const format=options=>new Intl.DateTimeFormat('en-US',{...options,timeZone:'UTC'}).format(date);
  return {iso,short:format({weekday:'short',month:'short',day:'numeric'}),long:format({weekday:'long',month:'long',day:'numeric'}),goal:format({year:'numeric',month:'long',day:'numeric'})};
}
export function createFlights(iso, options) {
const date=flightDateSpec(iso,options);
return {
  id: 'google-flights',
  url: 'https://www.google.com/travel/flights?hl=en',
  goal: `Find one-way flights from Zurich to London on ${date.goal}, for one adult in economy. Stop when matching flight options are visible. Do not select or book a flight.`,
  async prepare(browser) {
    const page = browser.context.pages()[0];
    if (new URL(page.url()).hostname === 'consent.google.com') {
      await page.getByRole('button', { name: 'Reject all', exact: true }).click();
      await page.waitForURL('https://www.google.com/travel/flights**', { timeout: 30000, waitUntil: 'domcontentloaded' });
    }
    await page.getByRole('combobox', { name: 'Where from?', exact: true }).waitFor({ state: 'visible', timeout: 30000 });
    // Match the demo's ready-page start; this observation stays outside taskMs.
    await browser.observe({ maxElements: 100 });
  },
  async verify(browser) {
    const page = browser.context.pages().find(p => p.url().includes('/travel/flights/search')) ?? browser.context.pages()[0];
    const snapshot = await page.evaluate(() => ({
      url: location.href,
      controls: [...document.querySelectorAll('input, [role="combobox"], [role="button"], button')].filter(el => el.getClientRects().length).map(el => ({
        role: el.getAttribute('role') || el.tagName.toLowerCase(),
        label: (el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ') || '').trim(), value: el.value ?? el.textContent?.trim() ?? '',
      })),
      text: document.body.innerText,
      flights: [...document.querySelectorAll('[aria-label*="Select flight"]')].filter(el => el.getClientRects().length).map(el => el.getAttribute('aria-label')),
    }));
    const url = new URL(snapshot.url);
    const tfs = Buffer.from(url.searchParams.get('tfs') ?? '', 'base64url').toString('utf8');
    const value = label => snapshot.controls.find(c => c.label === label || c.label.startsWith(label + ' '))?.value;
    const checks = {
      searchPage: url.hostname === 'www.google.com' && url.pathname === '/travel/flights/search',
      origin: /^(Zürich|Zurich)(\s*\(ZRH\))?$/.test(value('Where from?') ?? ''),
      destination: /^London(\s*\(.*\))?$/.test(value('Where to?') ?? ''),
      oneWay: snapshot.controls.some(c => c.role === 'combobox' && c.value === 'One way'),
      departure: value('Departure') === date.short,
      year: tfs.includes(date.iso) || snapshot.text.includes(`departing ${date.iso}`),
      passenger: snapshot.controls.some(c => /1 passenger/i.test(c.label)),
      economy: snapshot.controls.some(c => c.role === 'combobox' && c.value === 'Economy'),
      results: snapshot.flights.length > 0 && snapshot.flights.every(f => new RegExp(`${date.long}(?!\\d)`).test(f)),
    };
    return { passed: Object.values(checks).every(Boolean), checks, url: snapshot.url, controls: snapshot.controls, visibleFlights: snapshot.flights, text: snapshot.text.slice(0, 18000) };
  },
};
}
// Historical fixture: kept for older runner provenance. New Auto live runs require an explicit future date.
export const flights = createFlights('2026-09-20');
