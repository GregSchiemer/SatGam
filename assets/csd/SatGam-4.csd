<CsoundSynthesizer>
<CsOptions>
-odac -d
</CsOptions>

<CsInstruments>
; Phonehenge / Stockhausen (Studie II) tuning + chorused 5-osc voice
; Updates vs the previous schedule version:
;   - Adds "formal octave" transposition (period = 5) via p4 in the shared voice
;   - Keeps ONE shared tuning table + ONE shared synth voice as the source of truth
;   - Adds optional "chord per phone" wrapper instruments (101..125)

sr     = 44100
ksmps  = 32
nchnls = 2
0dbfs  = 1

; --- Voice allocation (raise if you use chord wrappers heavily) ---
maxalloc 100, 40
maxalloc 110, 10
; --- Shared tables (single source of truth) ---
giSine  ftgen 100, 0, 16384, 10, 1

; 25th root of 5 ratios used by Stockhausen in Studie II (1954)
; degree 0..24  => ratio = 5^(degree/25)  (the 25th step would be 5.0, not included here)
giScale ftgen 1, 0, 32, -2, \
  1.00000000, 1.06649494, 1.13741146, 1.21304357, 1.29370483, \
  1.37972966, 1.47147471, 1.56932033, 1.67367220, 1.78496293, \
  1.90365394, 2.03023730, 2.16523781, 2.30921517, 2.46276630, \
  2.62652780, 2.80117862, 2.98744283, 3.18609267, 3.39795172, \
  3.62389832, 3.86486923, 4.12186348, 4.39594656, 4.68825477

; chord degree offsets used in your example:
;   baseDeg + {0,4,9,15,24}  (with carry into the next formal octave when >= 25)
giChordOff ftgen 2, 0, 8, -2, 0, 4, 9, 15, 24

; --- Shared parameters exported as channels (so JS can tweak once) ---
gkBaseCps chnexport "baseCps", 1    ; base frequency for degree 0 (Hz)
gkAmpDbfs chnexport "ampDbfs", 1    ; amplitude in dBFS (negative, e.g. -18)
gkBend1   chnexport "bend1",   1    ; chorusing bend above (e.g. 100/99)
gkBend2   chnexport "bend2",   1    ; chorusing bend above (e.g.  99/98)

; --- Init defaults (override from JS via setControlChannel) ---
instr 900
  chnset cpspch(8.00), "baseCps"    ; C4 ≈ 261.626 Hz
  chnset -18,          "ampDbfs"    ; safe default loudness
  chnset 100/99,       "bend1"
  chnset 99/98,        "bend2"
endin

instr 901
  ; Set baseCps quickly from the score (Hz)
  ; Example: i 901 0 0.01 65.4064   ; C2 ≈ 65.4
  chnset p4, "baseCps"
endin

; --- The ONE shared synth voice (polyphonic) ---
; p4 = formal octave (… -1, 0, +1, …) where the repeat interval is 5:1
; p5 = scale degree (0..24) into giScale
instr 100
  iOct     = p4
  iDeg     = p5

  iBase    = chnget:i("baseCps")
  iAmp     = ampdbfs(chnget:i("ampDbfs"))

  ibend1   = chnget:i("bend1")
  ibend2   = chnget:i("bend2")

  iRatio   tablei iDeg, giScale

  ; formal-octave transposition: period = 5
  iTrans   pow 5, iOct

  ifreq    = iBase * iRatio * iTrans
  kfreq    = ifreq

  ; amplitude shaping over p3 (note duration)
  kover    linseg  0, p3*0.05, iAmp, p3*0.95, 0, 0.05, 0

  ; 5 amplitude envelopes (original structure preserved)
  k0       linen   kover, 0.01, p3, p3*0.9
  k1       linen   kover, 0.02, p3, p3*0.8
  k2       linen   kover, 0.03, p3, p3*0.7
  k3       linen   kover, 0.04, p3, p3*0.6
  k4       linen   kover, 0.05, p3, p3*0.5

  ; 4 frequency-shift envelopes for chorusing (a0 fixed, others drift)
  k5       linseg  ifreq, p3*0.5, (ifreq)*ibend1,     p3*0.4, ifreq
  k6       linseg  ifreq, p3*0.4, (ifreq)*ibend2,     p3*0.5, ifreq
  k7       linseg  ifreq, p3*0.3, (ifreq)*(2-ibend1), p3*0.6, ifreq
  k8       linseg  ifreq, p3*0.2, (ifreq)*(2-ibend2), p3*0.7, ifreq

  ; 5 oscillators
  a0       oscil   k0, kfreq, giSine
  a1       oscil   k1, k5,    giSine
  a2       oscil   k2, k6,    giSine
  a3       oscil   k3, k7,    giSine
  a4       oscil   k4, k8,    giSine

  ; moving stereo image (original mix preserved)
  asigL    = a0 + a1 + a4
  asigR    = a0 + a2 + a3

  ; outs replacement (explicit channel routing)
  outch    1, asigL, 2, asigR
