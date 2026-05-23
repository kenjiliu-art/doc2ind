/** Convert straight quotes/apostrophes to typographic curly equivalents. */
export function smartQuotes(input: string): string {
  let s = input;
  // Apostrophes: between letters or after a letter
  s = s.replace(/(\w)'(\w)/g, "$1\u2019$2");
  s = s.replace(/(\w)'/g, "$1\u2019");
  // Opening single after whitespace/start
  s = s.replace(/(^|[\s(\[{])'/g, "$1\u2018");
  // Remaining straight singles -> closing
  s = s.replace(/'/g, "\u2019");
  // Double quotes
  s = s.replace(/(^|[\s(\[{])"/g, "$1\u201C");
  s = s.replace(/"/g, "\u201D");
  // Em dash
  s = s.replace(/ -- /g, "\u2014");
  // Ellipsis
  s = s.replace(/\.{3}/g, "\u2026");
  return s;
}

export function trimTrailing(input: string): string {
  return input.replace(/[ \t]+$/g, "");
}

export function collapseSpaces(input: string): string {
  return input.replace(/  +/g, " ");
}
