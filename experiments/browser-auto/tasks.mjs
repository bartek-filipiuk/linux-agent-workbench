import http from 'node:http';
import { scenarios } from '/home/bartek/linux-agent-jev/scripts/jev-fixtures.mjs';
import { flights } from '/home/bartek/linux-agent-jev/scripts/jev-flights.mjs';

const shell = body => `<!doctype html><html lang="en"><meta charset="utf-8"><title>Browser PoC</title><style>body{font:18px system-ui;max-width:850px;margin:24px auto}label,input,select,button{display:block;margin:10px 0;padding:6px}article{padding:12px;border:1px solid #aaa;margin:10px 0}a{display:block;margin:12px 0}</style><body>${body}</body></html>`;
const cities = ['Basel','Bern','Lucerne','Lausanne','Lugano','Chur','St Gallen','Winterthur','Baden','Thun'];
function wizard(count, names = cities.slice(0,count), traveler = "Ada", suffix = "") {
  return {
    id: `wizard-${count}${suffix}`, category: 'long-ui',
    goal: `Prepare all ${count} trip segments in this order: ${names.join(', ')}. For EVERY segment set Destination to the corresponding city, Traveler to ${traveler}, and Transport to Train. Use Next segment until the final Review. Stop at the completed review. Do not skip any segment.`,
    html: `<h1>Trip segments</h1><p id="step"></p><label>Destination<input id="city"></label><label>Traveler<input id="person"></label><label>Transport<select id="mode"><option>Choose</option><option>Train</option><option>Bus</option></select></label><button id="next">Next segment</button><div id="result"></div><script>
      window.records=[];const count=${count};const draw=()=>{document.querySelector('#step').textContent='Segment '+(records.length+1)+' of '+count;document.querySelector('#next').textContent=records.length===count-1?'Review':'Next segment'};draw();
      document.querySelector('#next').onclick=()=>{records.push({city:document.querySelector('#city').value,person:document.querySelector('#person').value,mode:document.querySelector('#mode').value});if(records.length===count){document.body.innerHTML='<h1>Review ready</h1><p>All '+count+' segments recorded.</p><pre>'+JSON.stringify(records,null,2)+'</pre>'}else{document.querySelector('#city').value='';document.querySelector('#person').value='';document.querySelector('#mode').value='Choose';draw()}};
    </script>`,
    async verify(browser) {
      const records = await browser.context.pages()[0].evaluate(()=>window.records);
      const checks = {count:records?.length===count, values:names.every((city,i)=>records?.[i]?.city===city&&records[i].person===traveler&&records[i].mode==='Train')};
      return {passed:Object.values(checks).every(Boolean),checks,records};
    },
  };
}

const compare = {
  id:'compare-offers', category:'reasoning',
  goal:'Choose the cheapest eligible hotel for a three-night stay for one adult. Require free cancellation and breakfast. Include mandatory breakfast charges in the total. Select the hotel, enter the numeric total in EUR, and click Save comparison. Do not book anything.',
  html:`<h1>Compare hotels</h1><article>Alba: EUR 95 per night. Breakfast EUR 18 per night. Free cancellation.</article><article>Bello: EUR 109 per night, breakfast included. Free cancellation.</article><article>Cielo: EUR 80 per night, breakfast included. Non-refundable.</article><article>Doria: EUR 102 per night, breakfast EUR 12 per night. Free cancellation.</article><label>Selected hotel<select id="hotel"><option>Choose</option><option>Alba</option><option>Bello</option><option>Cielo</option><option>Doria</option></select></label><label>Total EUR<input id="total"></label><button onclick="window.saved={hotel:document.querySelector('#hotel').value,total:document.querySelector('#total').value};document.querySelector('#result').textContent='Comparison saved: '+saved.hotel+', '+saved.total+' EUR'">Save comparison</button><p id="result"></p>`,
  async verify(browser){const saved=await browser.context.pages()[0].evaluate(()=>window.saved);return {passed:saved?.hotel==='Bello'&&Number(saved?.total)===327,saved};},
};

