import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { Screen } from '@/components/Screen';
import { AppText, Eyebrow, IconButton, Pill } from '@/components/ui';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

export default function CompareScreen() {
  const router = useRouter();
  const { lookId } = useLocalSearchParams<{ lookId?: string }>();
  const { state } = useAppStore();
  const look = state.generatedLooks.find((item) => item.id === lookId) ?? state.generatedLooks[0];
  if (!look) return <Screen><AppText variant="title">No preview to compare yet.</AppText></Screen>;
  return <Screen><View style={styles.top}><IconButton name="chevron-back" onPress={() => router.back()} label="Go back" /><Pill>Drag to compare</Pill><View style={styles.spacer} /></View><Eyebrow>BEFORE / AFTER</Eyebrow><AppText variant="display" style={styles.title}>See the difference, your way.</AppText><AppText style={styles.subtitle}>Move the divider across the image. This generated preview keeps the chosen direction separate from any judgment.</AppText><View style={styles.slider}><BeforeAfterSlider beforeUri={look.beforeImageUri} afterUri={look.resultImageUri} height={560} /></View></Screen>;
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  spacer: { height: 40, width: 40 },
  title: { marginTop: spacing.md },
  subtitle: { color: colors.inkSoft, marginTop: spacing.md },
  slider: { marginTop: spacing.lg },
});
