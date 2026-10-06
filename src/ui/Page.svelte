<script lang="ts">
  import { fontStack, config } from '../core/config';
  import type { LayoutParams } from '../core/fit';
  import type { SongDocument } from '../core/model';
  import type { SongSettings } from '../core/settings';

  interface Props {
    doc: SongDocument;
    layout: LayoutParams;
    settings: SongSettings;
    capo?: number;
  }

  let { doc, layout, settings, capo = 0 }: Props = $props();

  const pageStyle = $derived(
    [
      `--text-pt: ${layout.textPt}pt`,
      `--chord-pt: ${layout.chordPt}pt`,
      `--leading: ${config.layout.leading}`,
      `--section-gap: ${config.layout.sectionGapEm}em`,
      `--page-margin: ${settings.marginsMm}mm`,
      `--text-color: ${settings.textColor}`,
      `--chord-color: ${settings.chordColor}`,
      `--comment-color: ${settings.commentColor}`,
      `--font-family: ${fontStack(settings.fontId)}`
    ].join('; ')
  );
</script>

<div
  class="page"
  class:columns-1={layout.columns !== 2}
  class:columns-2={layout.columns === 2}
  style={pageStyle}
>
  <header class="song-head">
    {#if doc.title}<h1 class="song-title">{doc.title}</h1>{/if}
    {#if doc.subtitle}<p class="song-subtitle">{doc.subtitle}</p>{/if}
    {#if capo > 0}<p class="song-capo">Capo {capo}</p>{/if}
  </header>
  <div class="content">
    {#each doc.blocks as block}
      {#if block.kind === 'section'}
        <section
          class="section"
          class:chorus={block.type === 'chorus'}
          class:bridge={block.type === 'bridge'}
        >
          {#if block.label}<div class="section-label">{block.label}</div>{/if}
          {#each block.items as item}
            {#if item.kind === 'line'}
              <div class="line">{#each item.words as word, index}<span class="pair">{#if word.chords.length > 0}<span class="chords">{#each word.chords as chord}<span class="chord">{chord}</span>{/each}</span>{/if}<span class="word">{word.text}</span></span>{#if index < item.words.length - 1}{' '}{/if}{/each}</div>
            {:else if item.kind === 'grid'}
              <div class="line grid">{#each item.chords as chord}<span class="gchord">{chord}</span>{/each}</div>
            {:else if item.kind === 'comment'}
              <div class="comment">{item.text}</div>
            {:else if item.kind === 'tab'}
              <div class="tab-block">
                {#if item.label}<div class="section-label">{item.label}</div>{/if}
                <pre class="tab">{item.lines.join('\n')}</pre>
              </div>
            {:else if item.kind === 'grid-block'}
              <div class="grid-block">
                {#if item.label}<div class="section-label">{item.label}</div>{/if}
                {#each item.rows as row}
                  <div class="grid-row">
                    {#each row as token}
                      {#if token.kind === 'chord'}
                        <span class="gchord">{token.chord}</span>
                      {:else if token.kind === 'bar'}
                        <span class="gbar">{token.symbol}</span>
                      {:else if token.kind === 'empty'}
                        <span class="gempty">{token.symbol}</span>
                      {:else}
                        <span class="gtext">{token.text}</span>
                      {/if}
                    {/each}
                  </div>
                {/each}
              </div>
            {:else if item.kind === 'chorus-recall'}
              <div class="chorus-recall">{item.label}</div>
            {/if}
          {/each}
        </section>
      {:else if block.kind === 'comment'}
        <div class="comment">{block.text}</div>
      {/if}
    {/each}
  </div>
</div>
