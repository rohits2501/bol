import { Platform } from 'react-native';

export const APP_GROUP = 'group.dev.rohitsingh.bol';

export async function sharePendingText(text: string): Promise<void> {
  if (Platform.OS !== 'ios' || !text) {
    return;
  }
  const { ExtensionStorage } = await import('@bacons/apple-targets');
  const storage = new ExtensionStorage(APP_GROUP);
  storage.set('pendingText', text);
}
