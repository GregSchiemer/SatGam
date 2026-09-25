; Phonehenge / Stockhausen (Studie II) — cpsxpch version (for web app)
sr     = 44100
ksmps  = 32
nchnls = 2
0dbfs  = 1

; voice polyphony (how many overlapping voices instr 110 can play)
maxalloc 110, 40

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

  iN  = 1
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
; Phone instruments 1..25
; JS i-statement: i <1..25> 0 dur formalOct nNotes mode
; schedule 210 args: voiceDur baseOct baseDeg nNotes mode
; ------------------------------------------

instr 1   ; degree 0
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 0,  iNNotes, iMode
  turnoff
endin

instr 2   ; degree 1
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 1,  iNNotes, iMode
  turnoff
endin

instr 3   ; degree 2
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 2,  iNNotes, iMode
  turnoff
endin

instr 4   ; degree 3
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 3,  iNNotes, iMode
  turnoff
endin

instr 5   ; degree 4
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 4,  iNNotes, iMode
  turnoff
endin

instr 6   ; degree 5
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 5,  iNNotes, iMode
  turnoff
endin

instr 7   ; degree 6
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 6,  iNNotes, iMode
  turnoff
endin

instr 8   ; degree 7
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 7,  iNNotes, iMode
  turnoff
endin

instr 9   ; degree 8
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 8,  iNNotes, iMode
  turnoff
endin

instr 10  ; degree 9
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 9,  iNNotes, iMode
  turnoff
endin

instr 11  ; degree 10
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 10, iNNotes, iMode
  turnoff
endin

instr 12  ; degree 11
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 11, iNNotes, iMode
  turnoff
endin

instr 13  ; degree 12
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 12, iNNotes, iMode
  turnoff
endin

instr 14  ; degree 13
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 13, iNNotes, iMode
  turnoff
endin

instr 15  ; degree 14
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 14, iNNotes, iMode
  turnoff
endin

instr 16  ; degree 15
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 15, iNNotes, iMode
  turnoff
endin

instr 17  ; degree 16
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 16, iNNotes, iMode
  turnoff
endin

instr 18  ; degree 17
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 17, iNNotes, iMode
  turnoff
endin

instr 19  ; degree 18
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 18, iNNotes, iMode
  turnoff
endin

instr 20  ; degree 19
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 19, iNNotes, iMode
  turnoff
endin

instr 21  ; degree 20
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 20, iNNotes, iMode
  turnoff
endin

instr 22  ; degree 21
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 21, iNNotes, iMode
  turnoff
endin

instr 23  ; degree 22
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 22, iNNotes, iMode
  turnoff
endin

instr 24  ; degree 23
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 23, iNNotes, iMode
  turnoff
endin

instr 25  ; degree 24
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  schedule 210, 0, 0.01, iVoiceDur, iBaseOct, 24, iNNotes, iMode
  turnoff
endin