endin

instr 110
  ; Same voice as instr 100, but frequency comes from cpsxpch
  ; (25 equal divisions of the repeat interval irepeat=5)
  iOct     = p4
  iDeg     = p5

  iBase    = chnget:i("baseCps")
  iAmp     = ampdbfs(chnget:i("ampDbfs"))

  ibend1   = chnget:i("bend1")
  ibend2   = chnget:i("bend2")

  ; pch-style pitch where integer part is the formal octave and
  ; decimal part is the scale degree (0..24) in hundredths.
  ipch     = iOct + (iDeg * 0.01)

  ifreq    cpsxpch ipch, 25, 5, iBase
  kfreq    = ifreq

  ; amplitude shaping over p3 (note duration)
  kover    linseg  0, p3*0.05, iAmp, p3*0.95, 0, 0.05, 0

  ; 5 amplitude envelopes (original structure preserved)
  k0       linen   kover, 0.01, p3, p3*0.9
  k1       linen   kover, 0.02, p3, p3*0.8
  k2       linen   kover, 0.03, p3, p3*0.7
  k3       linen   kover, 0.04, p3, p3*0.6
  k4       linen   kover, 0.05, p3, p3*0.5

  ; 4 frequency-shift envelopes for chorusing (a0 fixed, others drift)
  k5       linseg  ifreq, p3*0.5, (ifreq)*ibend1,     p3*0.4, ifreq
  k6       linseg  ifreq, p3*0.4, (ifreq)*ibend2,     p3*0.5, ifreq
  k7       linseg  ifreq, p3*0.3, (ifreq)*(2-ibend1), p3*0.6, ifreq
  k8       linseg  ifreq, p3*0.2, (ifreq)*(2-ibend2), p3*0.7, ifreq

  ; 5 oscillators
  a0       oscil   k0, kfreq, giSine
  a1       oscil   k1, k5,    giSine
  a2       oscil   k2, k6,    giSine
  a3       oscil   k3, k7,    giSine
  a4       oscil   k4, k8,    giSine

  ; moving stereo image (original mix preserved)
  asigL    = a0 + a1 + a4
  asigR    = a0 + a2 + a3

  ; outs replacement (explicit channel routing)
  outch    1, asigL, 2, asigR
endin

; --- Chord scheduler (runs briefly, schedules voices, then turns off) ---
; p4 = note duration for each scheduled voice
; p5 = base formal octave (… -1, 0, +1, …)
; p6 = base degree (0..24)
; p7 = number of notes (1..5). If 0/omitted, defaults to 5.
; p8 = mode:
;        0 = chord offsets from giChordOff: {0,4,9,15,24} (with carry into next formal octave)
;        1 = "formal octave doubling": two notes, same degree at oct and oct+1 (×5)
instr 210
  iNoteDur = p4
  iBaseOct = p5
  iBaseDeg = p6

  iN  = int(p7)
  if (iN <= 0) then
    iN = 5
  endif
  if (iN > 5) then
    iN = 5
  endif

  iMode = int(p8)

  if (iMode == 1) then
    ; formal-octave doubling (2 notes: oct, oct+1)
    schedule 110, 0, iNoteDur, iBaseOct,     iBaseDeg
    schedule 110, 0, iNoteDur, iBaseOct + 1, iBaseDeg
  else
    ; chord offsets (subset of first iN entries)
    iIdx = 0
    while (iIdx < iN) do
      iOff     tablei iIdx, giChordOff
      iDegSum  = iBaseDeg + iOff

      ; carry into the next formal octave when we cross the 25-step boundary
      iCarry   = int(iDegSum / 25)
      iDeg     = iDegSum - (iCarry * 25)
      iOct     = iBaseOct + iCarry

      schedule 110, 0, iNoteDur, iOct, iDeg
      iIdx += 1
    od
  endif

  turnoff
