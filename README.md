# Bol

Speak Hindi, Hinglish, or English. Bol sends the recording to a small server, Sarvam Saaras writes it down in code-mix mode, and a short cleanup pass removes fillers and spoken corrections such as “scratch that”.

Transcription does not run on the phone. Sarvam Saaras v4 is the only live provider. ElevenLabs, Grok, and Gnani are named on the server interface and are not wired up.

This repository is a showcase. It is not on the App Store or Play Store.

## What you can run from a clone

The dictation screen records a WAV, posts it to your server, and shows the text. That is the path to try first.

The Android keyboard records in the keyboard and inserts the text into the field you were typing in. The iOS keyboard cannot use the microphone. It opens Bol, and after you dictate there it inserts the text the app saved for it.

A short clip of the web preview is in [docs/demo/bol-dictation.mp4](docs/demo/bol-dictation.mp4). It shows the consent step, then the note that recording runs in the iOS and Android development build.

## Run it

You need Node 22.13 or newer. Expo SDK 58 does not run on Node 20.

```bash
cp .env.example .env
# put your own Sarvam key in .env as SARVAM_API_KEY

npm install
npm test
npm run server
```

The server listens on `http://127.0.0.1:8787`. `GET /health` returns `{ "ok": true }`.

In another terminal, start a development build. Expo Go for SDK 58 is not on the stores, and the microphone module is not in Expo Go.

```bash
npx expo run:ios
# or
npx expo run:android
```

On the Android emulator the screen defaults the server to `http://10.0.2.2:8787`. On the iOS simulator it uses `http://127.0.0.1:8787`. On a phone, set the server field to your computer’s LAN address and save it by leaving the field. The Android keyboard reads that address from the app’s files.

iOS builds need an Apple team id in `app.json` under `expo.ios.appleTeamId`. This checkout does not include one.

Stay on Xcode 26.4 or the closest 26.x you have. Do not move this version to Xcode 27.1.

## What stays out of git

`.env`, API keys, store certificates, and real voice recordings. The server reads `SARVAM_API_KEY` from the environment. Bring your own key from [Sarvam](https://www.sarvam.ai/).

## Keyboard setup

Android: open Bol, allow the microphone, tap “Enable the Bol keyboard”, and turn Bol on in the input-method list. In any text field, switch to Bol and tap Speak.

iOS: install the development build, Settings → General → Keyboard → Keyboards → Add Bol, and allow Full Access so the keyboard can read the shared transcript. Dictate in Bol. Switch back and tap Insert.

## Store listings

Draft App Store and Play copy, the privacy answers, and the consent text are in [store/](store/). Nothing has been submitted.
