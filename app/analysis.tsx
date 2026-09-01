import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Eyebrow, Pill } from '@/components/ui';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

const steps = ['Reading your starting point', 'Mapping your color direction', 'Curating your first recommendations'];

export default function AnalysisScreen() {
  const router = useRouter();
  const { runAnalysis } = useAppStore();
  const [step, setStep] = useState(0);
  const [progress] = useState(new Animated.Value(0));
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    Animated.timing(progress, { toValue: 1, duration: 3200, useNativeDriver: false }).start();
    const interval = setInterval(() => setStep((current) => Math.min(2, current + 1)), 900);
    void runAnalysis().then(() => {
      clearInterval(interval);
      router.replace('/blueprint');
    });
    return () => clearInterval(interval);
  }, [progress, router, runAnalysis]);

  return <Screen scroll={false} contentStyle={styles.content}><View style={styles.orbit}><View style={styles.orbitInner}><AppText variant="display" style={styles.sparkle}>✦</AppText></View></View><Eyebrow>BUILDING YOUR GLOW PROFILE</Eyebrow><AppText variant="display" style={styles.title}>A little context goes a long way.</AppText><AppText style={styles.subtitle}>We’re looking for styling signals — never a beauty score.</AppText><View style={styles.progressTrack}><Animated.View style={[styles.progressFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['8%', '100%'] }) }]} /></View><View style={styles.stepList}>{steps.map((item, index) => <View key={item} style={styles.step}><View style={[styles.stepDot, index <= step && styles.stepDotActive]}>{index < step ? <AppText style={styles.checkText}>✓</AppText> : null}</View><AppText style={index === step ? styles.activeStep : styles.inactiveStep}>{item}</AppText></View>)}</View><Pill tone="sage">Your photos stay yours</Pill></Screen>;
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', justifyContent: 'center', paddingBottom: 70 },
  orbit: { alignItems: 'center', backgroundColor: colors.blushSoft, borderRadius: 100, height: 142, justifyContent: 'center', marginBottom: spacing.xl, width: 142 },
  orbitInner: { alignItems: 'center', backgroundColor: colors.clay, borderRadius: 70, height: 82, justifyContent: 'center', width: 82 },
  sparkle: { color: colors.white, fontSize: 42 },
  title: { marginTop: spacing.md, maxWidth: 350, textAlign: 'center' },
  subtitle: { color: colors.inkSoft, marginBottom: spacing.xl, marginTop: spacing.md, maxWidth: 330, textAlign: 'center' },
  progressTrack: { backgroundColor: colors.line, borderRadius: 4, height: 7, overflow: 'hidden', width: '100%' },
  progressFill: { backgroundColor: colors.clay, borderRadius: 4, height: '100%' },
  stepList: { alignSelf: 'stretch', gap: spacing.md, marginVertical: spacing.xl },
  step: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  stepDot: { alignItems: 'center', backgroundColor: colors.line, borderRadius: 20, height: 24, justifyContent: 'center', width: 24 },
  stepDotActive: { backgroundColor: colors.clay },
  checkText: { color: colors.white, fontWeight: '800' },
  activeStep: { color: colors.ink, fontWeight: '700' },
  inactiveStep: { color: colors.muted },
});
