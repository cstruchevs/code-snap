import { createHighlighter, type Highlighter } from 'shiki';

export const SUPPORTED_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'sql',
  'bash',
  'json',
  'css',
  'html',
  'markdown',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

let highlighter: Highlighter | null = null;

async function getHighlighter() {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [...SUPPORTED_LANGUAGES],
    });
  }
  return highlighter;
}

export async function highlightCode(
  code: string,
  language: string,
  theme: 'github-dark' | 'github-light' = 'github-dark'
): Promise<string> {
  const shiki = await getHighlighter();
  const lang = SUPPORTED_LANGUAGES.includes(language as SupportedLanguage) ? language : 'text';
  return shiki.codeToHtml(code, { lang, theme });
}
