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

; PREVIEW melodic voices
maxalloc 111, 2

; CONCERT chord voices
maxalloc 115, 40
giSine  ftgen 100, 0, 16384, 10, 1

; 25th root of 5 ratios (used only if you want the tablei voice later)
giScale ftgen 1, 0, 32, -2, \
  1.00000000, 1.06649494, 1.13741146, 1.21304357, 1.29370483, \
  1.37972966, 1.47147471, 1.56932033, 1.67367220, 1.78496293, \
  1.90365394, 2.03023730, 2.16523781, 2.30921517, 2.46276630, \
  2.62652780, 2.80117862, 2.98744283, 3.18609267, 3.39795172, \
  3.62389832, 3.86486923, 4.12186348, 4.39594656, 4.68825477

; chord degree offsets
giChordOff ftgen 2, 0, 8, -2, 0, 4, 9, 15, 24

; shared params (JS can tweak)
gkBaseCps chnexport "baseCps", 1
gkAmpDbfs chnexport "ampDbfs", 1
gkBend1   chnexport "bend1",   1
gkBend2   chnexport "bend2",   1

instr 900
  chnset cpspch(8.00), "baseCps"
  chnset -18,          "ampDbfs"
  chnset 100/99,       "bend1"
  chnset 99/98,        "bend2"
endin

instr 901
  chnset p4, "baseCps"
endin

instr 902
  iBase = chnget:i("baseCps")
  printf_i "baseCps = %f Hz\n", 1, iBase
  schedule 110, 0, p3, 0, 0
  turnoff
endin

; ------------------------------------------
; Shared cpsxpch voice
; p4 = formalOct
; p5 = degree 0..24
; ------------------------------------------
instr 110
  iOct   = p4
  iDeg   = p5

  iBase  = chnget:i("baseCps")
  iAmp   = ampdbfs(chnget:i("ampDbfs"))
  ibend1 = chnget:i("bend1")
  ibend2 = chnget:i("bend2")

  ipch   = iOct + (iDeg * 0.01)
  ifreq  cpsxpch ipch, 25, 5, iBase
  kfreq  = ifreq

  kover  linseg  0, p3*0.05, iAmp, p3*0.95, 0, 0.05, 0

  k0     linen   kover, 0.01, p3, p3*0.9
  k1     linen   kover, 0.02, p3, p3*0.8
  k2     linen   kover, 0.03, p3, p3*0.7
  k3     linen   kover, 0.04, p3, p3*0.6
  k4     linen   kover, 0.05, p3, p3*0.5

  k5     linseg  ifreq, p3*0.5, (ifreq)*ibend1,     p3*0.4, ifreq
  k6     linseg  ifreq, p3*0.4, (ifreq)*ibend2,     p3*0.5, ifreq
  k7     linseg  ifreq, p3*0.3, (ifreq)*(2-ibend1), p3*0.6, ifreq
  k8     linseg  ifreq, p3*0.2, (ifreq)*(2-ibend2), p3*0.7, ifreq

  a0     oscil   k0, kfreq, giSine
  a1     oscil   k1, k5,    giSine
  a2     oscil   k2, k6,    giSine
  a3     oscil   k3, k7,    giSine
  a4     oscil   k4, k8,    giSine

  asigL  = a0 + a1 + a4
  asigR  = a0 + a2 + a3

  outch  1, asigL, 2, asigR
endin

; ------------------------------------------
; PREVIEW melodic voice
; ------------------------------------------
instr 111
  iOct   = p4
  iDeg   = p5

  iBase  = chnget:i("baseCps")
  iAmp   = ampdbfs(chnget:i("ampDbfs"))
  ibend1 = chnget:i("bend1")
  ibend2 = chnget:i("bend2")

  ipch   = iOct + (iDeg * 0.01)
  ifreq  cpsxpch ipch, 25, 5, iBase
  kfreq  = ifreq

  kover  linseg  0, p3*0.05, iAmp, p3*0.95, 0, 0.05, 0

  k0     linen   kover, 0.01, p3, p3*0.9
  k1     linen   kover, 0.02, p3, p3*0.8
  k2     linen   kover, 0.03, p3, p3*0.7
  k3     linen   kover, 0.04, p3, p3*0.6
  k4     linen   kover, 0.05, p3, p3*0.5

  k5     linseg  ifreq, p3*0.5, (ifreq)*ibend1,     p3*0.4, ifreq
  k6     linseg  ifreq, p3*0.4, (ifreq)*ibend2,     p3*0.5, ifreq
  k7     linseg  ifreq, p3*0.3, (ifreq)*(2-ibend1), p3*0.6, ifreq
  k8     linseg  ifreq, p3*0.2, (ifreq)*(2-ibend2), p3*0.7, ifreq

  a0     oscil   k0, kfreq, giSine
  a1     oscil   k1, k5,    giSine
  a2     oscil   k2, k6,    giSine
  a3     oscil   k3, k7,    giSine
  a4     oscil   k4, k8,    giSine

  asigL  = a0 + a1 + a4
  asigR  = a0 + a2 + a3

  outch  1, asigL, 2, asigR
