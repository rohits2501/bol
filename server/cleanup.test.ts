import assert from 'node:assert/strict';
import test from 'node:test';

import { cleanupTranscript } from './cleanup.ts';

test('drops the words before a spoken correction', () => {
  assert.equal(
    cleanupTranscript('meet at five scratch that meet at six'),
    'meet at six.',
  );
});

test('clears the line when scratch that is the last thing said', () => {
  assert.equal(cleanupTranscript('meet at five scratch that'), '');
});

test('understands the Hindi correction काट दो', () => {
  assert.equal(cleanupTranscript('कल आना काट दो परसों आना'), 'परसों आना.');
});

test('removes filler words and keeps the sentence', () => {
  assert.equal(
    cleanupTranscript('um मुझे flight book करनी है uh'),
    'मुझे flight book करनी है.',
  );
});

test('removes मतलब when it is only a filler', () => {
  assert.equal(cleanupTranscript('मतलब कल मिलते हैं'), 'कल मिलते हैं.');
});

test('leaves a name in Latin script alone', () => {
  assert.equal(cleanupTranscript('PhonePe पर भेजो'), 'PhonePe पर भेजो.');
});

test('does not add a second period', () => {
  assert.equal(cleanupTranscript('Hello.'), 'Hello.');
});
