import numpy as np,wave
sr=48000;duration=117;a=np.zeros((sr*duration,2))
for start,end in [(0,13),(39,51),(95,117)]:
 i=int(start*sr);j=int(end*sr);t=np.arange(j-i)/sr
 env=np.sin(np.clip(t/1.5,0,1)*np.pi/2)**2*np.sin(np.clip((end-start-t)/2,0,1)*np.pi/2)**2
 for k,f in enumerate([130.8128,195.9977,261.6256]):
  sig=.008*np.sin(2*np.pi*f*t+.10*np.sin(2*np.pi*.09*t))*env*(.8+.2*np.sin(2*np.pi*.07*t+k));a[i:j,k%2]+=sig;a[i:j,1-k%2]+=sig*.7
with wave.open('public/sound-design.wav','w')as w:
 w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((a*32767).astype('<i2').tobytes())
print('Audio duration',duration,'peak dBFS',20*np.log10(np.max(np.abs(a))),'music only on editorial cards')
