// js/gui/runTime.js
// Lean render scheduler — wall-clock lives in main.js

let renderFn = null;

const rt = {
  mode: 'stopped',
  ticking: false,   // maintained by animation.js
  rafId: 0,         // maintained by animation.js
  frame: 0,         // maintained by animation.js
};

export function setRender(fn) { renderFn = fn; }
export function stepOnce() {
  if (!renderFn) return;
  try { renderFn(rt); } catch (e) { console.error('[runTime.stepOnce]', e); }
}
export function setMode(mode) { rt.mode = mode; }
export function getRuntime() { return { ...rt }; }

// This is what animation.js will call every frame:
export function renderFrame() {
  if (!renderFn) return;
  try { renderFn(rt); } catch (e) { console.error('[runTime.renderFrame]', e); }
}

// Export rt so the scheduler can bump counters and store rafId/ticking.
export { rt };


// Factory: build a wall-clock–driven render function.
// It stays decoupled: all scene helpers are injected from main.js.
export function makeWallClockRenderer({
  ctx,
  slots,
  role,
  f,                        // background theme index (0 = neutral)
  TOTAL_STATES,
  STATE_DUR_SEC,
  state,                    // { running, PRE_INDEX, startWall, msPerBeat }
  prepareAndRenderBackground,
  getFamilyMask,
  familyForIndex,
  FamilyIndex,
  drawPhoneAt,
  renderStartBoth,
  renderRunning,
  renderEnd,
}) {
  const TOTAL_DURATION_S = TOTAL_STATES * STATE_DUR_SEC;

  return function renderFrame(rt) {
    try {
      // 1) background first (prevents white fills if fillStyle drifted)
      prepareAndRenderBackground(f);

      // 2) wall-clock → simulated seconds
      const clockMs = state.running
        ? Math.floor((performance.now() - state.startWall) / state.msPerBeat)
        : 0;

      // 3) end screen + stop when duration reached
     // if (state.running && clockMs >= TOTAL_DURATION_S) {
     //   const mm = Math.floor(TOTAL_DURATION_S / 60);
     //   const ss = String(TOTAL_DURATION_S % 60).padStart(2, '0');
     //   renderEnd({ duration: `${mm}:${ss}` });
     //   stopAnimation();           // uses this module's lean stop
     //   state.running = false;     // prevent re-entry
     //   return;
     // }

	  // 3) end screen + stop when duration reached
		if (state.running && clockMs >= TOTAL_DURATION_S) {
		  const { label } = clockify(TOTAL_DURATION_S);
		  renderEnd({ duration: label });
		  stopAnimation();
		  state.running = false;
		  return;
		}

      // 4) pick current state (pre-start holds PRE_INDEX)
      const curIndex = state.running
        ? Math.min(TOTAL_STATES, 1 + Math.floor(clockMs / STATE_DUR_SEC))
        : state.PRE_INDEX;

      // 5) ring draw
      const mask = getFamilyMask(curIndex);
      slots.forEach((slot, i) => {
        const fam    = familyForIndex(i);     // Y/R/G/B/M cycling
        const idx    = FamilyIndex[fam];      // 0..4
        const active = !!mask[idx];           // filled vs outline
        drawPhoneAt(ctx, { ...slot, family: fam, active, shadow: true, angle: slot.angle });
      });

      // 6) overlays
//      if (!state.running) {
//        const intendedMode = (role === 'leader' ? 'preview' : 'concert');
//        renderStartBoth({ mode: intendedMode });
//      } else {
//        const mm = Math.floor(clockMs / 60);
//        const ss = String(clockMs % 60).padStart(2, '0');
//        renderRunning({ stateIndex: curIndex, mins: mm, secs: ss });
//      }
      
      // 6) overlays
	  if (!state.running) {
  		const intendedMode = (role === 'leader' ? 'preview' : 'concert');
  		renderStartBoth({ mode: intendedMode });
	  } else {
  		const { m, s } = clockify(clockMs);
  		renderRunning({ stateIndex: curIndex, mins: m, secs: s });
	  }

      
    } catch (err) {
      // Keep RAF alive even if scene code throws
      console.error('[renderer] frame error:', err);
    }
  };
}

function clockify(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = String(totalSec % 60).padStart(2, '0');
  return { m, s, label: `${m}:${s}` };
}

// Handy mm:ss formatter
/*

export function clockify(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = String(totalSec % 60).padStart(2, '0');
  return { m, s, label: `${m}:${s}` };
}

*/