endin

; ------------------------------------------
; CONCERT chord voice
; ------------------------------------------
instr 115
  iOct   = p4
  iDeg   = p5

  iBase  = chnget:i("baseCps")
  iAmp   = ampdbfs(chnget:i("ampDbfs"))
  ibend1 = chnget:i("bend1")
  ibend2 = chnget:i("bend2")

  ipch   = iOct + (iDeg * 0.01)
  ifreq  cpsxpch ipch, 25, 5, iBase
  kfreq  = ifreq

  kover  linseg  0, p3*0.05, iAmp, p3*0.95, 0, 0.05, 0

  k0     linen   kover, 0.01, p3, p3*0.9
  k1     linen   kover, 0.02, p3, p3*0.8
  k2     linen   kover, 0.03, p3, p3*0.7
  k3     linen   kover, 0.04, p3, p3*0.6
  k4     linen   kover, 0.05, p3, p3*0.5

  k5     linseg  ifreq, p3*0.5, (ifreq)*ibend1,     p3*0.4, ifreq
  k6     linseg  ifreq, p3*0.4, (ifreq)*ibend2,     p3*0.5, ifreq
  k7     linseg  ifreq, p3*0.3, (ifreq)*(2-ibend1), p3*0.6, ifreq
  k8     linseg  ifreq, p3*0.2, (ifreq)*(2-ibend2), p3*0.7, ifreq

  a0     oscil   k0, kfreq, giSine
  a1     oscil   k1, k5,    giSine
  a2     oscil   k2, k6,    giSine
  a3     oscil   k3, k7,    giSine
  a4     oscil   k4, k8,    giSine

  asigL  = a0 + a1 + a4
  asigR  = a0 + a2 + a3

  outch  1, asigL, 2, asigR
endin

; ------------------------------------------
; Chord scheduler
; p4 = voiceDur
; p5 = baseOct
; p6 = baseDeg
; p7 = nNotes (1..5)
; p8 = mode (0 chord offsets, 1 formal-oct doubling)
; ------------------------------------------
instr 210
  iVoiceDur = p4
  iBaseOct  = p5
  iBaseDeg  = p6

  iN  = int(p7)
  if (iN <= 0) then
    iN = 5
  endif
  if (iN > 5) then
    iN = 5
  endif

  iMode = int(p8)

  if (iMode == 1) then
    schedule 110, 0, iVoiceDur, iBaseOct,     iBaseDeg
    schedule 110, 0, iVoiceDur, iBaseOct + 1, iBaseDeg
  else
    iIdx = 0
    while (iIdx < iN) do
      iOff    tablei iIdx, giChordOff
      iSum    = iBaseDeg + iOff
      iCarry  = int(iSum / 25)
      iDeg    = iSum - (iCarry * 25)
      iOct    = iBaseOct + iCarry
      schedule 110, 0, iVoiceDur, iOct, iDeg
      iIdx += 1
    od
  endif

  turnoff
endin

; ------------------------------------------
; PREVIEW single-note scheduler
;
; p4 = voice duration
; p5 = octave
; p6 = scale degree
; ------------------------------------------
instr 211
  iVoiceDur = p4
  iOct      = p5
  iDeg      = p6

  schedule 111, 0, iVoiceDur, iOct, iDeg

  turnoff
endin

