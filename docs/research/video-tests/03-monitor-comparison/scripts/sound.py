"""Original soft audio under editorial cards; recorded task sections stay silent."""
import json,math,wave,numpy as np
r=json.load(open('src/run-data.json'));sr=48000;fps=30
orig=(math.ceil(r['original']['taskSeconds']/2*fps)+30)/fps
rec=(math.ceil(r['recovery']['taskSeconds']/2*fps)+30)/fps
audit=13+orig;recovery=audit+17;result=recovery+rec;duration=result+20
n=round(duration*sr);a=np.zeros((n,2))
for start,end in [(0,13),(audit,recovery),(result,duration)]:
 i=round(start*sr);j=round(end*sr);t=np.arange(j-i)/sr
 env=np.sin(np.clip(t/1.5,0,1)*np.pi/2)**2*np.sin(np.clip((end-start-t)/2,0,1)*np.pi/2)**2
 for k,f in enumerate([130.8128,195.9977,261.6256]):
  sig=.010*np.sin(2*np.pi*f*t+.10*np.sin(2*np.pi*.09*t))*env*(.8+.2*np.sin(2*np.pi*.07*t+k))
  a[i:j,k%2]+=sig;a[i:j,1-k%2]+=sig*.7
with wave.open('public/sound-design.wav','w')as w:
 w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((a*32767).astype('<i2').tobytes())
print('Duration:',duration,'s; peak:',20*np.log10(np.max(np.abs(a))),'dBFS')
