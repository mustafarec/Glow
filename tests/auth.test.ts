import { describe, expect, it } from 'vitest';

import { parseAuthCallbackParams } from '../src/services/auth-callback';

describe('auth callback boundary', () => {
  it('parses both query and hash callback values without exposing them to app state', () => {
    const parsed = parseAuthCallbackParams('glow://auth/callback#access_token=access%20token&refresh_token=refresh%2Btoken&type=magiclink');
    expect(parsed).toEqual({
      access_token: 'access token',
      refresh_token: 'refresh+token',
      token_hash: undefined,
      type: 'magiclink',
      code: undefined,
      error: undefined,
      error_description: undefined,
    });
  });

  it('keeps provider errors available for a generic UI failure state', () => {
    expect(parseAuthCallbackParams('https://glow.local/auth/callback?error=access_denied&error_description=User%20cancelled')).toMatchObject({
      error: 'access_denied',
      error_description: 'User cancelled',
    });
  });
});