endin

; --- 25 single-note "phone" instruments (1..25) ---
; Call from JS with:  i <phoneInstr> 0 <dur> <oct>
; where <oct> is the formal-octave transposition in powers of 5.
instr 1   ; phone 1 -> base degree 0
  ; Call from JS:
  ;   i 1 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 0, p5, p6
  turnoff
endin
instr 2   ; phone 2 -> base degree 1
  ; Call from JS:
  ;   i 2 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 1, p5, p6
  turnoff
endin
instr 3   ; phone 3 -> base degree 2
  ; Call from JS:
  ;   i 3 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 2, p5, p6
  turnoff
endin
instr 4   ; phone 4 -> base degree 3
  ; Call from JS:
  ;   i 4 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 3, p5, p6
  turnoff
endin
instr 5   ; phone 5 -> base degree 4
  ; Call from JS:
  ;   i 5 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 4, p5, p6
  turnoff
endin
instr 6   ; phone 6 -> base degree 5
  ; Call from JS:
  ;   i 6 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 5, p5, p6
  turnoff
endin
instr 7   ; phone 7 -> base degree 6
  ; Call from JS:
  ;   i 7 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 6, p5, p6
  turnoff
endin
instr 8   ; phone 8 -> base degree 7
  ; Call from JS:
  ;   i 8 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 7, p5, p6
  turnoff
endin
instr 9   ; phone 9 -> base degree 8
  ; Call from JS:
  ;   i 9 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 8, p5, p6
  turnoff
endin
instr 10   ; phone 10 -> base degree 9
  ; Call from JS:
  ;   i 10 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 9, p5, p6
  turnoff
endin
instr 11   ; phone 11 -> base degree 10
  ; Call from JS:
  ;   i 11 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 10, p5, p6
  turnoff
endin
instr 12   ; phone 12 -> base degree 11
  ; Call from JS:
  ;   i 12 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 11, p5, p6
  turnoff
endin
instr 13   ; phone 13 -> base degree 12
  ; Call from JS:
  ;   i 13 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 12, p5, p6
  turnoff
endin
instr 14   ; phone 14 -> base degree 13
  ; Call from JS:
  ;   i 14 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 13, p5, p6
  turnoff
endin
instr 15   ; phone 15 -> base degree 14
  ; Call from JS:
  ;   i 15 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 14, p5, p6
  turnoff
endin
instr 16   ; phone 16 -> base degree 15
  ; Call from JS:
  ;   i 16 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 15, p5, p6
  turnoff
endin
instr 17   ; phone 17 -> base degree 16
  ; Call from JS:
  ;   i 17 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 16, p5, p6
  turnoff
endin
instr 18   ; phone 18 -> base degree 17
  ; Call from JS:
  ;   i 18 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 17, p5, p6
  turnoff
endin
instr 19   ; phone 19 -> base degree 18
  ; Call from JS:
  ;   i 19 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 18, p5, p6
  turnoff
endin
instr 20   ; phone 20 -> base degree 19
  ; Call from JS:
  ;   i 20 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 19, p5, p6
  turnoff
endin
instr 21   ; phone 21 -> base degree 20
  ; Call from JS:
  ;   i 21 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 20, p5, p6
  turnoff
endin
instr 22   ; phone 22 -> base degree 21
  ; Call from JS:
  ;   i 22 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 21, p5, p6
  turnoff
endin
instr 23   ; phone 23 -> base degree 22
  ; Call from JS:
  ;   i 23 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 22, p5, p6
  turnoff
