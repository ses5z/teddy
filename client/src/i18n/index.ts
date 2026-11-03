import en from './en.json';
import tr from './tr.json';

export type { Language } from '@teddy/shared';
import type { Language } from '@teddy/shared';
export type TKey = keyof typeof tr;

// Typed against tr.json: a key missing from en.json fails the typecheck.
const dictionaries: Record<Language, Record<TKey, string>> = { tr, en };

export function translate(
  lang: Language,
  key: TKey,
  params?: Record<string, string | number>,
): string {
  const text = dictionaries[lang][key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
