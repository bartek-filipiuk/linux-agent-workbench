"""Soft original pad: slow attacks, low harmonics, no bells or sharp transients."""
import json,math,wave,numpy as np
r=json.load(open('src/run-data.json'));sr=48000;fps=30
intro=135;prompt=math.ceil((r['startMs']/1000-1.1)*fps);rate=2 if r['taskSeconds']>38 else 1
live=math.ceil(r['taskSeconds']/rate*fps)+45;result=390;end=120
n=round((intro+prompt+live+result+end)/fps*sr);t=np.arange(n)/sr;a=np.zeros((n,2))
fade=np.sin(np.clip(t/3,0,1)*np.pi/2)**2*np.sin(np.clip((n/sr-t)/4,0,1)*np.pi/2)**2
for i,f in enumerate([130.8128,195.9977,261.6256]):
 slow=.78+.22*np.sin(2*np.pi*(.042+i*.006)*t+i)
 sig=.006*np.sin(2*np.pi*f*t+.12*np.sin(2*np.pi*.09*t))*fade*slow
 a[:,i%2]+=sig;a[:,1-i%2]+=sig*.8
for k,at in enumerate([.7,intro/fps,(intro+prompt)/fps,(intro+prompt+live)/fps,(intro+prompt+live+result)/fps]):
 start=int(at*sr);duration=min(4*sr,n-start);x=np.arange(duration)/sr
 env=np.sin(np.clip(x/1.0,0,1)*np.pi/2)**2*np.exp(-x*1.0)*np.sin(np.clip((duration/sr-x)/1,0,1)*np.pi/2)**2
 sig=.017*np.sin(2*np.pi*[261.6256,293.6648,329.6276,261.6256,195.9977][k]*x)*env
 a[start:start+duration,0]+=sig*.8;a[start:start+duration,1]+=sig
a*=1.6
with wave.open('public/sound-design.wav','w')as w:
 w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((a*32767).astype('<i2').tobytes())
print('Duration',n/sr,'s; peak',20*np.log10(np.max(np.abs(a))),'dBFS; RMS',20*np.log10(np.sqrt(np.mean(a*a))),'dBFS')
