// js/ES6-GUI/enableKeys.js
// Enables key scanning

//import { csound } from './csoundInit.js';
import { arrK } from './canvasUtils.js';
import { isInsideCircle } from './helpers.js'; // geometric hit test

export function scanKeys() {
  const { cnv } = arrK;
  const ctx = arrK; // for consistent access to arrK.x, arrK.y, etc.

  cnv.addEventListener('click', (e) => {
    const mX = e.clientX - cnv.getBoundingClientRect().left;
    const mY = e.clientY - cnv.getBoundingClientRect().top;

    for (let i = 0; i < ctx.max; i++) {
      const x = ctx.X[i];
      const y = ctx.Y[i];
      const r = ctx.radius;

      if (isInsideCircle(mX, mY, x, y, r)) {
        console.log(`✅ Key ${i + 1}: (${x}, ${y})`);
//        playSoundHandler(i); // index passed directly
        return;
      }
    }

    console.log("⚠️ No key hit");
  });
}

/*
function playSoundHandler(index) {
  if (csound) {
    // index = 0..24 → up to you how this is interpreted by the instrument
    csound.evalCode(`i1 0 1 ${index}`);
    console.log(`🎵 Triggered key ${index + 1} → i1 0 1 ${index}`);
  } else {
    console.warn("⚠️ Csound not initialized — tap center to start");
  }
}
*/

/////////////////////////
/*
import { arrK } from './henge.js';
import { arrU } from './canvasUtils.js';
import { isInsideCircle } from './helpers.js';

export function scanKeys() {
  const { cnv } = arrU[0];
  const max    = arrK[0];
  const radius = arrK[1];
  const X      = arrK[2];
  const Y      = arrK[3];

//  console.log(`✅ scanKeys() called — max: ${max}, radius: ${radius}, X[]: ${X}, Y[]: ${Y}`);
  let hit = false;

cnv.addEventListener('click', function playSoundHandler(e){
  let mX = e.clientX - cnv.getBoundingClientRect().left;
  let mY = e.clientY - cnv.getBoundingClientRect().top;

  for (let i = 0; i < max; i++) {
    if (isInsideCircle(mX, mY, X[i], Y[i], radius)) {

  console.log(`🖱 Clicked at (${mX.toFixed(1)}, ${mY.toFixed(1)})`);
  console.log(`✅  Key ${i+1}: (${X[i]}, ${Y[i]})`);

      const freq = 200 + i * 5;
      const harm = (i % 5) + 4;
      const btn  = i + 1;

      csound.evalCode(`i1 0 1 ${freq} ${harm}`);
      console.log(`🔔 Key ${btn} hit: freq ${freq}, harm ${harm}`);

      hit = true;
      break;
    }
  }

  if (!hit) {
    console.log("🛑 No button hit");
  }
});
}
*/