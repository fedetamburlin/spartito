import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { parseChordPro } from '../../../../src/core/chordpro';
import type { AppBridge } from '../deps';
import { printToPdf } from '../pdf/chrome';
import { outputPathFor } from '../pdf/render';
import { renderUrl } from '../pdf/url';

export interface LiveToolOptions {
  appUrl: string;
  outDir: string;
}

const settingsPatch = {
  fontId: z.string().optional(),
  textPt: z.number().optional(),
  columns: z.union([z.literal('auto'), z.literal(1), z.literal(2)]).optional(),
  marginsMm: z.number().optional(),
  transpose: z.number().int().optional(),
  textColor: z.string().optional(),
  chordColor: z.string().optional(),
  commentColor: z.string().optional()
};

function textResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

export function registerLiveTools(
  server: McpServer,
  bridge: AppBridge,
  options: LiveToolOptions
): void {
  server.registerTool(
    'get_song',
    {
      title: 'Get current song',
      description:
        'Returns the ChordPro source, the parsed song document and the layout settings of the song open in the Spartito web app.',
      inputSchema: {}
    },
    async () => {
      try {
        const state = bridge.getState();
        return textResult({
          source: state.source,
          document: parseChordPro(state.source),
          settings: state.settings
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    'set_song',
    {
      title: 'Replace song source',
      description: 'Replaces the ChordPro source of the song open in the Spartito web app.',
      inputSchema: { source: z.string().describe('Full ChordPro source to load in the editor') }
    },
    async ({ source }) => {
      try {
        await bridge.setSource(source);
        return textResult({ ok: true });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    'update_settings',
    {
      title: 'Update layout settings',
      description:
        'Updates layout settings (font, text size, columns, margins, colors, transposition) of the song open in the Spartito web app.',
      inputSchema: {
        patch: z
          .object(settingsPatch)
          .describe('Settings to change; omitted fields stay as they are')
      }
    },
    async ({ patch }) => {
      try {
        const settings = await bridge.updateSettings(patch);
        return textResult({ settings });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    'export_pdf',
    {
      title: 'Export the song as PDF',
      description:
        'Renders the current song with headless Chrome and writes an A4 PDF (default: out/<song>.pdf).',
      inputSchema: { path: z.string().optional().describe('Optional output file path') }
    },
    async ({ path: overridePath }) => {
      try {
        const state = bridge.getState();
        const outPath = outputPathFor(options.outDir, state.source, overridePath);
        const url = renderUrl(options.appUrl, state);
        const result = await printToPdf(url, outPath);
        return textResult({ path: outPath, bytes: result.bytes });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
