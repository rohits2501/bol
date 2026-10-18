# Privacy

Bol is a personal showcase. This is the privacy notice to ship with a later store build, and the answers for App Store privacy labels and the Play Data safety form.

## What is collected

When you tap Speak, Bol records up to 30 seconds of microphone audio. The app sends that WAV to the server address on the screen. The server sends it to Sarvam AI (`api.sarvam.ai`) with model `saaras:v4` and mode `codemix`, plus any names you typed into “Names and places”.

The server holds the audio only for that request. It does not write the file to disk. The transcript stays on the phone until you edit it, replace it, or delete the app.

There is no account, no advertising identifier, and no analytics SDK in this version.

## Why

The purpose is to turn your speech into text you asked for. That is the only purpose.

## Where it goes

Sarvam states that Indian customer audio is processed in India and is not used to train models by default. Bol relies on that for the speech vendor. Your own server, if you run one, is wherever you host it. The sample server in this repo runs on your machine.

## Your choices

The microphone stays off until you agree on the first screen. You can refuse. You can change or clear the transcript. Deleting the app removes the local transcript, the saved server address, and the consent flag.

## Store form answers

App Store privacy nutrition:

- Data used to track you: none
- Data linked to you: none in this version, because there is no account
- Data not linked to you: Audio Data, used for App Functionality, not used for tracking

Play Data safety:

- Collects audio: yes
- Shared: yes, with the speech-to-text processor (Sarvam)
- Processed ephemerally: yes, on the Bol server
- Encrypted in transit: yes (HTTPS to Sarvam; use HTTPS for your own server when it is not on localhost)
- Users can request deletion: deleting the app deletes everything Bol stored. The server has nothing left to delete.

## Children

This version is not directed at children. Do not collect an account for a child without a separate consent design. The Digital Personal Data Protection Act operational duties, including children’s data rules, start on 13 May 2027. Revisit this notice before that date if Bol is in the stores.
