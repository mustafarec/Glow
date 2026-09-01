import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, ChoiceCard, Eyebrow, GlowImage, IconButton, Pill } from '@/components/ui';
import { DEMO_SELFIE_URI } from '@/domain/constants';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

export default function SelfieScreen() {
  const router = useRouter();
  const { state, addSelfie, setImageConsent, useDemoProfile } = useAppStore();
  const [consented, setConsented] = useState(state.consentToUseImages);
  const [picking, setPicking] = useState(false);

  const pickSelfie = async () => {
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo permission needed', 'Glow only uses the photos you choose for your private profile. You can also continue with a demo profile.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.85 });
      if (!result.canceled && result.assets[0]) {
        addSelfie(result.assets[0].uri, state.selfies.length ? 'side' : 'front');
      }
    } finally {
      setPicking(false);
    }
  };

  const continueToAnalysis = () => {
    if (!consented || !state.selfies.length) {
      Alert.alert('One clear selfie first', 'Choose a clear front-facing selfie and confirm that Glow may use it for your private styling profile.');
      return;
    }
    setImageConsent(true);
    router.push('/analysis');
  };

  return (
    <Screen>
      <View style={styles.top}><IconButton name="chevron-back" onPress={() => router.back()} label="Go back" /><Pill tone="accent">Private by design</Pill></View>
      <Eyebrow>YOUR STARTING POINT</Eyebrow><AppText variant="display" style={styles.title}>Show us the real you.</AppText><AppText style={styles.subtitle}>Two or three clear angles help us suggest shape and color while keeping your identity yours.</AppText>
      <View style={styles.guidance}><View style={styles.guidanceItem}><View style={styles.check}><AppText style={styles.checkText}>✓</AppText></View><AppText>Natural light</AppText></View><View style={styles.guidanceItem}><View style={styles.check}><AppText style={styles.checkText}>✓</AppText></View><AppText>No heavy filter</AppText></View><View style={styles.guidanceItem}><View style={styles.check}><AppText style={styles.checkText}>✓</AppText></View><AppText>Face the camera</AppText></View></View>
      <Pressable onPress={pickSelfie} style={({ pressed }) => [styles.upload, pressed && styles.pressed]}><View style={styles.uploadIcon}><AppText variant="display" style={styles.plus}>+</AppText></View><AppText variant="title">{picking ? 'Opening your photos…' : 'Add a clear selfie'}</AppText><AppText variant="caption" style={styles.muted}>Front-facing is best · up to 3 photos</AppText></Pressable>
      {state.selfies.length ? <View style={styles.previewRow}>{state.selfies.map((selfie) => <GlowImage key={selfie.id} uri={selfie.uri} style={styles.preview} />)}</View> : <GlowImage uri={DEMO_SELFIE_URI} style={styles.demoPreview} />}
      <Pressable onPress={() => { const next = !consented; setConsented(next); setImageConsent(next); }} style={styles.consent}><View style={[styles.checkbox, consented && styles.checkboxChecked]}>{consented ? <AppText style={styles.checkText}>✓</AppText> : null}</View><AppText variant="caption" style={styles.consentText}>I agree that Glow may use the photos I choose to create my private Glow Profile. I can delete them any time.</AppText></Pressable>
      <Button tone="dark" icon="sparkles-outline" onPress={continueToAnalysis}>Create my blueprint</Button>
      <ChoiceCard title="Prefer to explore first?" description="Use a demo profile with placeholder imagery" onPress={() => { useDemoProfile(); router.replace('/blueprint'); }} icon="eye-outline" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { marginTop: spacing.md },
  subtitle: { color: colors.inkSoft, marginTop: spacing.md },
  guidance: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.lg },
  guidanceItem: { alignItems: 'center', backgroundColor: colors.cream, borderRadius: radius.md, flex: 1, gap: 6, justifyContent: 'center', minHeight: 88, padding: spacing.sm },
  check: { alignItems: 'center', backgroundColor: colors.sage, borderRadius: 20, height: 25, justifyContent: 'center', width: 25 },
  checkText: { color: colors.white, fontWeight: '800' },
  upload: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.clay, borderRadius: radius.lg, borderStyle: 'dashed', borderWidth: 1.5, gap: spacing.sm, padding: spacing.lg },
  uploadIcon: { alignItems: 'center', backgroundColor: colors.blushSoft, borderRadius: 30, height: 56, justifyContent: 'center', width: 56 },
  plus: { color: colors.clay, fontSize: 30, lineHeight: 37 },
  muted: { color: colors.muted },
  previewRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  preview: { borderRadius: radius.md, flex: 1, height: 120 },
  demoPreview: { alignSelf: 'center', borderRadius: radius.md, height: 150, marginTop: spacing.md, opacity: 0.35, width: 105 },
  consent: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.lg },
  checkbox: { alignItems: 'center', borderColor: colors.line, borderRadius: 7, borderWidth: 1, height: 24, justifyContent: 'center', width: 24 },
  checkboxChecked: { backgroundColor: colors.clay, borderColor: colors.clay },
  consentText: { flex: 1 },
  pressed: { opacity: 0.8 },
});
