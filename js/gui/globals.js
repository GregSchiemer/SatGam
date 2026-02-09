// globals.js
import { sequence } from './sequence.js';

export const MAX_STATES		= sequence.length;  // 31
export const STATE_DUR		= 24;				// beats
export const CONCERT_CLK	= 1000;				// ms
export const PREVIEW_CLK	= 42;				// ms
export const MAX_DUR 		= 
  MAX_STATES * STATE_DUR * CONCERT_CLK;			// 744000 ms
export const FULL_HENGE		= 18;				// pre-start state index