endin
instr 24   ; phone 24 -> base degree 23
  ; Call from JS:
  ;   i 24 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 23, p5, p6
  turnoff
endin
instr 25   ; phone 25 -> base degree 24
  ; Call from JS:
  ;   i 25 0 <dur> <formalOct=0> <nNotes=5> <mode=0>
  ; mode 0 = chord offsets, mode 1 = formal-octave doubling
  schedule 210, 0, 0.01, p3, p4, 24, p5, p6
  turnoff
endin

; --- Optional: one-tap 5-note chord builder (instr 200) ---
; p4 = base formal octave
; p5 = base degree (0..24) which corresponds to the sprite you tapped
;
; It schedules FIVE instances of instr 100 with the offset pattern {0,4,9,15,24}.
; Any notes that exceed degree 24 are wrapped (mod 25) AND carried into the next formal octave.
instr 200
  iBaseOct = p4
  iBaseDeg = p5

  iIdx = 0
  while (iIdx < 5) do
    iOff     tablei iIdx, giChordOff
    iDegSum  = iBaseDeg + iOff

    ; carry into the next formal octave when we cross the 25-step boundary
    iCarry   = int(iDegSum / 25)
    iDeg     = iDegSum - (iCarry * 25)
    iOct     = iBaseOct + iCarry

    schedule 100, 0, p3, iOct, iDeg
    iIdx += 1
  od
endin

; --- Optional: 25 chord-wrappers (101..125) mirroring phones (1..25) ---
; Call from JS with: i <101..125> 0 <dur> <baseOct>
; Example: i 101 0 2 0  => chord rooted at degree 0 (sprite 1), base formal octave 0
instr 101
  schedule 200, 0, p3, p4, 0
endin
instr 102
  schedule 200, 0, p3, p4, 1
endin
instr 103
  schedule 200, 0, p3, p4, 2
endin
instr 104
  schedule 200, 0, p3, p4, 3
endin
instr 105
  schedule 200, 0, p3, p4, 4
endin
instr 106
  schedule 200, 0, p3, p4, 5
endin
instr 107
  schedule 200, 0, p3, p4, 6
endin
instr 108
  schedule 200, 0, p3, p4, 7
endin
instr 109
  schedule 200, 0, p3, p4, 8
endin
instr 110
  schedule 200, 0, p3, p4, 9
endin
instr 111
  schedule 200, 0, p3, p4, 10
endin
instr 112
  schedule 200, 0, p3, p4, 11
endin
instr 113
  schedule 200, 0, p3, p4, 12
endin
instr 114
  schedule 200, 0, p3, p4, 13
endin
instr 115
  schedule 200, 0, p3, p4, 14
endin
instr 116
  schedule 200, 0, p3, p4, 15
endin
instr 117
  schedule 200, 0, p3, p4, 16
endin
instr 118
  schedule 200, 0, p3, p4, 17
endin
instr 119
  schedule 200, 0, p3, p4, 18
endin
instr 120
  schedule 200, 0, p3, p4, 19
endin
instr 121
  schedule 200, 0, p3, p4, 20
endin
instr 122
  schedule 200, 0, p3, p4, 21
endin
instr 123
  schedule 200, 0, p3, p4, 22
endin
instr 124
  schedule 200, 0, p3, p4, 23
endin
instr 125
  schedule 200, 0, p3, p4, 24
endin

; --- Single-degree wrappers using cpsxpch (instr 110) ---
instr 201
  ; sprite degree 0 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 0
endin

instr 202
  ; sprite degree 1 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 1
endin

instr 203
  ; sprite degree 2 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 2
endin

instr 204
  ; sprite degree 3 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 3
endin

instr 205
  ; sprite degree 4 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 4
endin

instr 206
  ; sprite degree 5 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 5
endin

instr 207
  ; sprite degree 6 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 6
endin

instr 208
  ; sprite degree 7 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 7
endin

instr 209
  ; sprite degree 8 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 8
endin

instr 210
  ; sprite degree 9 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 9
endin

instr 211
  ; sprite degree 10 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 10
endin

