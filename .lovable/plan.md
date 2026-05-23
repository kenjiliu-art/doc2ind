# Word → InDesign Reformatter

A client-side web app: upload a `.docx`, review every paragraph in an interactive editor with per-line control, and export an InDesign-ready `.docx` plus tagged XML.

## User flow

1. **Upload** `.docx` on the home screen.
2. **Parse** — unzip in the browser, extract each paragraph with detected formatting (font, size, bold/italic, alignment, indent, leading tabs, soft breaks, empty-line runs, comments, tracked changes, hidden text).
3. **Auto-suggest** styles + rules per paragraph via heuristics.
4. **Edit** — interactive list with per-line + bulk controls.
5. **Export** — `reformatted.docx` and `tagged-text.xml`.

## Editor — per-line controls

Each paragraph row:

**Style**
- Paragraph style dropdown (Heading 1/2/3, Body, Caption, Quote, List, Custom…)
- Inline text edit

**Structural rules** (checkboxes)
- Tabs/first-line indents → paragraph margin
- Soft returns → hard returns (splits paragraph)
- Collapse preceding blank lines → page break
- Insert page break before
- Keep with next paragraph

**Cleanup rules** (checkboxes)
- Smart-quote standardization (straight → curly, consistent direction)
- Remove trailing spaces
- Accept tracked changes / remove comments on this paragraph

**Bulk actions**: select rows → apply style, toggle rules, or run a cleanup across selection.

## Style Sheet panel (right side)

Editable list of every paragraph + character style in use:

- Font family, size, weight, leading, space before/after, alignment
- Left / right / first-line indent
- **Hyphenation on/off** per style
- **Keep with next** default
- Maps directly to Word style definitions + InDesign tagged-text style declarations

Separate **Character Styles** subsection auto-populated from inline runs:
- `Bold`, `Italic`, `BoldItalic`, `Superscript`, `Subscript`, `Underline`, `SmallCaps`
- User can rename or merge (e.g., map all italic runs to "Emphasis")

## Document-wide cleanups (one-click before review)

- Accept all tracked changes, remove all comments
- Standardize smart quotes and apostrophes
- Strip trailing spaces from every paragraph
- Strip hidden text

These run on import so the review list is already clean; per-line toggles override.

## Transformations applied at export

- **Direct formatting → paragraph + character styles**: paragraphs get a named style; inline bold/italic/etc. become named **character styles** (not direct runs), so InDesign's Style Mapping picks them up.
- **Tabs & indents → margins**: leading `\t` characters and `firstLine` values become `ind` properties; literal tabs removed.
- **Soft returns → hard returns**: `<w:br/>` splits into separate paragraphs inheriting the style.
- **Blank lines → page break**: runs of ≥2 empty paragraphs collapse into one `<w:br w:type="page"/>`.
- **Manual page break before** / **keep with next**: set on paragraph properties.
- **Hyphenation flag** written into the style definition.
- **Tables**: structure preserved; each cell's paragraphs run through the same pipeline; exported as real Word tables and as InDesign Tagged Text `<TableStart…>` blocks with a default `Table Style` you can rename.
- **Images**: passed through, anchored to their paragraph, with a placeholder name in tagged text.

## Output

- **`reformatted.docx`** — rebuilt with the `docx` library; real paragraph + character styles in `styles.xml`, clean indents, no stray tabs/soft breaks, no comments/track changes.
- **`tagged-text.xml`** — Adobe InDesign Tagged Text with `<ParaStyle:…>`, `<CharStyle:…>`, table syntax, and the style sheet declarations at the top. File → Place into InDesign and styles map automatically.

## Routes

- `/` — upload + short explanation of what the tool does
- `/edit` — main editor (state in memory; refresh = re-upload)

## Tech / files

Client-only (no backend, no auth, no database).

```text
src/
  routes/
    index.tsx              upload dropzone + intro
    edit.tsx               editor shell (list + style panel + export bar)
  components/
    UploadDropzone.tsx
    ParagraphRow.tsx       inline edit + rule checkboxes + style dropdown
    BulkActionsBar.tsx
    StylePanel.tsx         paragraph + character style editor
    CleanupBar.tsx         doc-wide cleanup toggles
    ExportBar.tsx          download .docx and tagged xml
    TableRow.tsx           collapsed table row with cell preview
  lib/
    docx-parse.ts          JSZip + fast-xml-parser → Paragraph[]/Table[]
    detect.ts              style + rule heuristics
    cleanup.ts             smart quotes, trailing spaces, track-changes accept
    docx-build.ts          rebuild .docx with `docx` applying rules
    tagged-text.ts         emit InDesign Tagged Text
    types.ts
  store/
    editor.ts              Zustand: paragraphs, styles, selection, rules
```

Libraries to add: `jszip`, `fast-xml-parser`, `docx`, `zustand`, `file-saver`.

## Heuristics

- Font size ≥ 18pt + bold → Heading 1; 14–17pt + bold → Heading 2; 12–13pt + bold → Heading 3
- All-caps short line → Label
- Italic indented block → Quote
- Leading `\t` or non-zero `firstLine` → enable "tabs→margin"
- Contains soft break → enable "soft→hard"
- ≥2 preceding empty paragraphs → enable "page break before" on next non-empty
- Headings get "keep with next" + hyphenation off by default

User overrides any suggestion before export.

## Scope notes

- Footnotes/endnotes and complex multi-level numbered lists pass through unchanged in v1 (shown as read-only rows with a note).
- Drop caps and "keep lines together" deferred (can be set in InDesign quickly).
- Font substitution table deferred — InDesign's Find Font handles it well post-Place.
