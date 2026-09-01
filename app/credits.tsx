import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, CreditBadge, Eyebrow, IconButton, Pill, SectionTitle } from '@/components/ui';
import { APP_CONFIG } from '@/domain/config';
import { useAppStore } from '@/store/AppStore';
import { track } from '@/services/analytics';
import { colors, radius, spacing } from '@/theme';

export default function CreditsScreen() {
  const router = useRouter();
  const { state, purchaseCredits } = useAppStore();
  const buy = (pack: typeof APP_CONFIG.creditPacks[number]) => { track('credit_pack_viewed', { packId: pack.id }); purchaseCredits(pack.id); Alert.alert('Credits added', `${pack.credits} Glow credits were added in demo mode.`); };
  return <Screen><View style={styles.top}><IconButton name="chevron-back" onPress={() => router.back()} label="Go back" /><CreditBadge balance={state.wallet.balance} /></View><Eyebrow>GLOW CREDITS</Eyebrow><AppText variant="display" style={styles.title}>Keep exploring.</AppText><AppText style={styles.subtitle}>Generative previews use credits. You’ll always see the cost before anything starts.</AppText><View style={styles.balance}><View><AppText variant="caption" style={styles.muted}>AVAILABLE NOW</AppText><AppText variant="display">{state.wallet.balance}</AppText></View><Pill tone="sage">No expiry in demo mode</Pill></View><SectionTitle>CHOOSE A PACK</SectionTitle>{APP_CONFIG.creditPacks.map((pack, index) => <View key={pack.id} style={[styles.pack, index === 1 && styles.featuredPack]}><View style={styles.packCopy}><AppText variant="eyebrow" style={index === 1 ? styles.white : styles.clay}>{index === 1 ? 'MOST POPULAR' : 'GLOW CREDITS'}</AppText><AppText variant="title" style={index === 1 ? styles.white : undefined}>{pack.label}</AppText><AppText variant="caption" style={index === 1 ? styles.packMuted : styles.muted}>{pack.credits} credits · {pack.amountLabel}</AppText></View><Button tone={index === 1 ? 'light' : 'dark'} onPress={() => buy(pack)}>Add credits</Button></View>)}<Button tone="quiet" onPress={() => router.push('/purchases')}>View purchase history</Button><AppText variant="caption" style={styles.note}>Demo purchases are local test records. Production packs must be connected to App Store / Google Play billing.</AppText></Screen>;
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { marginTop: spacing.md },
  subtitle: { color: colors.inkSoft, marginTop: spacing.md },
  balance: { alignItems: 'center', backgroundColor: colors.cream, borderRadius: radius.lg, flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, padding: spacing.lg },
  muted: { color: colors.inkSoft },
  pack: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.line, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, padding: spacing.md },
  featuredPack: { backgroundColor: colors.ink, borderColor: colors.ink },
  packCopy: { flex: 1, gap: 4 },
  clay: { color: colors.clay },
  white: { color: colors.paper },
  packMuted: { color: '#C9BEB4' },
  note: { color: colors.muted, marginTop: spacing.md, textAlign: 'center' },
});
