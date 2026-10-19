<script lang="ts">
  import { EditorState } from '@codemirror/state';
  import { EditorView } from '@codemirror/view';
  import { onMount } from 'svelte';
  import { applySnippet, directiveById } from '../core/directives';
  import { editorExtensions } from './editorExtensions';
  import ChordProHelp from './ChordProHelp.svelte';
  import InsertMenu from './InsertMenu.svelte';

  interface Props {
    source: string;
  }

  let { source = $bindable() }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);
  let view = $state.raw<EditorView | null>(null);

  function createState(doc: string): EditorState {
    return EditorState.create({
      doc,
      extensions: editorExtensions((text) => {
        source = text;
      })
    });
  }

  onMount(() => {
    if (!host) return;
    const created = new EditorView({ state: createState(source), parent: host });
    view = created;
    return () => {
      created.destroy();
      view = null;
    };
  });

  // Sync external updates (song switch, import, MCP set_song) into the
  // editor: a whole-document difference means the change came from outside,
  // so the state is rebuilt and the undo history does not cross songs.
  $effect(() => {
    const current = view;
    const next = source;
    if (!current || current.state.doc.toString() === next) return;
    current.setState(createState(next));
  });

  function insertSnippet(id: string) {
    const snippet = directiveById(id);
    const current = view;
    if (!snippet || !current) return;
    const { from, to } = current.state.selection.main;
    const edit = applySnippet(current.state.doc.toString(), from, to, snippet);
    current.dispatch({
      changes: { from, to, insert: edit.insertText },
      selection: { anchor: edit.selectionStart, head: edit.selectionEnd },
      scrollIntoView: true
    });
    current.focus();
  }
</script>

<section class="editor">
  <div class="pane-header">
    <h2 class="pane-title">Text (ChordPro)</h2>
    <ChordProHelp />
    <InsertMenu onInsert={insertSnippet} />
  </div>
  <div class="editor-cm" bind:this={host}></div>
</section>
