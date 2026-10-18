import assert from 'node:assert/strict';
import test from 'node:test';

import { createSpeechProvider, type SpeechProvider } from './provider.ts';
import { parseKeyterms, transcribeAudio } from './transcribe.ts';

test('keeps at most 50 distinct keyterms', () => {
  const header = Array.from({ length: 60 }, (_, index) => `name ${index}`).join(
    '\n',
  );
  assert.equal(parseKeyterms(header).length, 50);
  assert.equal(parseKeyterms('  Indiranagar \n\nPhonePe\nIndiranagar').join(','), 'Indiranagar,PhonePe');
});

test('drops a keyterm longer than 64 characters', () => {
  assert.deepEqual(parseKeyterms(`${'a'.repeat(65)}\nRohit`), ['Rohit']);
});

test('refuses providers that are not wired', () => {
  assert.throws(
    () => createSpeechProvider({ SPEECH_PROVIDER: 'gnani', SARVAM_API_KEY: 'key' }),
    /not wired/,
  );
  assert.throws(() => createSpeechProvider({}), /SARVAM_API_KEY/);
});

test('cleans the provider transcript before returning it', async () => {
  const provider: SpeechProvider = {
    id: 'sarvam',
    transcribe: async () => ({
      text: 'um hello scratch that PhonePe पर भेजो',
      languageCode: 'hi-IN',
    }),
  };
  const result = await transcribeAudio(Buffer.from('wav'), [], provider);
  assert.equal(result.text, 'PhonePe पर भेजो.');
  assert.equal(result.provider, 'sarvam');
  assert.equal(result.languageCode, 'hi-IN');
});

test('Sarvam provider sends saaras v4 codemix and keyterms', async () => {
  let seen: { url: string; model: string; mode: string; keyterms: string } | null =
    null;
  const fetchImpl: typeof fetch = async (input, init) => {
    const form = init?.body as FormData;
    seen = {
      url: String(input),
      model: String(form.get('model')),
      mode: String(form.get('mode')),
      keyterms: String(form.get('keyterms')),
    };
    return new Response(JSON.stringify({ transcript: 'hello', language_code: 'en-IN' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const provider = createSpeechProvider(
    { SARVAM_API_KEY: 'test-key' },
    fetchImpl,
  );
  const result = await provider.transcribe({
    audio: Buffer.from('RIFF'),
    keyterms: ['PhonePe'],
  });
  assert.equal(result.text, 'hello');
  assert.equal(seen?.url, 'https://api.sarvam.ai/speech-to-text');
  assert.equal(seen?.model, 'saaras:v4');
  assert.equal(seen?.mode, 'codemix');
  assert.equal(seen?.keyterms, '["PhonePe"]');
});
