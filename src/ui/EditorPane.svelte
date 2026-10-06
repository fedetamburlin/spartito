<script lang="ts">
  import ChordProHelp from './ChordProHelp.svelte';

  interface Props {
    source: string;
  }

  let { source = $bindable() }: Props = $props();
</script>

<section class="editor">
  <div class="pane-header">
    <h2 class="pane-title">Text (ChordPro)</h2>
    <ChordProHelp />
  </div>
  <textarea
    class="editor-area"
    spellcheck="false"
    autocomplete="off"
    bind:value={source}
  ></textarea>
</section>
