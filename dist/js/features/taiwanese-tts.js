import { createRemoteSpeech } from "./remote-speech.js?v=branch-2";
// Same public model6 API used by the Taiwanese-tts Hugging Face Space.
const ENDPOINT = "https://learn-language.tokyo/taigiTTS/taigi-text-to-speech";
export function createTaiwaneseSpeech(options = {}) {
  return createRemoteSpeech({
    ...options,
    label: "台語",
    resolveAudio: async (text, { fetchImpl, signal }) => {
      const response = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ text, model: "model6" }),
        signal,
      });
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? "台語語音使用較多人，請稍後再試，或改選國語。"
            : "台語暫時無法連線，請稍後再試，或改選國語。",
        );
      const data = await response.json();
      return data.converted_audio_url || data.audio_url;
    },
  });
}
