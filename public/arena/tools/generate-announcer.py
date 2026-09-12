"""Rebuild the bundled synthetic arena PA cue; requires FFmpeg with libflite.
The hosted game only plays the resulting WAV and needs no speech service.
"""
from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[1]
runtime=root/'dist' if (root/'dist').is_dir() else root
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-f','lavfi','-i',
 "flite=text='Attention. Incoming U F O swarm.':voice=rms",'-af',
 'asetrate=14080,aresample=24000,atempo=1.08,highpass=f=75,equalizer=f=160:t=q:w=1:g=5,lowpass=f=4700,acompressor=threshold=0.15:ratio=3:attack=5:release=120,aecho=0.8:0.7:95|210:0.22|0.12,alimiter=limit=0.88',
 '-ar','24000','-ac','1','-y',str(runtime/'assets/sfx/swarm-announcer.wav')],check=True)
