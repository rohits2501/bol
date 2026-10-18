import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
} from 'expo-audio';
import * as Device from 'expo-device';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sharePendingText } from '@/dictation/share';
import { readLocal, writeLocal } from '@/dictation/storage';
import { splitKeyterms, transcribeRecording } from '@/dictation/transcribe';

const SERVER_FILE = 'bol-server-url.txt';
const TERMS_FILE = 'bol-keyterms.txt';
const CONSENT_FILE = 'bol-consent.txt';
const MAX_MS = 30_000;

type Phase = 'idle' | 'recording' | 'sending';

export function DictationScreen({ autoStart = false }: { autoStart?: boolean }) {
  const insets = useSafeAreaInsets();
  const { stream } = useAudioStream({ sampleRate: 16000, channels: 1, encoding: 'int16' });
  const [phase, setPhase] = useState<Phase>('idle');
  const [serverUrl, setServerUrl] = useState(defaultServerUrl());
  const [keyterms, setKeyterms] = useState('');
  const [transcript, setTranscript] = useState('');
  const [detail, setDetail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState<boolean | null>(null);
  const started = useRef(false);
  const stopping = useRef(false);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopStream() {
    try {
      stream.stop();
    } catch {
      // The stream is already stopped when transcription fails after the file is finalized.
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [savedUrl, savedTerms, savedConsent] = await Promise.all([
        readLocal(SERVER_FILE),
        readLocal(TERMS_FILE),
        readLocal(CONSENT_FILE),
      ]);
      if (cancelled) return;
      if (savedUrl) setServerUrl(savedUrl);
      if (savedTerms) setKeyterms(savedTerms);
      setConsent(savedConsent === '1');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (autoStart && consent && phase === 'idle' && !started.current) {
      started.current = true;
      void begin();
    }
  }, [autoStart, consent, phase]);

  async function acceptConsent() {
    await writeLocal(CONSENT_FILE, '1');
    setConsent(true);
  }

  async function begin() {
    setError(null);
    setDetail(null);
    if (Platform.OS === 'web') {
      setError('Recording runs in the iOS and Android app. Start the server, then use a development build.');
      return;
    }
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError('Bol needs the microphone to turn speech into text.');
      return;
    }
    await writeLocal(SERVER_FILE, serverUrl.trim());
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    });
    await stream.start();
    await stream.startFileRecordingAsync({ format: 'wav' });
    setPhase('recording');
    limit.current = setTimeout(() => {
      void finish();
    }, MAX_MS);
  }

  async function finish() {
    if (stopping.current) {
      return;
    }
    stopping.current = true;
    if (limit.current) {
      clearTimeout(limit.current);
      limit.current = null;
    }
    setPhase('sending');
    const startedAt = Date.now();
    try {
      const recorded = await stream.stopFileRecordingAsync();
      stopStream();
      const result = await transcribeRecording(serverUrl.trim(), recorded.uri, splitKeyterms(keyterms));
      setTranscript(result.text);
      setDetail(`${Date.now() - startedAt} ms from stop to text`);
      await sharePendingText(result.text);
    } catch (caught) {
      stopStream();
      setError(caught instanceof Error ? caught.message : 'Transcription failed.');
    } finally {
      stopping.current = false;
      setPhase('idle');
    }
  }

  async function saveFields() {
    await writeLocal(SERVER_FILE, serverUrl.trim());
    await writeLocal(TERMS_FILE, keyterms);
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.page, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.kicker}>India voice dictation</Text>
      <Text style={styles.title}>Bol</Text>
      <Text style={styles.lede}>
        Speak Hindi, Hinglish, or English. The recording goes to your server, then to Sarvam Saaras.
        Nothing is transcribed on the phone.
      </Text>

      {consent === false ? <Consent onAccept={() => void acceptConsent()} /> : null}

      <Pressable
        accessibilityRole="button"
        disabled={consent !== true || phase === 'sending'}
        onPress={() => void (phase === 'recording' ? finish() : begin())}
        style={[styles.mic, phase === 'recording' && styles.micLive, consent !== true && styles.micOff]}>
        {phase === 'sending' ? (
          <ActivityIndicator color="#F4EFE6" />
        ) : (
          <Text style={styles.micLabel}>{phase === 'recording' ? 'Stop' : 'Speak'}</Text>
        )}
      </Pressable>
      <Text style={styles.hint}>
        {phase === 'recording' ? 'Listening, up to 30 seconds.' : 'Tap speak, then stop.'}
      </Text>

      <Text style={styles.label}>Transcript</Text>
      <TextInput
        multiline
        onChangeText={setTranscript}
        placeholder="The cleaned text shows up here."
        placeholderTextColor="#8A8175"
        style={styles.transcript}
        value={transcript}
      />
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Names and places</Text>
      <TextInput
        onBlur={() => void saveFields()}
        onChangeText={setKeyterms}
        placeholder="Indiranagar, PhonePe"
        placeholderTextColor="#8A8175"
        style={styles.field}
        value={keyterms}
      />

      <Text style={styles.label}>Server</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onBlur={() => void saveFields()}
        onChangeText={setServerUrl}
        style={styles.field}
        value={serverUrl}
      />

      <Pressable accessibilityRole="button" onPress={() => void openKeyboardSettings()} style={styles.secondary}>
        <Text style={styles.secondaryLabel}>Enable the Bol keyboard</Text>
      </Pressable>
      <Text style={styles.note}>
        Android records from the keyboard and inserts the text. iOS keyboards cannot use the microphone, so
        dictate here and insert from the Bol keyboard.
      </Text>
    </ScrollView>
  );
}

