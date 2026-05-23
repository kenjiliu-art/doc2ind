/** Convert straight quotes/apostrophes to typographic curly equivalents. */
export function smartQuotes(input: string): string {
  let s = input;
  s = s.replace(/(\w)'(\w)/g, "$1\u2019$2");
  s = s.replace(/(\w)'/g, "$1\u2019");
  s = s.replace(/(^|[\s(\[{])'/g, "$1\u2018");
  s = s.replace(/'/g, "\u2019");
  s = s.replace(/(^|[\s(\[{])"/g, "$1\u201C");
  s = s.replace(/"/g, "\u201D");
  s = s.replace(/\.{3}/g, "\u2026");
  return s;
}

/** Convert -- and --- to em dash; standalone " - " stays. */
export function dashes(input: string): string {
  let s = input;
  s = s.replace(/---/g, "\u2014"); // em dash
  s = s.replace(/--/g, "\u2014"); // em dash (Word convention)
  return s;
}

export function trimTrailing(input: string): string {
  return input.replace(/[ \t]+$/g, "");
}

export function collapseSpaces(input: string): string {
  return input.replace(/  +/g, " ");
}

const EN_SPACE = "\u2002";
const EM_SPACE = "\u2003";

export function multiSpaces(input: string, mode: "none" | "en" | "em"): string {
  if (mode === "none") return input;
  const repl = mode === "en" ? EN_SPACE : EM_SPACE;
  return input.replace(/  +/g, (match) => repl.repeat(match.length));
}

