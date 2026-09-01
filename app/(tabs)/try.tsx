import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, ChoiceCard, CreditBadge, Eyebrow, RecommendationCard, SectionTitle } from '@/components/ui';
import { CATEGORY_OPTIONS } from '@/domain/constants';
import { RecommendationCategory } from '@/domain/types';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

export default function TryScreen() {
  const router = useRouter();
  const { state } = useAppStore();
  const [activeCategory, setActiveCategory] = React.useState<RecommendationCategory | 'all'>('all');
  const filtered = activeCategory === 'all' ? state.recommendations : state.recommendations.filter((item) => item.category === activeCategory);

  return (
    <Screen>
      <View style={styles.topRow}><View style={styles.topCopy}><Eyebrow>TRY MY GLOW</Eyebrow><AppText variant="display">See what could suit you.</AppText></View><CreditBadge balance={state.wallet.balance} /></View>
      <AppText style={styles.intro}>Every suggestion starts with your Glow Profile, then gives you room to explore.</AppText>
      <SectionTitle>EXPLORE A DIRECTION</SectionTitle>
      <View style={styles.categoryGrid}>
        <ChoiceCard title="All suggestions" description="Ranked for you" selected={activeCategory === 'all'} onPress={() => setActiveCategory('all')} icon="sparkles-outline" />
        {CATEGORY_OPTIONS.map((category) => <ChoiceCard key={category.id} title={category.label} description={category.description} selected={activeCategory === category.id} onPress={() => setActiveCategory(category.id)} icon={category.id === 'hairstyle' ? 'cut-outline' : category.id === 'hair-color' ? 'color-palette-outline' : category.id === 'makeup' ? 'brush-outline' : 'sunny-outline'} />)}
      </View>
      <SectionTitle>{activeCategory === 'all' ? 'RANKED FOR YOU' : CATEGORY_OPTIONS.find((item) => item.id === activeCategory)?.label.toUpperCase()}</SectionTitle>
      {filtered.length ? filtered.map((item) => <RecommendationCard key={item.id} title={item.title} subtitle={item.subtitle} tag={item.tag} imageUri={item.imageUri} onPress={() => router.push({ pathname: '/recommendation', params: { id: item.id } })} />) : <View style={styles.empty}><AppText variant="title">No recommendations in this direction yet.</AppText><AppText style={styles.muted}>Try another category or update your glow goal.</AppText></View>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', paddingTop: spacing.sm },
  topCopy: { flex: 1, flexShrink: 1, minWidth: 0 },
  intro: { color: colors.inkSoft, marginTop: spacing.md, maxWidth: 350 },
  categoryGrid: { gap: 0 },
  empty: { backgroundColor: colors.card, borderRadius: 20, gap: 6, padding: spacing.lg },
  muted: { color: colors.muted },
});
