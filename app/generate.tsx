import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, CreditBadge, Eyebrow, IconButton, Pill } from '@/components/ui';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

export default function GenerateScreen() {
  const router = useRouter();
  const { state } = useAppStore();
  const job = state.activeJobId ? state.generationJobs[state.activeJobId] : undefined;
  const navigated = useRef(false);

  useEffect(() => {
    if (job?.status === 'completed' && job.resultLookId && !navigated.current) {
      navigated.current = true;
      router.replace({ pathname: '/result', params: { lookId: job.resultLookId } });
    }
  }, [job?.resultLookId, job?.status, router]);

  return <Screen scroll={false} contentStyle={styles.content}><View style={styles.top}><IconButton name="close" onPress={() => router.replace('/(tabs)/try')} label="Close preview" /><CreditBadge balance={state.wallet.balance} /></View><View style={styles.loader}><View style={styles.loaderOuter}><View style={styles.loaderInner}><AppText variant="display" style={styles.sparkle}>✦</AppText></View></View><Eyebrow>GLOW LAB · PRODUCTION AI</Eyebrow><AppText variant="display" style={styles.title}>{job?.status === 'failed' ? 'Let’s try that again.' : 'Making space for your next look.'}</AppText><AppText style={styles.subtitle}>{job?.status === 'failed' ? job.error : 'Your consented selfie stays behind the authenticated server boundary while your selected direction is rendered.'}</AppText><View style={styles.steps}><Step active={job?.status === 'processing' || job?.status === 'queued'} label="Reading your profile" /><Step active={job?.status === 'processing'} label="Rendering the direction" /><Step active={false} label="Polishing your preview" /></View>{job?.status === 'failed' ? <Pill tone="accent">Your credits were restored</Pill> : <Pill tone="sage">Usually ready in a moment</Pill>}</View></Screen>;
}

function Step({ active, label }: { active: boolean; label: string }) { return <View style={styles.step}><View style={[styles.dot, active && styles.dotActive]} /><AppText variant="caption" style={active ? styles.activeStep : styles.inactiveStep}>{label}</AppText></View>; }

const styles = StyleSheet.create({
  content: { paddingBottom: 70 },
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  loader: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 50 },
  loaderOuter: { alignItems: 'center', backgroundColor: colors.blushSoft, borderRadius: 100, height: 170, justifyContent: 'center', marginBottom: spacing.xl, width: 170 },
  loaderInner: { alignItems: 'center', backgroundColor: colors.clay, borderRadius: 70, height: 92, justifyContent: 'center', width: 92 },
  sparkle: { color: colors.white, fontSize: 46 },
  title: { marginTop: spacing.md, maxWidth: 350, textAlign: 'center' },
  subtitle: { color: colors.inkSoft, marginTop: spacing.md, maxWidth: 340, textAlign: 'center' },
  steps: { alignSelf: 'stretch', backgroundColor: colors.card, borderRadius: 20, gap: spacing.md, marginVertical: spacing.xl, padding: spacing.lg },
  step: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  dot: { backgroundColor: colors.line, borderRadius: 10, height: 10, width: 10 },
  dotActive: { backgroundColor: colors.clay },
  activeStep: { color: colors.ink, fontWeight: '700' },
  inactiveStep: { color: colors.muted },
});
