<CsoundSynthesizer>
<CsOptions>
-odac -d
</CsOptions>

<CsInstruments>
; Phonehenge / Stockhausen (Studie II) tuning + chorused 5-osc voice
; Reworked to:
;   - Use a single, shared tuning table (25th root of 5 ratios)
;   - Use schedule() to fan out 25 "phone" instruments to ONE shared voice instrument
;   - Avoid outs by routing audio with outch

sr     = 44100
ksmps  = 32
nchnls = 2
0dbfs  = 1

; --- Shared tables (single source of truth) ---
giSine  ftgen 100, 0, 16384, 10, 1

; 25th root of 5 ratios used by Stockhausen in Studie II (1954)
; degree 0..24  => ratio = 5^(degree/25)  (last step would be 5.0, not included here)
giScale ftgen 1, 0, 32, -2, 1.00000000, 1.06649494, 1.13741146, 1.21304357, 1.29370483, 1.37972966, 1.47147471, 1.56932033, 1.67367220, 1.78496293, 1.90365394, 2.03023730, 2.16523781, 2.30921517, 2.46276630, 2.62652780, 2.80117862, 2.98744283, 3.18609267, 3.39795172, 3.62389832, 3.86486923, 4.12186348, 4.39594656, 4.68825477

; --- Shared parameters exported as channels (so JS can tweak once) ---
gkBaseCps chnexport "baseCps", 1    ; base frequency for degree 0 (Hz)
gkAmpDbfs chnexport "ampDbfs", 1    ; amplitude in dBFS (negative, e.g. -18)
gkBend1   chnexport "bend1",   1    ; chorusing bend above (e.g. 100/99)
gkBend2   chnexport "bend2",   1    ; chorusing bend above (e.g.  99/98)

; --- Init defaults (you can override from JS via setControlChannel) ---
instr 900
  chnset cpspch(8.00), "baseCps"    ; C4 ≈ 261.626 Hz
  chnset -18,          "ampDbfs"    ; safe default loudness
  chnset 100/99,       "bend1"
  chnset 99/98,        "bend2"
endin

; --- The ONE shared synth voice (polyphonic) ---
; p4 = scale degree (0..24)
instr 100
  iDeg     = p4
  iBase    = chnget:i("baseCps")
  iAmp     = ampdbfs(chnget:i("ampDbfs"))

  ibend1   = chnget:i("bend1")
  ibend2   = chnget:i("bend2")

  iRatio   tablei iDeg, giScale
  ifreq    = iBase * iRatio
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

  ; "outs" alternative (explicit channel routing)
  outch    1, asigL, 2, asigR
endin

; --- 25 dedicated "phone" instruments ---
; Each schedules the shared voice (instr 100) with its own fixed degree.
; Call from JS with:  i <phoneInstr> 0 <dur>

instr 1   ; phone 1 -> degree 0
  schedule 100, 0, p3, 0
endin
instr 2   ; degree 1
  schedule 100, 0, p3, 1
endin
instr 3
  schedule 100, 0, p3, 2
endin
instr 4
  schedule 100, 0, p3, 3
endin
instr 5
  schedule 100, 0, p3, 4
endin
instr 6
  schedule 100, 0, p3, 5
endin
instr 7
  schedule 100, 0, p3, 6
endin
instr 8
  schedule 100, 0, p3, 7
endin
instr 9
  schedule 100, 0, p3, 8
endin
instr 10
  schedule 100, 0, p3, 9
endin
instr 11
  schedule 100, 0, p3, 10
endin
instr 12
  schedule 100, 0, p3, 11
endin
instr 13
  schedule 100, 0, p3, 12
endin
instr 14
  schedule 100, 0, p3, 13
endin
instr 15
  schedule 100, 0, p3, 14
endin
instr 16
  schedule 100, 0, p3, 15
endin
instr 17
  schedule 100, 0, p3, 16
endin
instr 18
  schedule 100, 0, p3, 17
endin
instr 19
  schedule 100, 0, p3, 18
endin
instr 20
  schedule 100, 0, p3, 19
endin
instr 21
  schedule 100, 0, p3, 20
endin
instr 22
  schedule 100, 0, p3, 21
endin
instr 23
  schedule 100, 0, p3, 22
endin
instr 24
  schedule 100, 0, p3, 23
endin
instr 25
  schedule 100, 0, p3, 24
endin

; Limit polyphony for the shared voice to 10 overlapping notes
maxalloc 100, 10

</CsInstruments>

<CsScore>
; keep Csound alive (helpful for Csound WASM/JS hosting)
f 0 3600

; init defaults
i 900 0 0.01

; quick test chord: 5 notes, 24 seconds (similar to your original score)
i 1  0 24
i 5  0 24
i 10 0 24
i 16 0 24
i 25 0 24
e
</CsScore>
</CsoundSynthesizer>
