import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, ChoiceCard, CreditBadge, Divider, Eyebrow, Pill, SectionTitle } from '@/components/ui';
import { isGlowPlus } from '@/domain/entitlements';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { state } = useAppStore();
  const premium = isGlowPlus(state.subscription);

  return (
    <Screen>
      <View style={styles.topRow}><View style={styles.topCopy}><Eyebrow>YOUR SPACE</Eyebrow><AppText variant="display">Profile</AppText></View><CreditBadge balance={state.wallet.balance} /></View>
      <View style={styles.identity}><View style={styles.avatar}><AppText variant="title" style={styles.avatarText}>{(state.profile?.displayName ?? state.displayName).slice(0, 1).toUpperCase()}</AppText></View><View style={styles.identityCopy}><AppText variant="title">{state.profile?.displayName ?? state.displayName}</AppText><AppText variant="caption" style={styles.muted}>Your Glow Profile is private to you.</AppText></View><Pill tone={premium ? 'sage' : 'neutral'}>{premium ? 'GLOW+' : 'FREE'}</Pill></View>
      {!premium ? <View style={styles.premiumCard}><View style={styles.premiumCopy}><Eyebrow style={styles.premiumEyebrow}>GLOW+</Eyebrow><AppText variant="title" style={styles.white}>More context for your choices.</AppText><AppText variant="caption" style={styles.premiumText}>Unlock the full blueprint, advanced recommendations and a deeper style history.</AppText></View><Button tone="light" onPress={() => router.push('/paywall')}>Explore Glow+</Button></View> : null}
      <SectionTitle>YOUR LIBRARY</SectionTitle>
      <ChoiceCard title="Saved looks" description={`${state.savedLooks.length} saved experiment${state.savedLooks.length === 1 ? '' : 's'}`} icon="heart-outline" onPress={() => router.push('/saved')} />
      <ChoiceCard title="Glow Type card" description="Share your color direction" icon="share-social-outline" onPress={() => router.push('/share-card')} />
      <ChoiceCard title="Glow credits" description={`${state.wallet.balance} available`} icon="sparkles-outline" onPress={() => router.push('/credits')} />
      <SectionTitle>ACCOUNT & PRIVACY</SectionTitle>
      <ChoiceCard title="Account" description="Apple, Google or email" icon="person-circle-outline" onPress={() => router.push('/auth')} />
      <ChoiceCard title="Settings" description="Personal details and preferences" icon="settings-outline" onPress={() => router.push('/settings')} />
      <ChoiceCard title="Privacy & data" description="Storage, permissions, delete data" icon="shield-checkmark-outline" onPress={() => router.push('/privacy')} />
      <Divider /><AppText variant="caption" style={styles.footer}>Glow is a styling companion, not a beauty score. Every suggestion is optional and designed to help you explore what feels like you.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', paddingTop: spacing.sm },
  topCopy: { flex: 1, flexShrink: 1, minWidth: 0 },
  identity: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.line, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, padding: spacing.md },
  avatar: { alignItems: 'center', backgroundColor: colors.clay, borderRadius: 40, height: 58, justifyContent: 'center', width: 58 },
  avatarText: { color: colors.white, fontSize: 22 },
  identityCopy: { flex: 1, gap: 3 },
  muted: { color: colors.muted },
  premiumCard: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, padding: spacing.lg },
  premiumCopy: { flex: 1, gap: spacing.sm },
  premiumEyebrow: { color: colors.blush },
  white: { color: colors.paper },
  premiumText: { color: '#CDC4BC' },
  footer: { color: colors.muted, lineHeight: 20, textAlign: 'center' },
});