; ------------------------------------------
; Chord scheduler
; p4 = voiceDur
; p5 = baseOct
; p6 = baseDeg
; p7 = nNotes (1..5)
; p8 = mode (0 chord offsets, 1 formal-oct doubling)
; ------------------------------------------
instr 215
  iVoiceDur = p4
  iBaseOct  = p5
  iBaseDeg  = p6

  iN  = 1 ; int(p7)
  if (iN <= 0) then
    iN = 5
  endif
  if (iN > 5) then
    iN = 5
  endif

  iMode = int(p8)

  if (iMode == 1) then
    schedule 115, 0, iVoiceDur, iBaseOct,     iBaseDeg
    schedule 115, 0, iVoiceDur, iBaseOct + 1, iBaseDeg
  else
    iIdx = 0
    while (iIdx < iN) do
      iOff    tablei iIdx, giChordOff
      iSum    = iBaseDeg + iOff
      iCarry  = int(iSum / 25)
      iDeg    = iSum - (iCarry * 25)
      iOct    = iBaseOct + iCarry
      schedule 115, 0, iVoiceDur, iOct, iDeg
      iIdx += 1
    od
  endif

  turnoff
endin

; ------------------------------------------------------------
; Phone wrapper score-message format
;
; Call:
; i <1..25> 0 <dur> <formalOct> <nNotes> <chordMode> <appMode>
;
; p3 = voice duration
; p4 = formal octave
; p5 = number of Concert notes
; p6 = Concert chord-layout mode
; p7 = application mode: 1 PREVIEW, 5 CONCERT
; ------------------------------------------------------------

instr 1
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 0
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 0, p5, p6
  else 
    prints "ERROR instr 1: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 2
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 1
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 1, p5, p6
  else
    prints "ERROR instr 2: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 3
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 2
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 2, p5, p6
  else
    prints "ERROR instr 3: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 4
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 3
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 3, p5, p6
  else
    prints "ERROR instr 4: invalid appMode=%d\n", iMode
  endif


  turnoff
endin

instr 5
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 4
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 4, p5, p6
  else
    prints "ERROR instr 5: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 6
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic not5
    schedule 211, 0, 0.01, p3, p4, 5
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 5, p5, p6
  else
    prints "ERROR instr 6: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 7
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 6
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 6, p5, p6
  else
    prints "ERROR instr 7: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 8
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 7
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 7, p5, p6
  else
    prints "ERROR instr 8: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 9
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 8
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 8, p5, p6
  else
    prints "ERROR instr 9: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 10
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 9
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 9, p5, p6
  else
    prints "ERROR instr 10: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 11
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 10
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 10, p5, p6
  else
    prints "ERROR instr 11: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 12
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 11
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 11, p5, p6
  else
    prints "ERROR instr 12: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 13
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 12
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 12, p5, p6
  else
    prints "ERROR instr 13: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 14
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 13
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 13, p5, p6
  else
    prints "ERROR instr 14: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 15
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 14
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 14, p5, p6    
  else
    prints "ERROR instr 15: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 16
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 15
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 15, p5, p6
  else
    prints "ERROR instr 16: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 17
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 16
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 16, p5, p6
  else 
    prints "ERROR instr 17: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 18
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 17
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 17, p5, p6
  else
    prints "ERROR instr 18: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 19
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 18
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 18, p5, p6
  else
    prints "ERROR instr 19: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 20
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 19
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 19, p5, p6
  else
    prints "ERROR instr 20: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 21
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 20
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 20, p5, p6
  else
    prints "ERROR instr 21: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 22
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 21
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 21, p5, p6
  else
    prints "ERROR instr 22: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 23
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 22
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 22, p5, p6
  else
    prints "ERROR instr 23: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 24
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 23
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 23, p5, p6
  else
    prints "ERROR instr 24: invalid appMode=%d\n", iMode
  endif

  turnoff
endin

instr 25
  iMode = int(p7)

  if (iMode == 1) then
    ; PREVIEW: one melodic note
    schedule 211, 0, 0.01, p3, p4, 24
  elseif (iMode == 5) then
    ; CONCERT: chordal timbre
    schedule 215, 0, 0.01, p3, p4, 24, p5, p6
  else
    prints "ERROR instr 25: invalid appMode=%d\n", iMode
  endif

  turnoff
endin
</CsInstruments>
<CsScore>
</CsScore>

