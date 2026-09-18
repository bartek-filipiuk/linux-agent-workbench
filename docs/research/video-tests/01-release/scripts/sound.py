"""Original, deterministic sound design: quiet pad and soft transition tones."""
import json,math,wave,numpy as np
r=json.load(open('src/run-data.json'));sr=48000;fps=30
intro=150;prompt=math.ceil((r['startMs']/1000-1.1)*fps);rate=2 if r['taskSeconds']>38 else 1
live=math.ceil(r['taskSeconds']/rate*fps)+45;result=240;end=120
n=int((intro+prompt+live+result+end)/fps*sr);t=np.arange(n)/sr;a=np.zeros((n,2))
# Warm sustained chord, quiet enough to keep attention on the screen.
for i,f in enumerate([130.8128,195.9977,293.6648]):
 env=np.minimum(t/2,1)*np.minimum((n/sr-t)/3,1)
 sig=.009*np.sin(2*np.pi*f*t+.18*np.sin(2*np.pi*.13*t))*env
 a[:,i%2]+=sig;a[:,1-i%2]+=sig*.75
for k,at in enumerate([.25,intro/fps,(intro+prompt)/fps,(intro+prompt+live)/fps,(intro+prompt+live+result)/fps]):
 start=int(at*sr);duration=min(int(2.9*sr),n-start);x=np.arange(duration)/sr
 freq=[523.251,659.255,587.33,783.991,1046.502][k]
 attack=1-np.exp(-x*90);decay=np.exp(-x*2)
 sig=.10*(np.sin(2*np.pi*freq*x)+.2*np.sin(2*np.pi*freq*2*x))*attack*decay
 a[start:start+duration,0]+=sig*.85;a[start:start+duration,1]+=sig
# Short final fade, no clipping or unrelated desktop audio.
a*=np.clip((n/sr-t)/.6,0,1)[:,None]
with wave.open('public/sound-design.wav','w')as w:
 w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(a,-1,1)*32767).astype('<i2').tobytes())
print('Duration',n/sr,'s; peak',20*np.log10(np.max(np.abs(a))),'dBFS')
