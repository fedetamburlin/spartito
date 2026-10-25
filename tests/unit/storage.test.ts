import { describe, expect, it } from 'vitest';
import { checkPersistentStorage, ensurePersistentStorage } from '../../src/core/storage';

describe('persistent storage', () => {
  it('reports granted when storage is already persisted', async () => {
    let requested = false;
    const state = await ensurePersistentStorage({
      persisted: async () => true,
      persist: async () => {
        requested = true;
        return true;
      }
    });
    expect(state).toBe('granted');
    expect(requested).toBe(false);
  });

  it('requests persistence once when not already granted', async () => {
    let calls = 0;
    const state = await ensurePersistentStorage({
      persisted: async () => false,
      persist: async () => {
        calls += 1;
        return true;
      }
    });
    expect(state).toBe('granted');
    expect(calls).toBe(1);
  });

  it('reports denied when the browser refuses', async () => {
    const state = await ensurePersistentStorage({
      persisted: async () => false,
      persist: async () => false
    });
    expect(state).toBe('denied');
  });

  it('reports unsupported without the API', async () => {
    expect(await ensurePersistentStorage({})).toBe('unsupported');
  });

  it('reports error when the API throws', async () => {
    const state = await ensurePersistentStorage({
      persisted: async () => {
        throw new Error('blocked');
      },
      persist: async () => true
    });
    expect(state).toBe('error');
  });
});

describe('persistent storage check', () => {
  it('never requests persistence while checking', async () => {
    let requested = false;
    const state = await checkPersistentStorage({
      persisted: async () => false,
      persist: async () => {
        requested = true;
        return true;
      }
    });
    expect(state).toBe('denied');
    expect(requested).toBe(false);
  });

  it('reports granted, unsupported and error states', async () => {
    expect(
      await checkPersistentStorage({
        persisted: async () => true,
        persist: async () => true
      })
    ).toBe('granted');
    expect(await checkPersistentStorage({})).toBe('unsupported');
    expect(
      await checkPersistentStorage({
        persisted: async () => {
          throw new Error('blocked');
        },
        persist: async () => true
      })
    ).toBe('error');
  });
});
