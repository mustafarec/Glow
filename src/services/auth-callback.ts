export interface AuthCallbackParams {
  access_token?: string;
  refresh_token?: string;
  token_hash?: string;
  type?: string;
  code?: string;
  error?: string;
  error_description?: string;
}

export function parseAuthCallbackParams(url: string): AuthCallbackParams {
  const query = url.split('?')[1]?.split('#')[0] ?? '';
  const hash = url.split('#')[1] ?? '';
  const values = new Map<string, string>();

  for (const part of `${query}&${hash}`.split('&')) {
    if (!part) continue;
    const [rawKey, ...rawValue] = part.split('=');
    if (!rawKey) continue;
    values.set(decodeURIComponent(rawKey), decodeURIComponent(rawValue.join('=').replace(/\+/g, ' ')));
  }

  return {
    access_token: values.get('access_token'),
    refresh_token: values.get('refresh_token'),
    token_hash: values.get('token_hash'),
    type: values.get('type'),
    code: values.get('code'),
    error: values.get('error'),
    error_description: values.get('error_description'),
  };
}
