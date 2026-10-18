import { File } from 'expo-file-system';

export type Transcript = {
  text: string;
  elapsedMs: number;
  languageCode: string | null;
};

export function splitKeyterms(value: string): string[] {
  const terms: string[] = [];
  for (const part of value.split(/[\n,]/)) {
    const term = part.trim();
    if (term && !terms.includes(term)) {
      terms.push(term);
    }
    if (terms.length === 50) {
      break;
    }
  }
  return terms;
}

export async function transcribeRecording(
  serverUrl: string,
  uri: string,
  keyterms: string[],
): Promise<Transcript> {
  const bytes = await new File(uri).bytes();
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const response = await fetch(`${serverUrl.replace(/\/$/, '')}/v1/transcribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'audio/wav',
      'X-Keyterms': keyterms.join('\n'),
    },
    body,
  });
  const payload = (await response.json()) as { text?: string; error?: string; elapsedMs?: number; languageCode?: string | null };
  if (!response.ok || !payload.text) {
    throw new Error(payload.error ?? 'Transcription failed.');
  }
  return {
    text: payload.text,
    elapsedMs: payload.elapsedMs ?? 0,
    languageCode: payload.languageCode ?? null,
  };
}
