import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, EmptyState, Eyebrow, IconButton, Pill } from '@/components/ui';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

export default function PurchasesScreen() {
  const router = useRouter();
  const { state } = useAppStore();
  return <Screen><View style={styles.top}><IconButton name="chevron-back" onPress={() => router.back()} label="Go back" /><Pill>{state.purchases.length} records</Pill></View><Eyebrow>YOUR RECEIPTS</Eyebrow><AppText variant="display" style={styles.title}>Purchase history</AppText><AppText style={styles.subtitle}>A clear record of your Glow+ and credit activity.</AppText>{state.purchases.length ? state.purchases.map((item) => <View key={item.id} style={styles.row}><View style={styles.icon}><AppText>✦</AppText></View><View style={styles.copy}><AppText variant="label">{item.label}</AppText><AppText variant="caption" style={styles.muted}>{new Date(item.createdAt).toLocaleDateString()} {item.credits ? `· ${item.credits} credits` : ''}</AppText></View><AppText variant="label">{item.amountLabel}</AppText></View>) : <EmptyState icon="receipt-outline" title="No purchases yet." description="Purchases completed through the store will appear here." action="Browse credits" onAction={() => router.replace('/credits')} />}</Screen>;
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { marginTop: spacing.md },
  subtitle: { color: colors.inkSoft, marginTop: spacing.md },
  row: { alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm, padding: spacing.md },
  icon: { alignItems: 'center', backgroundColor: colors.blushSoft, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  copy: { flex: 1, gap: 3 },
  muted: { color: colors.muted },
});
