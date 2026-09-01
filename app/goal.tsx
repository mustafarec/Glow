import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, ChoiceCard, Eyebrow, IconButton } from '@/components/ui';
import { GOAL_OPTIONS } from '@/domain/constants';
import { GlowGoalId } from '@/domain/types';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

export default function GoalScreen() {
  const router = useRouter();
  const { state, setGoal } = useAppStore();
  const [goal, setLocalGoal] = useState<GlowGoalId>(state.goal);
  const save = async () => { await setGoal(goal); router.back(); };
  return <Screen><View style={styles.top}><IconButton name="chevron-back" onPress={() => router.back()} label="Go back" /><View style={styles.spacer} /></View><Eyebrow>GLOW GOALS</Eyebrow><AppText variant="display" style={styles.title}>How do you want to feel?</AppText><AppText style={styles.subtitle}>Your goal changes the emphasis of recommendations — not your worth.</AppText>{GOAL_OPTIONS.map((item) => <ChoiceCard key={item.id} title={item.label} description={item.description} accent={item.accent} selected={goal === item.id} onPress={() => setLocalGoal(item.id)} />)}<Button tone="dark" onPress={save} style={styles.save}>Save this goal</Button></Screen>;
}

const styles = StyleSheet.create({
  top: { marginBottom: spacing.xl },
  spacer: { height: 40, width: 40 },
  title: { marginTop: spacing.md },
  subtitle: { color: colors.inkSoft, marginTop: spacing.md },
  save: { marginTop: spacing.lg },
});
