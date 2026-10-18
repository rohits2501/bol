import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

export async function readLocal(name: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(name) ?? null;
  }
  const file = new File(Paths.document, name);
  if (!file.exists) {
    return null;
  }
  return file.text();
}

export async function writeLocal(name: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(name, value);
    return;
  }
  const file = new File(Paths.document, name);
  if (!file.exists) {
    file.create();
  }
  await file.write(value);
}
