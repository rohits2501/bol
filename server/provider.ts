export type TranscribeInput = {
  audio: Buffer;
  keyterms: string[];
};

export type ProviderTranscript = {
  text: string;
  languageCode: string | null;
};

export interface SpeechProvider {
  readonly id: string;
  transcribe(input: TranscribeInput): Promise<ProviderTranscript>;
}

export type ProviderEnv = {
  SPEECH_PROVIDER?: string;
  SARVAM_API_KEY?: string;
};

const UNWIRED = new Set(['elevenlabs', 'grok', 'gnani']);

export function createSpeechProvider(
  env: ProviderEnv,
  fetchImpl: typeof fetch = fetch,
): SpeechProvider {
  const id = env.SPEECH_PROVIDER?.trim() || 'sarvam';
  if (UNWIRED.has(id)) {
    throw new Error(
      `Speech provider "${id}" is not wired in this version. Use sarvam.`,
    );
  }
  if (id !== 'sarvam') {
    throw new Error(`Unknown speech provider "${id}".`);
  }
  const apiKey = env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('SARVAM_API_KEY is not set.');
  }
  return new SarvamProvider(apiKey, fetchImpl);
}

export class SarvamProvider implements SpeechProvider {
  readonly id = 'sarvam';
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(apiKey: string, fetchImpl: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
  }

  async transcribe(input: TranscribeInput): Promise<ProviderTranscript> {
    const form = new FormData();
    form.set('model', 'saaras:v4');
    form.set('mode', 'codemix');
    form.set('language_code', 'unknown');
    if (input.keyterms.length > 0) {
      form.set('keyterms', JSON.stringify(input.keyterms));
    }
    const audio = new Uint8Array(input.audio);
    form.set('file', new Blob([audio], { type: 'audio/wav' }), 'speech.wav');

    const response = await this.fetchImpl('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: { 'api-subscription-key': this.apiKey },
      body: form,
    });

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = readError(payload) ?? `Sarvam returned ${response.status}.`;
      throw new Error(detail);
    }

    const transcript = readTranscript(payload);
    if (!transcript) {
      throw new Error('Sarvam returned an empty transcript.');
    }
    return {
      text: transcript,
      languageCode: readLanguage(payload),
    };
  }
}

function readTranscript(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const transcript = (payload as { transcript?: unknown }).transcript;
  return typeof transcript === 'string' ? transcript : null;
}

function readLanguage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const code = (payload as { language_code?: unknown }).language_code;
  return typeof code === 'string' ? code : null;
}

function readError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const error = (payload as { error?: { message?: unknown } }).error;
  if (error && typeof error.message === 'string') {
    return error.message;
  }
  const message = (payload as { message?: unknown }).message;
  return typeof message === 'string' ? message : null;
}