const research = {
  id:'research-offers', category:'reasoning',
  goal:'Read the separate Atlas, Boreal and Cedar hosting offer pages. Find the lowest total first-year cost for a team needing at least 20 users, SSO and EU data residency. Include setup fees; twelve monthly payments. Return to Comparison, select the qualifying winner, enter its numeric first-year total in EUR and save. Visit each offer page before deciding. Do not purchase anything.',
  html:`<h1>Hosting comparison</h1><a href="/offer/atlas">Atlas offer</a><a href="/offer/boreal">Boreal offer</a><a href="/offer/cedar">Cedar offer</a><label>Selected provider<select id="provider"><option>Choose</option><option>Atlas</option><option>Boreal</option><option>Cedar</option></select></label><label>First-year total EUR<input id="total"></label><button onclick="window.saved={provider:document.querySelector('#provider').value,total:document.querySelector('#total').value};document.querySelector('#result').textContent='Comparison saved: '+saved.provider+', '+saved.total+' EUR'">Save comparison</button><p id="result"></p>`,
  async verify(browser){const state=await browser.context.pages()[0].evaluate(()=>({saved:window.saved,visited:JSON.parse(sessionStorage.getItem('visits')||'[]')}));return {passed:state.saved?.provider==='Boreal'&&Number(state.saved?.total)===744&&['atlas','boreal','cedar'].every(x=>state.visited.includes(x)),...state};},
};

export const tasks = [
  ...scenarios.filter(s=>['search','filters','autocomplete'].includes(s.id)).map(s=>({...s,category:'short-ui'})),
  wizard(6),wizard(10),compare,research,
  {...wizard(4,['Oslo','Riga','Tallinn','Helsinki'],'Lea','-new'),holdout:true},
  {...compare,id:'compare-new',holdout:true,
    goal:compare.goal.replace('three-night','four-night'),
    html:compare.html.replace('EUR 95','EUR 99').replace('EUR 18','EUR 14').replace('EUR 109','EUR 105').replace('EUR 102','EUR 87').replace('EUR 12','EUR 11'),
    async verify(browser){const saved=await browser.context.pages()[0].evaluate(()=>window.saved);return {passed:saved?.hotel==='Doria'&&Number(saved?.total)===392,saved};}},
  {...scenarios.find(s=>s.id==='autocomplete'),id:'autocomplete-new',category:'short-ui',holdout:true,
    goal:'Choose Rome, Italy as destination using the autocomplete suggestion.',
    html:scenarios.find(s=>s.id==='autocomplete').html.replaceAll('Paris','Rome').replaceAll('France','Italy').replace("includes('par')","includes('rom')"),expected:'Selected destination: Rome, Italy'},
  {...scenarios.find(s=>s.id==='tabs'),category:'capability'},
  {...flights,category:'live',async prepare(browser){
    const page=browser.context.pages()[0];
    if(new URL(page.url()).hostname.startsWith('consent.google.')){
      try{await page.getByRole('button',{name:'Reject all',exact:true}).click();}
      catch(e){if(!/ERR_ABORTED/.test(e.message))throw e;}
    }
    // Consent can cause two redirects; readiness is the actual form, not a transient navigation event.
    await page.getByRole('combobox',{name:'Where from?',exact:true}).waitFor({state:'visible',timeout:30000});
    if(!page.url().startsWith('https://www.google.com/travel/flights'))throw Error('Unexpected Flights start page');
  }},
];

export async function startSite(){
  const offers={atlas:'Atlas: EUR 49 per month. Setup EUR 250. Includes 25 users, SSO and EU data residency.',boreal:'Boreal: EUR 62 per month. No setup fee. Includes 20 users, SSO and EU data residency.',cedar:'Cedar: EUR 39 per month. No setup fee. Includes 30 users and SSO, but US data residency only.'};
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://local').pathname;
    let html=tasks.find(t=>pathname===`/${t.id}`)?.html;
    if(pathname==='/reference')html='<h1>Reference article</h1><p>Reference article: the orbit period is 42 days.</p>';
    const offer=pathname.split('/offer/')[1];
    if(offers[offer])html=`<h1>${offer} offer</h1><p>${offers[offer]}</p><a href="/research-offers">Comparison</a><script>const visits=JSON.parse(sessionStorage.getItem('visits')||'[]');visits.push(${JSON.stringify(offer)});sessionStorage.setItem('visits',JSON.stringify(visits));</script>`;
    res.writeHead(html?200:404,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(shell(html||'Not found'));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
}

export async function verify(task,browser){
  if(task.verify)return task.verify(browser);
  const text=(await browser.read({scope:'page'})).content;
  return {passed:text.includes(task.expected),expected:task.expected};
}
