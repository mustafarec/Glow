import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Eyebrow, GlowImage, IconButton, Pill, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

export default function RecommendationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, setFeedback, startGeneration } = useAppStore();
  const recommendation = state.recommendations.find((item) => item.id === id) ?? state.recommendations[0];
  const [busy, setBusy] = useState(false);

  if (!recommendation) return <Screen><Button onPress={() => router.replace('/category')}>Browse recommendations</Button></Screen>;

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    const result = await startGeneration(recommendation.id);
    setBusy(false);
    if (!result.ok) {
      if (result.reason === 'insufficient-credits') router.push('/credits');
      else Alert.alert('Not ready yet', 'This recommendation is no longer available.');
      return;
    }
    router.push('/generate');
  };

  return <Screen><View style={styles.top}><IconButton name="chevron-back" onPress={() => router.back()} label="Go back" /><Pill tone="dark">{recommendation.creditCost} credits</Pill></View><GlowImage uri={recommendation.imageUri} style={styles.heroImage} /><View style={styles.heroCopy}><Eyebrow style={styles.clay}>{recommendation.tag}</Eyebrow><AppText variant="display" style={styles.title}>{recommendation.title}</AppText><AppText style={styles.subtitle}>{recommendation.description}</AppText></View><View style={styles.why}><Eyebrow>WHY IT'S IN YOUR BLUEPRINT</Eyebrow><AppText variant="title">{recommendation.explanation}</AppText></View><SectionTitle>HOW IT FEELS</SectionTitle><View style={styles.tags}><Pill tone="sage">Optional</Pill><Pill tone="neutral">Mock concept</Pill><Pill tone="accent">{recommendation.category.replace('-', ' ')}</Pill></View><SectionTitle>YOUR REACTION</SectionTitle><View style={styles.feedback}><Button tone={state.feedback[recommendation.id] === 'love-it' ? 'accent' : 'light'} icon="heart-outline" onPress={() => setFeedback(recommendation.id, 'love-it')}>Love it</Button><Button tone={state.feedback[recommendation.id] === 'not-for-me' ? 'dark' : 'light'} icon="close-outline" onPress={() => setFeedback(recommendation.id, 'not-for-me')}>Not for me</Button></View><Button tone="dark" icon="eye-outline" disabled={busy} onPress={generate} style={styles.cta}>{busy ? 'Preparing your preview…' : `See me · ${recommendation.creditCost} credits`}</Button><AppText variant="caption" style={styles.disclaimer}>Your credit is reserved only when generation starts. If the preview fails, it is restored automatically.</AppText></Screen>;
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  heroImage: { borderRadius: radius.lg, height: 330, width: '100%' },
  heroCopy: { gap: spacing.sm, marginTop: spacing.lg },
  title: { marginTop: spacing.xs },
  subtitle: { color: colors.inkSoft },
  clay: { color: colors.clay },
  why: { backgroundColor: colors.sageSoft, borderRadius: radius.md, gap: spacing.sm, marginTop: spacing.lg, padding: spacing.lg },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  feedback: { flexDirection: 'row', gap: spacing.sm },
  cta: { marginTop: spacing.xl },
  disclaimer: { color: colors.muted, marginTop: spacing.md, textAlign: 'center' },
});
