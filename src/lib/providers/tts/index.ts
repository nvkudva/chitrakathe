import { config } from "../../config";
import type { Language } from "../../templates/schema";

export interface TtsProvider {
  readonly name: string;
  speak(text: string, lang: Language): Promise<Buffer>;
}

/** Sarvam Bulbul. Native Indian-language voices; the reason it is primary. */
class SarvamTts implements TtsProvider {
  readonly name = "sarvam";
  private codes: Record<Language, string> = { kn: "kn-IN", hi: "hi-IN", en: "en-IN", kok: "mr-IN" };

  async speak(text: string, lang: Language): Promise<Buffer> {
    const key = config().SARVAM_API_KEY;
    if (!key) throw new Error("SARVAM_API_KEY is not set");
    // Konkani has no dedicated Sarvam voice; Marathi is the closest Devanagari
    // reader and is what a Konkani listener finds least jarring. Flagged in
    // docs/known-gaps.md for native review before launch.
    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: { "api-subscription-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: this.codes[lang],
        speaker: "vidya",
        pace: 0.95,
        model: "bulbul:v2",
      }),
    });
    if (!res.ok) throw new Error(`sarvam tts failed ${res.status}: ${await res.text()}`);
    const j = (await res.json()) as { audios: string[] };
    if (!j.audios?.[0]) throw new Error("sarvam returned no audio");
    return Buffer.from(j.audios[0], "base64");
  }
}

class ElevenLabsTts implements TtsProvider {
  readonly name = "elevenlabs";
  async speak(text: string): Promise<Buffer> {
    const key = config().ELEVENLABS_API_KEY;
    if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
    const voice = "21m00Tcm4TlvDq8ikWAM";
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text, model_id: "eleven_flash_v2_5" }),
    });
    if (!res.ok) throw new Error(`elevenlabs tts failed ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
}

/** Silent track of a plausible length. Keeps the mix path exercised for free. */
class StubTts implements TtsProvider {
  readonly name = "stub";
  async speak(text: string): Promise<Buffer> {
    const { ffmpeg } = await import("../../render/ffmpeg");
    const { withTempDir } = await import("../../render/tmp");
    const { promises: fs } = await import("node:fs");
    const path = await import("node:path");
    const seconds = Math.max(2, Math.min(20, text.length / 14));
    return withTempDir("tts", async (dir) => {
      const out = path.join(dir, "v.m4a");
      await ffmpeg(["-f", "lavfi", "-i", `anullsrc=r=48000:cl=mono`, "-t", String(seconds), "-c:a", "aac", "-b:a", "96k", "-y", out]);
      return fs.readFile(out);
    });
  }
}

export function ttsProvider(): TtsProvider {
  switch (config().TTS_PROVIDER) {
    case "sarvam":
      return new SarvamTts();
    case "elevenlabs":
      return new ElevenLabsTts();
    default:
      return new StubTts();
  }
}
