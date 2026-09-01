import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, ChoiceCard, Eyebrow, IconButton, Pill, SectionTitle } from '@/components/ui';
import { formatGoal } from '@/domain/constants';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { state } = useAppStore();
  return <Screen><View style={styles.top}><IconButton name="chevron-back" onPress={() => router.back()} label="Go back" /><Pill>{state.subscription.status === 'active' ? 'Glow+' : 'Free'}</Pill></View><Eyebrow>YOUR PREFERENCES</Eyebrow><AppText variant="display" style={styles.title}>Settings</AppText><AppText style={styles.subtitle}>Keep the details that guide your recommendations current.</AppText><SectionTitle>PERSONAL DIRECTION</SectionTitle><ChoiceCard title="Glow goal" description={formatGoal(state.goal)} icon="sparkles-outline" onPress={() => router.push('/goal')} /><ChoiceCard title="Focus" description={state.focus.replace('-', ' ')} icon="options-outline" /><ChoiceCard title="Photos" description={`${state.selfies.length} private photo${state.selfies.length === 1 ? '' : 's'} stored`} icon="images-outline" onPress={() => router.push('/privacy')} /><SectionTitle>APP</SectionTitle><ChoiceCard title="Notifications" description="Coming when reminders are useful" icon="notifications-outline" /><ChoiceCard title="Language" description="English · Turkish-ready architecture" icon="language-outline" /></Screen>;
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { marginTop: spacing.md },
  subtitle: { color: colors.inkSoft, marginTop: spacing.md },
});
