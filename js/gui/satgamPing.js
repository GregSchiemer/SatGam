// js/gui/satgamPing.js
let csound = null;

const CODE = `
instr 1
  out linenr(oscili(0dbfs*p4,p5), 0.01, p3, 0.01)
endin
`;

// A) matches the Ping README exactly:
const CSOUND_URL = "https://www.unpkg.com/@csound/browser@6.18.7/dist/csound.js";

// B) newer Csound 7 beta (if you want to try it):
// const CSOUND_URL = "https://cdn.jsdelivr.net/npm/@csound/browser@7.0.0-beta13/dist/csound.js";

export async function pingBeep({ dur = 0.25, amp = 0.25, hz = 440 } = {}) {
  if (!csound) {
    const mod = await import(CSOUND_URL);
    const Csound = mod.Csound; // named export
    csound = await Csound();
    await csound.setOption("-odac");
    await csound.compileOrc(CODE);
    await csound.start();
    console.log("✅ Ping engine ready");
  }

  await csound.inputMessage(`i1 0 ${dur} ${amp} ${hz}`);
  return true;
}
