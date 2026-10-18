import { cleanupTranscript } from './cleanup.ts';
import type { SpeechProvider } from './provider.ts';

export type TranscribeResponse = {
  text: string;
  languageCode: string | null;
  provider: string;
  elapsedMs: number;
};

const MAX_TERMS = 50;
const MAX_TERM_LENGTH = 64;
const MAX_AUDIO_BYTES = 2_000_000;

export function parseKeyterms(header: string | undefined): string[] {
  if (!header) {
    return [];
  }
  const terms: string[] = [];
  for (const part of header.split('\n')) {
    const term = part.trim();
    if (!term || term.length > MAX_TERM_LENGTH) {
      continue;
    }
    if (!terms.includes(term)) {
      terms.push(term);
    }
    if (terms.length === MAX_TERMS) {
      break;
    }
  }
  return terms;
}

export async function transcribeAudio(
  audio: Buffer,
  keyterms: string[],
  provider: SpeechProvider,
): Promise<TranscribeResponse> {
  if (audio.length === 0) {
    throw new Error('The recording was empty.');
  }
  if (audio.length > MAX_AUDIO_BYTES) {
    throw new Error('The recording is longer than 30 seconds.');
  }
  const started = Date.now();
  const result = await provider.transcribe({ audio, keyterms });
  return {
    text: cleanupTranscript(result.text),
    languageCode: result.languageCode,
    provider: provider.id,
    elapsedMs: Date.now() - started,
  };
}
