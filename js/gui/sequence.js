// sequence.js
// This module exports hard-coded pulse pattern used by the animation system.

export const sequence = [
//	Mask bits		 n	Hex	Hamming weight
	[1,0,0,0,0],  // 1	10	1
	[1,0,1,0,0],  // 2	14	2
	[1,0,1,0,1],  // 3	15	3
	[1,0,1,1,1],  // 4	17	4
	[0,0,1,1,1],  // 5	07	3
  
	[0,0,0,1,1],  // 6	03	2
	[1,0,0,1,1],  // 7	13	3
	[1,0,0,1,0],  // 8	12	2
	[0,0,0,1,0],  // 9	02	1
	[0,0,1,1,0],  // 10	06	2
  
	[1,0,1,1,0],  // 11	16	3
	[1,1,1,1,0],  // 12	1E	4
	[1,1,1,0,0],  // 13	1C	3
	[0,1,1,0,0],  // 14	0C	2
	[0,0,1,0,0],  // 15	04	1
  
	[0,0,1,0,1],  // 16	05	2
	[0,1,1,0,1],  // 17	0D	3
	[1,1,1,0,1],  // 18	1D	4
	[1,1,1,1,1],  // 19	1F	5
	[1,1,0,1,1],  // 20	1B	4
  
	[1,1,0,1,0],  // 21	1A	3
	[0,1,0,1,0],  // 22	0A	2
	[0,1,1,1,0],  // 23	0E	3
	[0,1,1,1,1],  // 24	0F	4
	[0,1,0,1,1],  // 25	0B	3
  
	[0,0,0,1,1],  // 26	03	2
	[0,0,0,0,1],  // 27	01	1
	[1,0,0,0,1],  // 28	11	2
	[1,1,0,0,1],  // 29	19	3
	[0,1,0,0,1],  // 30	09	2

	[0,1,0,0,0],  // 31	08	1
];

export const MLS_STATES = sequence.length;

// 1-based accessor (s1..s31). Wraps safely.
export function getFamilyMask(state1) {
  const idx = ((state1 - 1) % MLS_STATES + MLS_STATES) % MLS_STATES;
  return sequence[idx];
}

// Handy helpers (also 1-based)
export const nextState = (s) => (s % MLS_STATES) + 1;
export const prevState = (s) => ((s + MLS_STATES - 2) % MLS_STATES) + 1;