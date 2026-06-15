'use client';

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/lib/shiki';

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  typescript: 'TS',
  javascript: 'JS',
  python: 'PY',
  rust: 'RS',
  go: 'GO',
  sql: 'SQL',
  bash: 'SH',
  json: 'JSON',
  css: 'CSS',
  html: 'HTML',
  markdown: 'MD',
};

interface LanguageSelectProps {
  value: SupportedLanguage;
  onChange: (lang: SupportedLanguage) => void;
  disabled?: boolean;
}

export function LanguageSelect({ value, onChange, disabled }: LanguageSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SupportedLanguage)}
      disabled={disabled}
      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-gray-400 focus:outline-none disabled:opacity-60"
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang} value={lang}>
          {LANGUAGE_LABELS[lang]} — {lang}
        </option>
      ))}
    </select>
  );
}
