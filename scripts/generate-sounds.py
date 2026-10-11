"""Synthesises CoTime's sound effects into assets/sounds/*.wav (numpy only).

Run:  python scripts/generate-sounds.py
"""
import os
import wave

import numpy as np

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
rng = np.random.default_rng(7)


def t(seconds):
    return np.linspace(0, seconds, int(RATE * seconds), endpoint=False)


def lowpass(x, alpha):
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += alpha * (v - acc)
        y[i] = acc
    return y


def envelope(n, attack=0.005, decay=3.0):
    tt = np.arange(n) / RATE
    env = np.minimum(1.0, tt / max(attack, 1e-4)) * np.exp(-decay * tt)
    return env


def save(name, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    data = (x * 32767).astype(np.int16)
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(data.tobytes())


def boom():
    n = int(RATE * 1.4)
    noise = rng.standard_normal(n)
    rumble = lowpass(noise, 0.02) * 6
    crackle = lowpass(noise, 0.3) * envelope(n, 0.001, 9)
    tt = np.arange(n) / RATE
    thump = np.sin(2 * np.pi * (70 - 40 * tt) * tt) * np.exp(-4 * tt)
    return (rumble * envelope(n, 0.002, 2.6) + crackle * 0.6 + thump * 1.2)


def crack():
    n = int(RATE * 0.5)
    noise = rng.standard_normal(n)
    hi = noise - lowpass(noise, 0.25)
    tt = np.arange(n) / RATE
    tinkle = sum(np.sin(2 * np.pi * f * tt) * np.exp(-d * tt) for f, d in [(3100, 18), (4200, 22), (5300, 26), (2500, 14)])
    return hi * envelope(n, 0.0005, 25) + tinkle * 0.25


def alarm():
    tt = t(1.2)
    freq = np.where((tt * 2.5) % 1 < 0.5, 880, 660)
    phase = 2 * np.pi * np.cumsum(freq) / RATE
    tone = np.sign(np.sin(phase)) * 0.5 + np.sin(phase) * 0.5
    return tone * np.minimum(1, (1.2 - tt) * 8)


def whistle():
    tt = t(0.9)
    freq = 1800 - 1300 * (tt / 0.9) ** 1.3
    phase = 2 * np.pi * np.cumsum(freq) / RATE
    return np.sin(phase) * np.minimum(1, tt * 20) * 0.8


def fanfare():
    notes = [(523.25, 0.14), (659.25, 0.14), (783.99, 0.14), (1046.5, 0.5)]
    out = []
    for f, d in notes:
        tt = t(d)
        tone = sum(np.sin(2 * np.pi * f * k * tt) / k for k in (1, 2, 3))
        out.append(tone * np.minimum(1, tt * 60) * np.exp(-2.2 * tt))
    return np.concatenate(out)


def tick():
    tt = t(0.08)
    return np.sin(2 * np.pi * 1400 * tt) * np.exp(-60 * tt)


def go():
    tt = t(0.45)
    tone = sum(np.sin(2 * np.pi * f * tt) for f in (880, 1320))
    return tone * np.minimum(1, tt * 80) * np.exp(-5 * tt)


def sad():
    notes = [(392.0, 0.3), (370.0, 0.3), (349.2, 0.3), (329.6, 0.9)]
    out = []
    for f, d in notes:
        tt = t(d)
        vib = 1 + 0.01 * np.sin(2 * np.pi * 6 * tt) * (tt > 0.15)
        phase = 2 * np.pi * np.cumsum(f * vib) / RATE
        tone = np.sin(phase) + 0.5 * np.sin(2 * phase) + 0.3 * np.sin(3 * phase)
        out.append(tone * np.minimum(1, tt * 30) * np.minimum(1, (d - tt) * 10))
    return np.concatenate(out)


if __name__ == '__main__':
    for name, fn in [('boom.wav', boom), ('crack.wav', crack), ('alarm.wav', alarm), ('whistle.wav', whistle),
                     ('fanfare.wav', fanfare), ('tick.wav', tick), ('go.wav', go), ('sad.wav', sad)]:
        save(name, fn())
        print('wrote', name)
