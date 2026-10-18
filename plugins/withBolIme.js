const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const PACKAGE_NAME = 'dev.rohitsingh.bol';
const SERVICE_NAME = '.keyboard.BolInputMethodService';

function withBolIme(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    AndroidConfig.Permissions.ensurePermission(manifest, 'android.permission.RECORD_AUDIO');
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    if (!application.service) {
      application.service = [];
    }
    const alreadyAdded = application.service.some(
      (service) => service.$?.['android:name'] === SERVICE_NAME,
    );
    if (!alreadyAdded) {
      application.service.push({
        $: {
          'android:name': SERVICE_NAME,
          'android:label': 'Bol',
          'android:permission': 'android.permission.BIND_INPUT_METHOD',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.view.InputMethod' } }],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.view.im',
              'android:resource': '@xml/bol_ime',
            },
          },
        ],
      });
    }
    return config;
  });

  return withDangerousMod(config, [
    'android',
    (config) => {
      const androidPackage = config.android?.package;
      if (androidPackage !== PACKAGE_NAME) {
        throw new Error(`withBolIme expects android.package ${PACKAGE_NAME}.`);
      }
      const projectRoot = config.modRequest.projectRoot;
      const androidRoot = config.modRequest.platformProjectRoot;
      const source = path.join(projectRoot, 'native', 'android');
      const kotlinDir = path.join(
        androidRoot,
        'app',
        'src',
        'main',
        'java',
        'dev',
        'rohitsingh',
        'bol',
        'keyboard',
      );
      const xmlDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml');
      const layoutDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'layout');
      fs.mkdirSync(kotlinDir, { recursive: true });
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(layoutDir, { recursive: true });
      fs.copyFileSync(
        path.join(source, 'BolInputMethodService.kt'),
        path.join(kotlinDir, 'BolInputMethodService.kt'),
      );
      fs.copyFileSync(path.join(source, 'bol_ime.xml'), path.join(xmlDir, 'bol_ime.xml'));
      fs.copyFileSync(
        path.join(source, 'bol_keyboard.xml'),
        path.join(layoutDir, 'bol_keyboard.xml'),
      );
      return config;
    },
  ]);
}

module.exports = withBolIme;
