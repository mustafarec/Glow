import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, ChoiceCard, Divider, Eyebrow, IconButton, Pill, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

export default function PrivacyScreen() {
  const router = useRouter();
  const { state, deleteAllData } = useAppStore();
  const confirmDelete = () => Alert.alert('Delete your Glow data?', 'This removes the profile, selfies, saved looks, timeline and purchase history from the current account and device.', [{ text: 'Keep my data', style: 'cancel' }, { text: 'Delete everything', style: 'destructive', onPress: () => { void deleteAllData().then(() => router.replace('/onboarding')).catch(() => Alert.alert('Could not delete data', 'The account copy could not be reached. Nothing was hidden or silently removed. Try again when you are online.')); } }]);
  return <Screen><View style={styles.top}><IconButton name="chevron-back" onPress={() => router.back()} label="Go back" /><Pill tone="sage">Private by design</Pill></View><Eyebrow>YOUR CONTROL CENTER</Eyebrow><AppText variant="display" style={styles.title}>Privacy & data</AppText><AppText style={styles.subtitle}>Glow should make experimenting feel safe. You choose what is uploaded and when it leaves your device.</AppText><SectionTitle>WHAT GLOW DOES</SectionTitle><ChoiceCard title="Private photo storage" description={`${state.selfies.length} selected photo${state.selfies.length === 1 ? '' : 's'} · never sent to analytics`} icon="lock-closed-outline" /><ChoiceCard title="No beauty scores" description="We do not rank attractiveness or judge your timeline" icon="heart-outline" /><ChoiceCard title="Explicit image use" description="Photos are used only to create your profile and previews" icon="checkmark-circle-outline" /><Divider /><AppText variant="title">Delete all local data</AppText><AppText variant="caption" style={styles.muted}>This is immediate and irreversible in the MVP. Production deletion will also call the authenticated server cleanup flow and remove private storage objects.</AppText><Button tone="light" icon="trash-outline" onPress={confirmDelete} style={styles.delete}>Delete my Glow data</Button><AppText variant="caption" style={styles.footer}>Supabase RLS, signed URLs and server-side deletion are defined in the production migration.</AppText></Screen>;
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { marginTop: spacing.md },
  subtitle: { color: colors.inkSoft, marginTop: spacing.md },
  muted: { color: colors.inkSoft },
  delete: { borderColor: colors.danger, marginTop: spacing.lg },
  footer: { color: colors.muted, marginTop: spacing.lg, textAlign: 'center' },
});
