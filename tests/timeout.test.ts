import { afterEach, describe, expect, it, vi } from 'vitest';
import { openLibraryDb } from '../src/core/db';
import { withTimeout } from '../src/core/timeout';

describe('withTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with the value when the promise settles in time', async () => {
    vi.useFakeTimers();
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });

  it('propagates the original rejection', async () => {
    vi.useFakeTimers();
    const boom = new Error('boom');
    await expect(withTimeout(Promise.reject(boom), 1000)).rejects.toBe(boom);
  });

  it('rejects with the given message when the promise never settles', async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise(() => {}), 3000, 'Library open timed out');
    const assertion = expect(pending).rejects.toThrow('Library open timed out');
    await vi.advanceTimersByTimeAsync(3000);
    await assertion;
  });

  it('clears its timer after an early resolve', async () => {
    vi.useFakeTimers();
    let resolve!: (value: string) => void;
    const promise = withTimeout(new Promise<string>((r) => (resolve = r)), 5000);

    resolve('done');
    await expect(promise).resolves.toBe('done');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears its timer after an early rejection', async () => {
    vi.useFakeTimers();
    const promise = withTimeout(Promise.reject(new Error('nope')), 5000);
    await expect(promise).rejects.toThrow('nope');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores a late resolve after the timeout fired', async () => {
    vi.useFakeTimers();
    let resolve!: (value: string) => void;
    const promise = withTimeout(new Promise<string>((r) => (resolve = r)), 100);
    const assertion = expect(promise).rejects.toThrow('Operation timed out');
    await vi.advanceTimersByTimeAsync(100);
    resolve('too late');
    await assertion;
  });
});

describe('openLibraryDb failure modes', () => {
  it('rejects with a clear message when another tab blocks the upgrade', async () => {
    const request = {} as IDBOpenDBRequest;
    vi.stubGlobal('indexedDB', { open: () => request });
    try {
      const opening = openLibraryDb();
      const blocked = request.onblocked as unknown as (() => void) | null;
      blocked?.();
      await expect(opening).rejects.toThrow(/blocked/i);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
