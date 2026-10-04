let audioCtx: AudioContext | null = null;
const getCtx = () => {
if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
if (audioCtx.state === 'suspended') audioCtx.resume();
return audioCtx;
};
export const playSendSound = () => {
try {
const ctx = getCtx();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
const filter = ctx.createBiquadFilter();
osc.type = 'sine';
osc.frequency.setValueAtTime(880, ctx.currentTime);
osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.28);
filter.type = 'lowpass'; filter.frequency.setValueAtTime(1200, ctx.currentTime);
gain.gain.setValueAtTime(0.8, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
osc.start(); osc.stop(ctx.currentTime + 0.35);
} catch {}
};
export const playEntrySound = () => {
try {
const ctx = getCtx();
const bufferSize = ctx.sampleRate * 2.5;
const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
const output = buffer.getChannelData(0);
for (let i = 0; i < bufferSize; i++) { output[i] = (Math.random() * 2 - 1) * 0.4; }
const whiteNoise = ctx.createBufferSource(); whiteNoise.buffer = buffer;
const filter1 = ctx.createBiquadFilter(); filter1.type = 'bandpass'; filter1.frequency.value = 1200; filter1.Q.value = 0.5;
const filter2 = ctx.createBiquadFilter(); filter2.type = 'lowpass'; filter2.frequency.value = 2500;
const gain = ctx.createGain();
gain.gain.setValueAtTime(0, ctx.currentTime);
gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.8);
gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 2.0);
gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.8);
whiteNoise.connect(filter1); filter1.connect(filter2); filter2.connect(gain); gain.connect(ctx.destination);
whiteNoise.start(); whiteNoise.stop(ctx.currentTime + 3);
const osc = ctx.createOscillator(); const oscGain = ctx.createGain();
osc.type = 'triangle'; osc.frequency.setValueAtTime(110, ctx.currentTime);
oscGain.gain.setValueAtTime(0, ctx.currentTime); oscGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1); oscGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3);
osc.connect(oscGain); oscGain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 3.2);
} catch {}
};