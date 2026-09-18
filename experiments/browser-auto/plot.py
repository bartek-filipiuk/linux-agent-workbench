from pathlib import Path
import argparse,json,statistics as S
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
p=argparse.ArgumentParser();p.add_argument('--input',type=Path,required=True);p.add_argument('--output',type=Path,required=True);args=p.parse_args()
rows=[]
for name in ['final-local.json','final-recovery.json','final-holdout.json','final-flights.json']:
 for r in json.load(open(args.input/name))['results']:
  if name=='final-local.json' and r['task'] in ['research-offers','tabs']:continue
  rows.append(r)
assert len(rows)==119
cases=[('wizard-6','Formularz · 6 etapów'),('wizard-10','Formularz · 10 etapów'),('research-offers','Research · 3 źródła'),('compare-offers','Porównanie hoteli'),('wizard-4-new','Nowe dane · 4 etapy'),('compare-new','Nowe ceny · porównanie'),('search','Wyszukiwanie'),('filters','Filtry'),('autocomplete','Autocomplete · Paris'),('tabs','Nowa karta'),('autocomplete-new','Autocomplete · Rome'),('google-flights','Google Flights · Zurich → London')]
engines=['app-auto','app-first','browser-use','ultrafast'];names=['Auto','First','Browser Use','Ultrafast'];colors=['#2563eb','#94a3b8','#0d9488','#d97706']
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.titleweight':'bold','svg.fonttype':'none'})
fig,axes=plt.subplots(4,3,figsize=(17,12));fig.set_facecolor('#f8fafc')
for ax,(task,label) in zip(axes.flat,cases):
 ax.set_facecolor('#f8fafc');present=[]
 for e,n,c in zip(engines,names,colors):
  group=[r for r in rows if r['task']==task and r['engine']==e]
  if not group:continue
  good=[r['taskMs']/1000 for r in group if r['success']]
  present.append((n,c,S.median(good) if good else 0,len(good),len(group),min(good) if good else 0,max(good) if good else 0))
 top=max(x[6] for x in present)*1.58
 for i,(n,c,med,ok,total,lo,hi) in enumerate(present):
  ax.barh(i,med,color=c,height=.56,zorder=3)
  if ok:ax.errorbar(med,i,xerr=[[med-lo],[hi-med]],fmt='none',ecolor='#334155',elinewidth=.8,capsize=3,zorder=4)
  ax.text(hi+top*.02,i,f'{med:.2f} s · {ok}/{total}' if ok else f'brak sukcesu · 0/{total}',va='center',fontsize=9,color='#172033')
 ax.set_yticks(range(len(present)),[x[0] for x in present]);ax.invert_yaxis();ax.set_xlim(0,top);ax.set_title(label,loc='left',fontsize=11,pad=12);ax.set_xlabel('Czas zadania [s]',fontsize=9,color='#475569')
 ax.grid(axis='x',color='#cbd5e1',linewidth=.5,zorder=0);ax.tick_params(axis='both',length=0,labelsize=9)
 for spine in ax.spines.values():spine.set_visible(False)
fig.suptitle('Jev Auto: dobór wykonawcy według zadania',x=.045,y=.98,ha='left',fontsize=24,color='#0f172a',weight='bold')
fig.text(.045,.942,'Mediana, zakres min–max poprawnych prób i sukcesy / wszystkie próby. Gemini 3.8 Flash / low. 119 prób porównawczych.',fontsize=12,color='#475569')
fig.text(.045,.018,'Każdy panel ma własną skalę od zera. Zegar obejmuje weryfikację, bez setupu. Lokalne n=3, Flights n=5.\nPrzerwany blok kredytowy (18 prób) zachowany osobno, poza tym porównaniem. Małe próby nie dowodzą niezawodności w całym internecie.',fontsize=10,color='#475569')
fig.subplots_adjust(left=.10,right=.98,top=.90,bottom=.09,hspace=.62,wspace=.42)
args.output.mkdir(parents=True,exist_ok=True)
for ext in ['png','svg']:fig.savefig(args.output/f'comparison.{ext}',dpi=160,facecolor=fig.get_facecolor())
svg=args.output/'comparison.svg'
svg.write_text('\n'.join(line.rstrip() for line in svg.read_text().splitlines())+'\n')
print('Exported comparison.png and comparison.svg')
