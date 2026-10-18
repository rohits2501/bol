import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { createSpeechProvider } from './provider.ts';
import { parseKeyterms, transcribeAudio } from './transcribe.ts';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0';

const server = createServer((request, response) => {
  void handle(request, response);
});

server.listen(port, host, () => {
  console.log(`Bol speech server listening on http://${host}:${port}`);
});

async function handle(request: IncomingMessage, response: ServerResponse) {
  setCors(response);
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { ok: true, provider: 'sarvam' });
    return;
  }
  if (request.method === 'POST' && request.url === '/v1/transcribe') {
    await transcribe(request, response);
    return;
  }
  sendJson(response, 404, { error: 'Not found.' });
}

async function transcribe(request: IncomingMessage, response: ServerResponse) {
  try {
    const audio = await readBody(request);
    const provider = createSpeechProvider(process.env);
    const keyterms = parseKeyterms(request.headers['x-keyterms']?.toString());
    const result = await transcribeAudio(audio, keyterms, provider);
    sendJson(response, 200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transcription failed.';
    const status = message.includes('SARVAM_API_KEY') ? 503 : 400;
    sendJson(response, status, { error: message });
  }
}

function readBody(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 2_000_000) {
        reject(new Error('The recording is longer than 30 seconds.'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function setCors(response: ServerResponse) {
  response.setHeader('access-control-allow-origin', '*');
  response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  response.setHeader('access-control-allow-headers', 'content-type, x-keyterms');
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}
