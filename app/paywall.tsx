import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, ChoiceCard, Eyebrow, IconButton, Pill } from '@/components/ui';
import { APP_CONFIG } from '@/domain/config';
import { useAppStore } from '@/store/AppStore';
import { track } from '@/services/analytics';
import { colors, radius, spacing } from '@/theme';

export default function PaywallScreen() {
  const router = useRouter();
  const { state } = useAppStore();
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => track('paywall_viewed', { source: 'profile' }), []);
  const subscribe = () => { Alert.alert('Store billing unavailable', 'Glow+ will be available after Google Play and App Store billing are connected. No local entitlement was created.'); };

  return <Screen><View style={styles.top}><IconButton name="close" onPress={() => router.back()} label="Close paywall" /><Pill tone="accent">GLOW+</Pill></View><View style={styles.hero}><Eyebrow style={styles.eyebrow}>A DEEPER PERSONAL SIGNAL</Eyebrow><AppText variant="display" style={styles.white}>More context for the choices you make.</AppText><AppText style={styles.heroText}>Glow+ keeps learning your preferences and opens up the full blueprint, richer comparisons and a longer style history.</AppText></View><AppText variant="label" style={styles.section}>YOU'LL RECEIVE</AppText><View style={styles.benefits}><Benefit text="Full Glow Blueprint & advanced color direction" /><Benefit text="Premium goals and deeper recommendations" /><Benefit text="Unlimited non-generative style guidance" /><Benefit text="A richer private history of saved looks" /></View><AppText variant="label" style={styles.section}>CHOOSE YOUR RHYTHM</AppText>{APP_CONFIG.subscriptionPlans.map((item) => <ChoiceCard key={item.id} title={item.label} description={`${item.amountLabel} · ${item.detail}`} selected={plan === item.id} onPress={() => setPlan(item.id as 'monthly' | 'annual')} icon={item.id === 'annual' ? 'sparkles-outline' : 'calendar-outline'} />)}<Button tone="light" onPress={() => router.push('/credits')}>Need more Glow credits?</Button><Button tone="dark" onPress={subscribe} style={styles.cta}>{state.subscription.status === 'active' ? 'Manage Glow+' : `Continue with ${plan}`}</Button><AppText variant="caption" style={styles.note}>Store billing is not connected in this build. No local entitlement is created.</AppText></Screen>;
}

function Benefit({ text }: { text: string }) { return <View style={styles.benefit}><View style={styles.check}><AppText style={styles.checkText}>✓</AppText></View><AppText style={styles.benefitText}>{text}</AppText></View>; }

const styles = StyleSheet.create({
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  hero: { backgroundColor: colors.ink, borderRadius: radius.lg, gap: spacing.md, padding: spacing.lg },
  eyebrow: { color: colors.blush },
  white: { color: colors.paper },
  heroText: { color: '#D0C5BB' },
  section: { marginBottom: spacing.sm, marginTop: spacing.xl },
  benefits: { backgroundColor: colors.card, borderRadius: radius.md, gap: spacing.md, padding: spacing.md },
  benefit: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  check: { alignItems: 'center', backgroundColor: colors.sage, borderRadius: 12, height: 24, justifyContent: 'center', width: 24 },
  checkText: { color: colors.white, fontWeight: '800' },
  benefitText: { flex: 1 },
  cta: { marginTop: spacing.md },
  note: { color: colors.muted, marginTop: spacing.md, textAlign: 'center' },
});
