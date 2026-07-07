export type BilingualHelp = Readonly<{
  en: string;
  ar: string;
}>;

export function toBilingualHelp(en: string, ar: string): BilingualHelp {
  return { en, ar };
}
