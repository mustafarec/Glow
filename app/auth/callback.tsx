import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Eyebrow } from '@/components/ui';
import { completeAuthCallback } from '@/services/auth';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string; token_hash?: string; type?: string; code?: string; error?: string; error_description?: string }>();
  const { authConfigured } = useAppStore();

  useEffect(() => {
    let active = true;
    void completeAuthCallback({
      access_token: typeof params.access_token === 'string' ? params.access_token : undefined,
      refresh_token: typeof params.refresh_token === 'string' ? params.refresh_token : undefined,
      token_hash: typeof params.token_hash === 'string' ? params.token_hash : undefined,
      type: typeof params.type === 'string' ? params.type : undefined,
      code: typeof params.code === 'string' ? params.code : undefined,
      error: typeof params.error === 'string' ? params.error : undefined,
      error_description: typeof params.error_description === 'string' ? params.error_description : undefined,
    }).finally(() => {
      if (active) router.replace('/auth');
    });
    return () => {
      active = false;
    };
  }, [params.access_token, params.refresh_token, params.token_hash, params.type, params.code, params.error, params.error_description, router]);

  return <Screen scroll={false} contentStyle={styles.content}><View><Eyebrow>SECURE CONNECTION</Eyebrow><AppText variant="display" style={styles.title}>{authConfigured ? 'Finishing your sign in…' : 'Account sign in is not configured yet.'}</AppText><ActivityIndicator color={colors.clay} style={styles.spinner} /></View></Screen>;
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  title: { marginTop: spacing.md },
  spinner: { marginTop: spacing.xl },
});
