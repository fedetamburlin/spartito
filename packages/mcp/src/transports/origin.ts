export const DEFAULT_APP_URL = 'https://fedetamburlin.github.io/spartito';

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

export function isAllowedOrigin(
  origin: string | undefined,
  appUrl: string = DEFAULT_APP_URL
): boolean {
  if (!origin) return false;
  if (LOCAL_ORIGIN.test(origin)) return true;
  try {
    return origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}

export function isAllowedHost(host: string | undefined): boolean {
  return host !== undefined && LOCAL_HOST.test(host);
}
