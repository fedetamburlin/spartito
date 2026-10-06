<script lang="ts">
  import { applySnippet, snippetById } from '../core/snippets';
  import ChordProHelp from './ChordProHelp.svelte';
  import InsertMenu from './InsertMenu.svelte';

  interface Props {
    source: string;
  }

  let { source = $bindable() }: Props = $props();

  let textarea = $state<HTMLTextAreaElement | null>(null);

  function insertSnippet(id: string) {
    const snippet = snippetById(id);
    const el = textarea;
    if (!snippet || !el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const edit = applySnippet(source, start, end, snippet);
    el.focus();
    el.setSelectionRange(start, end);
    let handled = false;
    try {
      handled = document.execCommand('insertText', false, edit.insertText);
    } catch {
      handled = false;
    }
    if (handled) {
      source = el.value;
    } else {
      el.setRangeText(edit.insertText, start, end, 'end');
      source = el.value;
    }
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  }
</script>

<section class="editor">
  <div class="pane-header">
    <h2 class="pane-title">Text (ChordPro)</h2>
    <ChordProHelp />
    <InsertMenu onInsert={insertSnippet} />
  </div>
  <textarea
    class="editor-area"
    spellcheck="false"
    autocomplete="off"
    bind:this={textarea}
    bind:value={source}
  ></textarea>
</section>