function Consent({ onAccept }: { onAccept: () => void }) {
  return (
    <View style={styles.consent}>
      <Text style={styles.consentTitle}>Microphone consent</Text>
      <Text style={styles.consentBody}>
        Bol sends the recording to the server address below, which sends it to Sarvam in India to produce
        text. The server does not keep the audio after that request. You can edit or delete the transcript
        on this screen. Agree to turn the microphone on.
      </Text>
      <Pressable accessibilityRole="button" onPress={onAccept} style={styles.secondary}>
        <Text style={styles.secondaryLabel}>Agree and continue</Text>
      </Pressable>
    </View>
  );
}

function defaultServerUrl() {
  if (Platform.OS === 'android' && !Device.isDevice) {
    return 'http://10.0.2.2:8787';
  }
  return 'http://127.0.0.1:8787';
}

async function openKeyboardSettings() {
  if (Platform.OS === 'android') {
    await Linking.sendIntent('android.settings.INPUT_METHOD_SETTINGS');
    return;
  }
  await Linking.openSettings();
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#F4EFE6',
    flexGrow: 1,
    gap: 12,
    paddingHorizontal: 24,
  },
  kicker: {
    color: '#8C4A32',
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#1C1915',
    fontSize: 48,
    fontWeight: '700',
  },
  lede: {
    color: '#3E3832',
    fontSize: 17,
    lineHeight: 24,
  },
  mic: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#C4512C',
    borderRadius: 28,
    height: 88,
    justifyContent: 'center',
    marginTop: 8,
    width: 88,
  },
  micLive: {
    backgroundColor: '#8C1D18',
  },
  micOff: {
    opacity: 0.45,
  },
  micLabel: {
    color: '#F4EFE6',
    fontSize: 18,
    fontWeight: '700',
  },
  hint: {
    color: '#6B6258',
    fontSize: 14,
  },
  label: {
    color: '#1C1915',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  transcript: {
    backgroundColor: '#FFFBF5',
    borderColor: '#DDD4C6',
    borderRadius: 16,
    borderWidth: 1,
    color: '#1C1915',
    fontSize: 18,
    lineHeight: 26,
    minHeight: 120,
    padding: 16,
    textAlignVertical: 'top',
  },
  field: {
    backgroundColor: '#FFFBF5',
    borderColor: '#DDD4C6',
    borderRadius: 12,
    borderWidth: 1,
    color: '#1C1915',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detail: {
    color: '#3E3832',
    fontSize: 14,
  },
  error: {
    color: '#8C1D18',
    fontSize: 15,
    lineHeight: 21,
  },
  secondary: {
    alignSelf: 'flex-start',
    backgroundColor: '#1C1915',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryLabel: {
    color: '#F4EFE6',
    fontSize: 15,
    fontWeight: '600',
  },
  note: {
    color: '#6B6258',
    fontSize: 14,
    lineHeight: 20,
  },
  consent: {
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    gap: 10,
    padding: 16,
  },
  consentTitle: {
    color: '#1C1915',
    fontSize: 18,
    fontWeight: '700',
  },
  consentBody: {
    color: '#3E3832',
    fontSize: 15,
    lineHeight: 22,
  },
});
