<script lang="ts">
  interface Props {
    source: string;
  }

  let { source = $bindable() }: Props = $props();
</script>

<section class="editor">
  <h2 class="pane-title">Text (ChordPro)</h2>
  <textarea
    class="editor-area"
    spellcheck="false"
    autocomplete="off"
    bind:value={source}
  ></textarea>
</section>
