import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, ChoiceCard, Eyebrow, IconButton, RecommendationCard, SectionTitle } from '@/components/ui';
import { CATEGORY_OPTIONS } from '@/domain/constants';
import { RecommendationCategory } from '@/domain/types';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

export default function CategoryScreen() {
  const router = useRouter();
  const { state } = useAppStore();
  const [category, setCategory] = useState<RecommendationCategory>(CATEGORY_OPTIONS[0].id);
  const matches = state.recommendations.filter((item) => item.category === category);

  return <Screen><View style={styles.top}><IconButton name="chevron-back" onPress={() => router.back()} label="Go back" /><View style={styles.spacer} /></View><Eyebrow>CHOOSE YOUR PLAYGROUND</Eyebrow><AppText variant="display" style={styles.title}>Where should we start?</AppText><AppText style={styles.subtitle}>Your ranked ideas stay connected to the same personal profile.</AppText><View style={styles.options}>{CATEGORY_OPTIONS.map((item) => <ChoiceCard key={item.id} title={item.label} description={item.description} selected={category === item.id} onPress={() => setCategory(item.id)} icon={item.id === 'hairstyle' ? 'cut-outline' : item.id === 'hair-color' ? 'color-palette-outline' : item.id === 'makeup' ? 'brush-outline' : 'sparkles-outline'} />)}</View><SectionTitle>RECOMMENDED IN {CATEGORY_OPTIONS.find((item) => item.id === category)?.label.toUpperCase()}</SectionTitle>{matches.length ? matches.map((item) => <RecommendationCard key={item.id} compact title={item.title} subtitle={item.subtitle} tag={item.tag} imageUri={item.imageUri} onPress={() => router.push({ pathname: '/recommendation', params: { id: item.id } })} />) : <View style={styles.empty}><AppText variant="title">More looks are coming soon.</AppText><AppText style={styles.muted}>Try another category while we keep learning your style.</AppText></View>}</Screen>;
}

const styles = StyleSheet.create({
  top: { marginBottom: spacing.xl },
  spacer: { height: 40, width: 40 },
  title: { marginTop: spacing.md },
  subtitle: { color: colors.inkSoft, marginTop: spacing.md },
  options: { marginTop: spacing.lg },
  empty: { backgroundColor: colors.card, borderRadius: 20, gap: 6, padding: spacing.lg },
  muted: { color: colors.muted },
});
