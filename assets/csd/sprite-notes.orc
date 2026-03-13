sr     = 44100
ksmps  = 32
nchnls = 2
0dbfs  = 1

maxalloc 110, 40

giSine  ftgen 100, 0, 16384, 10, 1

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

; shared cpsxpch voice
; p4 = formalOct, p5 = degree 0..24
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

; phones 1..25 (single note)
; JS can keep sending: i <1..25> 0 <dur> <formalOct> <nNotes> <mode>
; p5/p6 are read as dummies so there are no warnings
instr 1
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 0
  turnoff
endin
instr 2
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 1
  turnoff
endin
instr 3
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 2
  turnoff
endin
instr 4
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 3
  turnoff
endin
instr 5
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 4
  turnoff
endin
instr 6
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 5
  turnoff
endin
instr 7
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 6
  turnoff
endin
instr 8
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 7
  turnoff
endin
instr 9
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 8
  turnoff
endin
instr 10
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 9
  turnoff
endin
instr 11
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 10
  turnoff
endin
instr 12
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 11
  turnoff
endin
instr 13
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 12
  turnoff
endin
instr 14
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 13
  turnoff
endin
instr 15
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 14
  turnoff
endin
instr 16
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 15
  turnoff
endin
instr 17
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 16
  turnoff
endin
instr 18
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 17
  turnoff
endin
instr 19
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 18
  turnoff
endin
instr 20
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 19
  turnoff
endin
instr 21
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 20
  turnoff
endin
instr 22
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 21
  turnoff
endin
instr 23
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 22
  turnoff
endin
instr 24
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 23
  turnoff
endin
instr 25
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 24
  turnoff
endin