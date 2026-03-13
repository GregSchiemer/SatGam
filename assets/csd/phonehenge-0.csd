<CsoundSynthesizer>
<CsOptions>

-odac -d   ;;;realtime audio out

</CsOptions>
<CsInstruments>
; Tempered Dekanies © 2001 - Greg Schiemer

sr   	=	44100
kr   	=	4410
ksmps 	= 	10
nchnls	=	2

;------------------------------------------------------------

                instr   1

;------------------------------------------------------------

ibend1	=       1.010101010     ; 100/99
ibend2	=       1.010204082     ;  99/98

ipitch	= 		p5
itrans	= 		0.01

ifreq1	cps2pch ipitch, -(p6)
ifreq2	cps2pch itrans, -1

ifreq	=       ifreq1 * ifreq2
kfreq	=       ifreq

kover	linseg  0, p3*0.05, ampdb(p4), p3*0.95, 0, 0.05, 0

k0		linen 	kover, 	0.01, 	p3, 	p3*0.9
k1		linen 	kover, 	0.02, 	p3, 	p3*0.8
k2		linen 	kover, 	0.03, 	p3, 	p3*0.7
k3		linen 	kover, 	0.04, 	p3, 	p3*0.6
k4		linen 	kover, 	0.05, 	p3, 	p3*0.5

k5		linseg 	ifreq, 	p3*0.5, (ifreq)*ibend1,     p3*0.4, ifreq
k6		linseg 	ifreq, 	p3*0.4, (ifreq)*ibend2,     p3*0.5, ifreq
k7		linseg 	ifreq, 	p3*0.3, (ifreq)*(2-ibend1), p3*0.6, ifreq
k8		linseg 	ifreq, 	p3*0.2, (ifreq)*(2-ibend2), p3*0.7, ifreq

a0		oscil   k0, 	kfreq, 	100
a1		oscil   k1, 	k5,    	100
a2		oscil   k2, 	k6,    	100
a3		oscil   k3, 	k7,    	100
a4		oscil   k4, 	k8,    	100

asigl	=       a0 + a1 + a4
asigr	=       a0 + a2 + a3

		outs    asigl, 	asigr
		endin

</CsInstruments>
<CsScore>
;________________________________________________________________________________________________________

;Function 100 uses the GEN10 subroutine to compute a sine wave

f100 0 16384 10 1        ; Sine

;; -------------------------------------------------------------------------
;; 25th root of 5 scale used by Karlheinz Stockhausen in Studie II (1954)
;; Data below will replace data in table f1 DEKANY 1 used in Six Dekanies

; 0: 1.00000000  1: 1.06649494  2: 1.13741146  3: 1.21304357  4: 1.29370483
; 5: 1.37972966  6: 1.47147471  7: 1.56932033  8: 1.67367220  9: 1.78496293
;10: 1.90365394 11: 2.03023730 12: 2.16523781 13: 2.30921517 14: 2.46276630
;15: 2.62652780 16: 2.80117862 17: 2.98744283 18: 3.18609267 19: 3.39795172
;20: 3.62389832 21: 3.86486923 22: 4.12186348 23: 4.39594656 24: 4.68825477
;25: 5.00000000
;; -------------------------------------------------------------------------

f1 0 32 -2  1.00000000  1.06649494  1.13741146  1.21304357  1.29370483 /
			1.37972966  1.47147471  1.56932033  1.67367220  1.78496293 /
			1.90365394  2.03023730  2.16523781  2.30921517  2.46276630 /
			2.62652780  2.80117862  2.98744283  3.18609267  3.39795172 /
			3.62389832  3.86486923  4.12186348  4.39594656  4.68825477			
;~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~



; DEKANY 1 : 1,3,5,7,9
;           0           1           2           3           4           5           6           7           8           9           10
;f1 0 16 -2  1.00000000  1.09375000  1.12500000  1.25000000  1.31250000  1.40625000  ;1.50000000  1.68750000  1.75000000  1.87500000  1.96875000

; 1:   35/32   septimal neutral second           . .5.7. .  
; 2:    9/8    major whole tone                 1. . . .9.  
; 3:    5/4    major third                      1. .5. . .  
; 4:   21/16   narrow fourth                     .3. .7. .  
; 5:   45/32   tritone                           . .5. .9.  
; 6:    3/2    perfect fifth                    1.3. . . .  
; 7:   27/16   Pythagorean major sixth           .3. . .9.  
; 8:    7/4    harmonic seventh                 1. . .7. .  
; 9:   15/8    classic major seventh             .3.5. . .  
; 10:  63/32   octave - septimal comma           . . .7.9.  

;~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

;	31 States 

;~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

; p1 	p2 		p3		p4		p5		p6

i 1    	0       24      68      8.01    1
i 1    	0       .        .      8.04    .
i 1    	0       .        .      8.09    .
i 1    	0       .        .      8.16    .
i 1    	0       .        .      8.24    .

i 1    	24      24      68      9.01    1
i 1    	.       .        .      9.04    .
i 1    	.       .        .      9.09    .
i 1    	.       .        .      9.16    .
i 1    	.       .        .      9.24    .

e

</CsScore>
</CsoundSynthesizer>


















