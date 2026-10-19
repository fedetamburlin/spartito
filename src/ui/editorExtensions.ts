import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { RangeSetBuilder, type Extension } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  drawSelection,
  highlightActiveLine,
  keymap,
  type DecorationSet,
  type ViewUpdate
} from '@codemirror/view';
import { scanChordProLine, type HighlightKind } from '../core/highlight';

const MARKS: Record<HighlightKind, Decoration> = {
  chord: Decoration.mark({ class: 'cm-chord' }),
  directive: Decoration.mark({ class: 'cm-directive' }),
  comment: Decoration.mark({ class: 'cm-comment' })
};

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  for (let n = 1; n <= doc.lines; n += 1) {
    const line = doc.line(n);
    for (const token of scanChordProLine(line.text)) {
      builder.add(line.from + token.from, line.from + token.to, MARKS[token.kind]);
    }
  }
  return builder.finish();
}

/** Songs fit a single page, so the whole document is re-scanned per change. */
const highlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged) this.decorations = buildDecorations(update.view);
    }
  },
  { decorations: (plugin) => plugin.decorations }
);

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--ui-text)',
    backgroundColor: 'var(--ui-panel)'
  },
  '.cm-content': {
    caretColor: 'var(--ui-text)',
    fontFamily: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace",
    fontSize: '13px',
    lineHeight: '1.55',
    padding: '12px 0'
  },
  '.cm-line': { padding: '0 12px' },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--ui-text)',
    borderLeftWidth: '2px'
  },
  '.cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--ui-selected)'
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--ui-selected)'
  },
  '.cm-activeLine': { backgroundColor: 'var(--ui-hover)' },
  '.cm-selectionMatch': { backgroundColor: 'var(--ui-badge-bg)' },
  '.cm-searchMatch': {
    backgroundColor: 'var(--ui-selected)',
    outline: '1px solid var(--ui-border)'
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'var(--ui-chip-border)'
  },
  '.cm-panels': {
    backgroundColor: 'var(--ui-panel-soft)',
    color: 'var(--ui-text)',
    border: 'none'
  },
  '.cm-panel input, .cm-panel button, .cm-panel label': {
    fontFamily: 'inherit',
    fontSize: '12px',
    color: 'var(--ui-text)',
    backgroundColor: 'var(--ui-control-bg)',
    border: '1px solid var(--ui-border)',
    borderRadius: '4px',
    padding: '2px 6px'
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--ui-panel)',
    border: '1px solid var(--ui-border)',
    color: 'var(--ui-text)'
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--ui-selected)',
    color: 'var(--ui-text)'
  }
});

export function editorExtensions(onChange: (text: string) => void): Extension[] {
  return [
    history(),
    drawSelection(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    EditorView.lineWrapping,
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
    highlighter,
    editorTheme,
    EditorView.contentAttributes.of({
      'aria-label': 'Song source (ChordPro)',
      spellcheck: 'false',
      autocapitalize: 'off',
      autocorrect: 'off'
    }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onChange(update.state.doc.toString());
    })
  ];
}
