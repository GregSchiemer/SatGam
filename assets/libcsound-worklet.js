// Minimal libcsound-worklet.js
// Defines and registers a dummy AudioWorkletProcessor

class CsoundProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (event) => {
      const { type, orc, code } = event.data;
      console.log("📨 Worklet received message:", event.data);
      if (type === 'compileOrc') {
        this.orcCode = orc;
      } else if (type === 'evalCode') {
        this.scoreCode = code;
      }
    };
    console.log("✅ CsoundProcessor constructed");
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    for (let channel = 0; channel < output.length; ++channel) {
      const outputChannel = output[channel];
      for (let i = 0; i < outputChannel.length; ++i) {
        outputChannel[i] = 0; // Silence
      }
    }
    return true;
  }
}

registerProcessor('csound-processor', CsoundProcessor);