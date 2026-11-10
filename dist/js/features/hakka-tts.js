import { createRemoteSpeech } from "./remote-speech.js?v=branch-2";
const ORIGIN = "https://united-link-taiwanese-hakka-tts.hf.space";
const ENDPOINT = `${ORIGIN}/gradio_api/call/text_to_speech`;
const DIGITS = "零一二三四五六七八九";
function numberToWords(value) {
  if (value.length > 4 || /^0\d/.test(value))
    return Array.from(value, (digit) => DIGITS[Number(digit)]).join("");
  const number = Number(value);
  if (!number) return "零";
  let result = "";
  for (let position = 3; position >= 0; position--) {
    const digit = Math.floor(number / 10 ** position) % 10;
    if (digit) result += DIGITS[digit] + ["", "十", "百", "千"][position];
    else if (result && number % 10 ** position && !result.endsWith("零"))
      result += "零";
  }
  return result.replace(/^一十/, "十");
}
// The service rejects Arabic numerals; keep values and percentages intact in speech.
export function normalizeHakkaText(text) {
  return text
    .replace(/[「」『』“”‘’"]/g, "")
    .replace(/[：\n·]/g, "，")
    .replace(/(\d+(?:\.\d+)?)\s*%/g, "百分之$1")
    .replace(/\d+(?:\.\d+)?/g, (number) => {
      const [whole, fraction] = number.split(".");
      return (
        numberToWords(whole) +
        (fraction
          ? "點" + Array.from(fraction, (n) => DIGITS[Number(n)]).join("")
          : "")
      );
    });
}
export function parseHakkaEvent(block) {
  const lines = block.split(/\r?\n/);
  const event = lines
    .find((line) => line.startsWith("event:"))
    ?.slice(6)
    .trim();
  if (event !== "complete" && event !== "error") return null;
  if (event === "error")
    throw new Error("客語服務忙碌或有無法辨識的字詞，請稍後重試，或改選國語。");
  const payload = JSON.parse(
    lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n"),
  );
  const url = payload?.[2]?.url;
  if (
    typeof url !== "string" ||
    new URL(url).origin !== ORIGIN ||
    !new URL(url).pathname.startsWith("/gradio_api/file=")
  )
    throw new Error("客語音檔尚未準備好，請稍後再試。");
  return url;
}
export async function resolveHakkaAudio(text, { fetchImpl, signal }) {
  const response = await fetchImpl(ENDPOINT, {
    method: "POST",
    credentials: "omit",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        "yourtts-htia-240704",
        "預設語者",
        null,
        "朱品諭",
        "sixian",
        1.1,
        normalizeHakkaText(text),
      ],
    }),
  });
  if (!response.ok)
    throw new Error("客語暫時無法連線，請稍後再試，或改選國語。");
  const { event_id: id } = await response.json();
  if (!/^[a-f0-9]{32}$/.test(id))
    throw new Error("客語語音尚未準備好，請稍後再試。");
  const result = await fetchImpl(`${ENDPOINT}/${id}`, {
    signal,
    credentials: "omit",
  });
  if (!result.ok || !result.body)
    throw new Error("客語暫時無法連線，請稍後再試，或改選國語。");
  const reader = result.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let boundary;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const block = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const url = parseHakkaEvent(block);
        if (url) return url;
      }
      if (done) {
        const url = parseHakkaEvent(buffer);
        if (url) return url;
        throw new Error("客語語音未能完成，請稍後再試，或改選國語。");
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export function createHakkaSpeech(options = {}) {
  return createRemoteSpeech({
    timeoutMs: 90000,
    ...options,
    label: "客語",
    resolveAudio: resolveHakkaAudio,
  });
}
