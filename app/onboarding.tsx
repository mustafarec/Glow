import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, ChoiceCard, Eyebrow, IconButton, Pill } from '@/components/ui';
import { FOCUS_OPTIONS, GOAL_OPTIONS } from '@/domain/constants';
import { FocusId, GlowGoalId } from '@/domain/types';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

export default function OnboardingScreen() {
  const router = useRouter();
  const { state, setOnboarding } = useAppStore();
  const [name, setName] = useState(state.displayName);
  const [goal, setGoal] = useState<GlowGoalId>(state.goal);
  const [focus, setFocus] = useState<FocusId>(state.focus);

  const continueToSelfie = () => {
    setOnboarding(name, goal, focus);
    router.push('/selfie');
  };

  return (
    <Screen>
      <View style={styles.top}><IconButton name="close" onPress={() => router.replace('/')} label="Close onboarding" /><Pill>2 min setup</Pill></View>
      <Eyebrow>LET'S MAKE IT PERSONAL</Eyebrow><AppText variant="display" style={styles.title}>What would you like to explore?</AppText><AppText style={styles.subtitle}>A few quick choices help us make your first blueprint feel like yours.</AppText>
      <AppText variant="label" style={styles.fieldLabel}>WHAT SHOULD WE CALL YOU?</AppText><TextInput value={name} onChangeText={setName} placeholder="Your first name" placeholderTextColor={colors.muted} style={styles.input} maxLength={30} autoCapitalize="words" />
      <AppText variant="label" style={styles.fieldLabel}>YOUR CURRENT GOAL</AppText>
      {GOAL_OPTIONS.slice(0, 6).map((item) => <ChoiceCard key={item.id} title={item.label} description={item.description} selected={goal === item.id} onPress={() => setGoal(item.id)} accent={item.accent} />)}
      <AppText variant="label" style={styles.fieldLabel}>WHAT MATTERS MOST RIGHT NOW?</AppText>
      <View>{FOCUS_OPTIONS.map((item) => <Pressable key={item.id} onPress={() => setFocus(item.id)} style={[styles.focusChip, focus === item.id && styles.focusChipSelected]}><View style={[styles.focusDot, focus === item.id && styles.focusDotSelected]} /><AppText style={focus === item.id ? styles.selectedText : undefined}>{item.label}</AppText></Pressable>)}</View>
      <Button tone="dark" disabled={!name.trim()} onPress={continueToSelfie} style={styles.continue}>Continue to selfies</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { marginTop: spacing.md, maxWidth: 360 },
  subtitle: { color: colors.inkSoft, marginBottom: spacing.lg, marginTop: spacing.md },
  fieldLabel: { marginBottom: spacing.sm, marginTop: spacing.lg },
  input: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 54, paddingHorizontal: spacing.md },
  focusChip: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.line, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12 },
  focusChipSelected: { backgroundColor: colors.blushSoft, borderColor: colors.clay },
  focusDot: { backgroundColor: colors.line, borderRadius: 10, height: 9, width: 9 },
  focusDotSelected: { backgroundColor: colors.clay },
  selectedText: { fontWeight: '700' },
  continue: { marginTop: spacing.xl },
});
