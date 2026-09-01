import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';

import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { Screen } from '@/components/Screen';
import { AppText, Button, Eyebrow, IconButton, Pill } from '@/components/ui';
import { useAppStore } from '@/store/AppStore';
import { track } from '@/services/analytics';
import { colors, spacing } from '@/theme';

export default function ResultScreen() {
  const router = useRouter();
  const { lookId } = useLocalSearchParams<{ lookId?: string }>();
  const { state, saveLook, toggleFavorite, addTimelineEntry } = useAppStore();
  const look = state.generatedLooks.find((item) => item.id === lookId) ?? state.generatedLooks[0];
  const [saved, setSaved] = useState(Boolean(look && state.savedLooks.some((item) => item.id === look.id)));

  if (!look) return <Screen><AppText variant="title">Your preview is no longer available.</AppText><Button onPress={() => router.replace('/(tabs)/try')}>Back to Try</Button></Screen>;

  const handleSave = () => {
    saveLook(look.id);
    setSaved(true);
  };

  const share = async () => {
    track('share_created', { lookId: look.id });
    await Share.share({ message: `My Glow look: ${look.title}. Discover what actually suits you with Glow.` });
    track('share_completed', { lookId: look.id });
  };

  const remember = () => {
    addTimelineEntry({ title: look.title, note: 'A look I wanted to remember.', imageUri: look.resultImageUri });
    Alert.alert('Added to your timeline', 'You can revisit this experiment whenever you want.');
  };

  return <Screen><View style={styles.top}><IconButton name="chevron-back" onPress={() => router.replace('/(tabs)/try')} label="Back to Try" /><Pill tone="sage">Preview ready</Pill><IconButton name="share-outline" onPress={share} label="Share result" /></View><Eyebrow>YOUR PERSONAL PREVIEW</Eyebrow><AppText variant="display" style={styles.title}>{look.title}</AppText><AppText style={styles.subtitle}>A generated visual direction to explore, not a verdict. Drag the divider to compare.</AppText><View style={styles.slider}><BeforeAfterSlider beforeUri={look.beforeImageUri} afterUri={look.resultImageUri} /></View><AppText variant="caption" style={styles.note}>The generated preview keeps your consented selfie as the source of truth.</AppText><View style={styles.actions}><Button tone={saved ? 'accent' : 'dark'} icon={saved ? 'checkmark' : 'bookmark-outline'} onPress={handleSave}>{saved ? 'Saved' : 'Save look'}</Button><Button tone="light" icon={look.isFavorite ? 'heart' : 'heart-outline'} onPress={() => toggleFavorite(look.id)}>{look.isFavorite ? 'Favorite' : 'Add favorite'}</Button></View><View style={styles.bottomActions}><Button tone="light" icon="git-compare-outline" onPress={() => router.push({ pathname: '/compare', params: { lookId: look.id } })}>Compare full screen</Button><Button tone="light" icon="time-outline" onPress={remember}>Add to timeline</Button><Button tone="quiet" icon="refresh-outline" onPress={() => router.push({ pathname: '/recommendation', params: { id: look.recommendationId } })}>Try a variation</Button></View></Screen>;
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  title: { marginTop: spacing.md },
  subtitle: { color: colors.inkSoft, marginTop: spacing.md },
  slider: { marginTop: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  bottomActions: { gap: spacing.sm, marginTop: spacing.lg },
  note: { color: colors.muted, marginTop: spacing.sm },
});
