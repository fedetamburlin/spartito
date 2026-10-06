import type { SongSettings } from '../../../src/core/settings';

export interface AppState {
  source: string;
  settings: SongSettings;
}

export interface AppBridge {
  isConnected(): boolean;
  getState(): AppState;
  setSource(source: string): Promise<void>;
  updateSettings(patch: Partial<SongSettings>): Promise<SongSettings>;
}

export const APP_NOT_CONNECTED =
  'Spartito web app is not connected. Open the app and click the "opencode" button in the toolbar.';
