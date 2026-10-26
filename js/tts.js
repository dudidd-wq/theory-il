// Read-aloud with the browser's built-in speech synthesis only (no network, no paid voices).
const BCP = { he: 'he', en: 'en', ru: 'ru', fr: 'fr', es: 'es' };
const synth = () => ('speechSynthesis' in self ? speechSynthesis : null);
export const voiceFor = lang => (synth()?.getVoices() || []).find(v => v.lang?.toLowerCase().startsWith(BCP[lang])) || null;
export const supported = () => !!synth();
export function speak(text, lang, rate = 1, onend) {
  const s = synth(); if (!s) return false;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text); const v = voiceFor(lang);
  if (v) u.voice = v; u.lang = v?.lang || ({ he: 'he-IL', en: 'en-US', ru: 'ru-RU', fr: 'fr-FR', es: 'es-ES' })[lang]; u.rate = rate;
  u.onend = u.onerror = () => onend?.();
  s.speak(u); return true;
}
export const stop = () => synth()?.cancel();
export const speaking = () => !!synth()?.speaking;
if (synth()) synth().getVoices();     // warm up the voice list (Chrome loads it async)
