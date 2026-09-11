"""Render Human5 piano songs to wav (and mp3 if ffmpeg exists)."""
import math, os, re, struct, subprocess, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent
JS = ROOT.parents[1] / 'mira-v2-piano.js'
text = JS.read_text(encoding='utf-8')
acc = {'c':0,'d':2,'e':4,'f':5,'g':7,'a':9,'b':11}

def dur_token(s):
    d = 4 / float(s.replace('.', ''))
    if s.endswith('.'): d *= 1.5
    return d

def compile_song(bpm, src):
    spb = 60 / bpm
    notes, beat = [], 0.0
    for tok in src.split():
        if tok == '|': continue
        if tok[0] == 'r':
            beat += dur_token(tok[1:]); continue
        step = 0
        for p in tok.split('+'):
            m = re.match(r'^([a-g])([s#b]?)(\d)-(\d+\.?)$', p, re.I)
            if not m: continue
            n = acc[m.group(1).lower()] + (int(m.group(3)) + 1) * 12
            if m.group(2) in 's#': n += 1
            elif m.group(2) == 'b': n -= 1
            d = dur_token(m.group(4))
            notes.append((beat * spb, d * spb * 0.92, n))
            step = max(step, d)
        beat += step
    return notes

songs = []
for m in re.finditer(r"\{id:'(\w+)',name:'([^']+)',composer:'([^']+)',bpm:(\d+),src:`([^`]+)`\}", text):
    songs.append((m.group(1), int(m.group(4)), m.group(5)))

SR = 22050

def render(notes, path):
    if not notes: return
    end = max(t + d for t, d, n in notes) + 0.6
    n = int(SR * min(end, 96))
    buf = [0.0] * n
    for t0, dur, midi_n in notes:
        freq = 440 * (2 ** ((midi_n - 69) / 12))
        a0 = int(t0 * SR)
        length = int((dur + 0.22) * SR)
        for i in range(length):
            a = a0 + i
            if a >= n: break
            t = i / SR
            env = math.exp(-t * 3.2) * (1 - math.exp(-t * 90))
            s = math.sin(2 * math.pi * freq * t)
            s += 0.45 * math.sin(2 * math.pi * freq * 2 * t)
            s += 0.12 * math.sin(2 * math.pi * freq * 3 * t)
            buf[a] += env * s * 0.18
    peak = max(1e-6, max(abs(x) for x in buf))
    scale = 0.9 / peak
    with wave.open(str(path), 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', max(-32767, min(32767, int(x * scale * 32767)))) for x in buf))

ROOT.mkdir(parents=True, exist_ok=True)
for sid, bpm, src in songs:
    notes = compile_song(bpm, src)
    wav = ROOT / f'{sid}.wav'
    render(notes, wav)
    mp3 = ROOT / f'{sid}.mp3'
    try:
        subprocess.run(['ffmpeg','-y','-i',str(wav),'-codec:a','libmp3lame','-q:a','4',str(mp3)], check=True, capture_output=True)
        print('mp3', mp3.name, 'notes', len(notes))
    except Exception:
        print('wav', wav.name, 'notes', len(notes), '(no ffmpeg)')
