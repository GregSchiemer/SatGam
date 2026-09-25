; Phonehenge / Stockhausen (Studie II) — cpsxpch version (for web app)
; copy of phonehenge.orc > phonehenge-09082026.orc > phonehenge-voicings.orc

sr     = 44100
ksmps  = 32
nchnls = 2
0dbfs  = 1

; voice polyphony (how many overlapping voices instr 110 can play)
maxalloc 110, 40
maxalloc 111, 40
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
  chnset 0, "previewNoteGeneration"
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
; PREVIEW melodic voice
;
; One chorused melodic voice.
; When a newer Preview note begins, this
; voice fades while the new voice enters.
;
; p4 = formalOct
; p5 = degree 0..24
; p6 = Preview note generation
; ------------------------------------------
instr 111
  iOct        = p4
  iDeg        = p5
  iGeneration = p6

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

  ; New-note replacement only.
  ; Tune this by ear between about 0.5 and 1.2 seconds.
  iReplaceFade = 0.8

  kCurrentGeneration chnget "previewNoteGeneration"

  kReplacing    init 0
  kReplaceStart init 0
  kReplaceGain  init 1

  kNow timeinsts

  if (kReplacing == 0 && kCurrentGeneration != iGeneration) then
    kReplacing = 1
    kReplaceStart = kNow
  endif

  if (kReplacing == 1) then
    kReplaceGain = 1 - ((kNow - kReplaceStart) / iReplaceFade)

    if (kReplaceGain <= 0) then
      turnoff
    endif
  endif

  outch 1, asigL * kReplaceGain, 2, asigR * kReplaceGain
endin


; ------------------------------------------
; CONCERT voice
; Temporary copy of instr 110.
; Audible behaviour intentionally unchanged.
; p4 = formalOct
; p5 = degree 0..24
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
; PREVIEW scheduler
;
; Each tap advances the Preview note
; generation and starts exactly one
; melodic instr 111.
;
; p4 = voiceDur
; p5 = baseOct
; p6 = baseDeg
; ------------------------------------------
instr 211
  iVoiceDur = p4
  iBaseOct  = p5
  iBaseDeg  = p6

  iGeneration = chnget:i("previewNoteGeneration") + 1
  chnset iGeneration, "previewNoteGeneration"

  schedule 111, 0, iVoiceDur, iBaseOct, iBaseDeg, iGeneration

  turnoff
endin


; ------------------------------------------
; PREVIEW release control
;
; Advances the Preview note generation
; without starting a new note.
;
; The current instr 111 therefore enters
; the same fade used for note replacement.
; ------------------------------------------
instr 212
  iGeneration = chnget:i("previewNoteGeneration") + 1
  chnset iGeneration, "previewNoteGeneration"

  turnoff
endin


; ------------------------------------------
; CONCERT scheduler
; Schedules CONCERT voice instr 115

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

  iN = int(p7)
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
      iOff   tablei iIdx, giChordOff
      iSum   = iBaseDeg + iOff
      iCarry = int(iSum / 25)
      iDeg   = iSum - (iCarry * 25)
      iOct   = iBaseOct + iCarry

      schedule 115, 0, iVoiceDur, iOct, iDeg

      iIdx += 1
    od
  endif

  turnoff
endin


; ------------------------------------------
; Phone instruments 1..25
;
; JS i-statement:
; i <1..25> 0 dur formalOct nNotes chordMode appMode
;
; p3 = voiceDur
; p4 = formalOct
; p5 = nNotes
; p6 = chordMode
; p7 = appMode
;
; appMode 1 = PREVIEW -> instr 211
; appMode 5 = CONCERT -> instr 215
; ------------------------------------------

instr 1   ; degree 0
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 0, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 0, iNNotes, iMode
  else
    printf_i "ERROR: instr 1 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 2   ; degree 1
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 1, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 1, iNNotes, iMode
  else
    printf_i "ERROR: instr 2 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 3   ; degree 2
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 2, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 2, iNNotes, iMode
  else
    printf_i "ERROR: instr 3 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 4   ; degree 3
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 3, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 3, iNNotes, iMode
  else
    printf_i "ERROR: instr 4 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 5   ; degree 4
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 4, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 4, iNNotes, iMode
  else
    printf_i "ERROR: instr 5 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 6   ; degree 5
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 5, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 5, iNNotes, iMode
  else
    printf_i "ERROR: instr 6 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 7   ; degree 6
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 6, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 6, iNNotes, iMode
  else
    printf_i "ERROR: instr 7 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 8   ; degree 7
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 7, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 7, iNNotes, iMode
  else
    printf_i "ERROR: instr 8 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 9   ; degree 8
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 8, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 8, iNNotes, iMode
  else
    printf_i "ERROR: instr 9 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 10  ; degree 9
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 9, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 9, iNNotes, iMode
  else
    printf_i "ERROR: instr 10 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 11  ; degree 10
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 10, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 10, iNNotes, iMode
  else
    printf_i "ERROR: instr 11 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 12  ; degree 11
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 11, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 11, iNNotes, iMode
  else
    printf_i "ERROR: instr 12 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 13  ; degree 12
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 12, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 12, iNNotes, iMode
  else
    printf_i "ERROR: instr 13 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 14  ; degree 13
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 13, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 13, iNNotes, iMode
  else
    printf_i "ERROR: instr 14 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 15  ; degree 14
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 14, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 14, iNNotes, iMode
  else
    printf_i "ERROR: instr 15 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 16  ; degree 15
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 15, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 15, iNNotes, iMode
  else
    printf_i "ERROR: instr 16 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 17  ; degree 16
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 16, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 16, iNNotes, iMode
  else
    printf_i "ERROR: instr 17 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 18  ; degree 17
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 17, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 17, iNNotes, iMode
  else
    printf_i "ERROR: instr 18 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 19  ; degree 18
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 18, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 18, iNNotes, iMode
  else
    printf_i "ERROR: instr 19 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 20  ; degree 19
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 19, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 19, iNNotes, iMode
  else
    printf_i "ERROR: instr 20 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 21  ; degree 20
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 20, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 20, iNNotes, iMode
  else
    printf_i "ERROR: instr 21 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 22  ; degree 21
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 21, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 21, iNNotes, iMode
  else
    printf_i "ERROR: instr 22 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 23  ; degree 22
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 22, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 22, iNNotes, iMode
  else
    printf_i "ERROR: instr 23 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 24  ; degree 23
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 23, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 23, iNNotes, iMode
  else
    printf_i "ERROR: instr 24 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin


instr 25  ; degree 24
  iVoiceDur = p3
  iBaseOct  = p4
  iNNotes   = p5
  iMode     = p6
  iAppMode  = int(p7)

  if (iAppMode == 1) then
    schedule 211, 0, 0.01, iVoiceDur, iBaseOct, 24, iNNotes, iMode
  elseif (iAppMode == 5) then
    schedule 215, 0, 0.01, iVoiceDur, iBaseOct, 24, iNNotes, iMode
  else
    printf_i "ERROR: instr 25 unexpected appMode %d\n", 1, iAppMode
  endif

  turnoff
endin