instr 212
  ; sprite degree 11 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 11
endin

instr 213
  ; sprite degree 12 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 12
endin

instr 214
  ; sprite degree 13 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 13
endin

instr 215
  ; sprite degree 14 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 14
endin

instr 216
  ; sprite degree 15 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 15
endin

instr 217
  ; sprite degree 16 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 16
endin

instr 218
  ; sprite degree 17 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 17
endin

instr 219
  ; sprite degree 18 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 18
endin

instr 220
  ; sprite degree 19 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 19
endin

instr 221
  ; sprite degree 20 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 20
endin

instr 222
  ; sprite degree 21 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 21
endin

instr 223
  ; sprite degree 22 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 22
endin

instr 224
  ; sprite degree 23 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 23
endin

instr 225
  ; sprite degree 24 via cpsxpch (instr 110)
  schedule 110, 0, p3, p4, 24
endin

</CsInstruments>

<CsScore>
; keep Csound alive (helpful for Csound WASM/JS hosting)
f 0 3600

; init defaults
i 900 0 0.01

; --- Test A: your original 5-note chord in base formal octave (oct=0)
i 1  0 6  0
i 5  0 6  0
i 10 0 6  0
i 16 0 6  0
i 25 0 6  0

; --- Test B: same degrees, but one formal octave above (multiply freqs by 5)
i 1  7 6  1
i 5  7 6  1
i 10 7 6  1
i 16 7 6  1
i 25 7 6  1

; --- Test C: one-tap chord rooted at sprite 24 (degree 23) that crosses the boundary:
; notes that would wrap past degree 24 are carried into the next formal octave automatically.
i 124 14 6 0

;
; ============================================================
; Extra tests: 25-step scale run (tablei vs cpsxpch)
;
; NOTE about formal octave = 5:
;   oct=0 spans ratios 5^(0/25) .. 5^(24/25).
;   The next step after degree 24 is degree 0 at oct=1 (×5).
;
; --- Test D (arpeggiated): your 5 chord degrees, oct=0
; i 1  0 9 0
; i 5  1 8 0
; i 10 2 7 0
; i 16 3 6 0
; i 25 4 5 0
;
; --- Test E (arpeggiated): same degrees, oct=1 (×5)
; i 1  10 9 1
; i 5  11 8 1
; i 10 12 7 1
; i 16 13 6 1
; i 25 14 5 1
;
; --- Test F (arpeggiated): same degrees, oct=2 (×25)
; ; Many degrees will end up above ~20 kHz with baseCps=C4.
; ; For audibility, drop baseCps first, e.g. to C2:
; ; i 901 19.9 0.01 65.4064    ; baseCps = cpspch(6.00) ≈ 65.4 Hz
; ; i 1  20 9 2
; ; i 5  21 8 2
; ; i 10 22 7 2
; ; i 16 23 6 2
; ; i 25 24 5 2
;
; --- Test G: all 25 degrees in sequence using tablei/pow (instr 1..25)
; ; (matches your proposed score: 1 second apart, 2 sec duration -> overlaps)
; ; i 1   0   2 0
; ; i 2   1   . .
; ; i 3   2   . .
; ; i 4   3   . .
; ; i 5   4   . .
; ; i 6   5   . .
; ; i 7   6   . .
; ; i 8   7   . .
; ; i 9   8   . .
; ; i 10  9   . .
; ; i 11  10  . .
; ; i 12  11  . .
; ; i 13  12  . .
; ; i 14  13  . .
; ; i 15  14  . .
; ; i 16  15  . .
; ; i 17  16  . .
; ; i 18  17  . .
; ; i 19  18  . .
; ; i 20  19  . .
; ; i 21  20  . .
; ; i 22  21  . .
; ; i 23  22  . .
; ; i 24  23  . .
; ; i 25  24  . .
;
; --- Test H: all 25 degrees in sequence using cpsxpch (instr 201..225)
; ; Same pattern, but swap instrument numbers:
; ; i 201  30 2 0
; ; i 202  31 . .
; ; ...
; ; i 225  54 . .
;
; ============================================================
e
</CsScore>

</CsoundSynthesizer>