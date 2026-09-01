import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, EmptyState, Eyebrow, GlowImage, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

export default function TimelineScreen() {
  const router = useRouter();
  const { state, addTimelineEntry } = useAppStore();

  const recordLatest = () => {
    const look = state.generatedLooks[0];
    addTimelineEntry({ title: look ? look.title : 'My first Glow note', note: look ? 'A look I wanted to remember.' : 'Starting my personal style experiment.', imageUri: look?.resultImageUri });
  };

  return (
    <Screen>
      <Eyebrow>YOUR STYLE JOURNAL</Eyebrow><AppText variant="display">Glow Timeline</AppText><AppText style={styles.intro}>Keep the experiments you chose. No rankings, no before-and-after judgment.</AppText>
      <Button tone="dark" icon="add" onPress={recordLatest}>Record this moment</Button>
      <SectionTitle>YOUR MILESTONES</SectionTitle>
      {state.timelineEntries.length ? state.timelineEntries.map((entry) => <View key={entry.id} style={styles.entry}>{entry.imageUri ? <GlowImage uri={entry.imageUri} style={styles.entryImage} /> : <View style={styles.entryDate}><AppText variant="eyebrow">GLOW</AppText></View>}<View style={styles.entryCopy}><AppText variant="eyebrow">{new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</AppText><AppText variant="title">{entry.title}</AppText><AppText variant="caption" style={styles.muted}>{entry.note}</AppText></View></View>) : <EmptyState icon="images-outline" title="Your story starts here." description="Save a look or record a moment to build a private visual journal." action="Try my Glow" onAction={() => router.push('/(tabs)/try')} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.inkSoft, marginBottom: spacing.lg, marginTop: spacing.md },
  entry: { alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, padding: spacing.sm },
  entryImage: { borderRadius: radius.md, height: 100, width: 84 },
  entryDate: { alignItems: 'center', backgroundColor: colors.sageSoft, borderRadius: radius.md, height: 100, justifyContent: 'center', width: 84 },
  entryCopy: { flex: 1, gap: 4 },
  muted: { color: colors.muted },
});
