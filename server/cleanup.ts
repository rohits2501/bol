const SPOKEN_CORRECTION =
  /\s*(?:scratch that|scratch it|काट दो)\s*/i;

const ENGLISH_FILLER = /(^|\s)(?:um+|uh+|er+|ah+|hmm+)(?=\s|[.,?!।]|$)/gi;

const HINDI_FILLER = /(^|\s)मतलब(?=\s|[.,?!।]|$)/g;

export function cleanupTranscript(raw: string): string {
  const corrected = applySpokenCorrection(raw);
  const withoutFillers = corrected
    .replace(ENGLISH_FILLER, ' ')
    .replace(HINDI_FILLER, ' ');
  const collapsed = withoutFillers.replace(/\s+/g, ' ').trim();
  return finishSentence(collapsed);
}

function applySpokenCorrection(raw: string): string {
  if (!SPOKEN_CORRECTION.test(raw)) {
    return raw;
  }
  const parts = raw.split(SPOKEN_CORRECTION);
  return parts[parts.length - 1] ?? '';
}

function finishSentence(text: string): string {
  if (!text) {
    return '';
  }
  if (/[.?!।]$/.test(text)) {
    return text;
  }
  return `${text}.`;
}
