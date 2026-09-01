import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/theme';
import { AppText, GlowImage } from './ui';

export function BeforeAfterSlider({ beforeUri, afterUri, height = 430 }: { beforeUri: string; afterUri: string; height?: number }) {
  const [width, setWidth] = useState(1);
  const [split, setSplit] = useState(0.5);

  const updateSplit = (x: number) => setSplit(Math.min(0.92, Math.max(0.08, x / width)));
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width || 1);

  return (
    <View
      style={[styles.frame, { height }]}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(event) => updateSplit(event.nativeEvent.locationX)}
      onResponderMove={(event) => updateSplit(event.nativeEvent.locationX)}
    >
      <GlowImage uri={beforeUri} style={StyleSheet.absoluteFill} />
      <View style={[styles.afterClip, { width: width * split }]}><GlowImage uri={afterUri} style={StyleSheet.absoluteFill} /></View>
      <View style={[styles.handle, { left: width * split - 1, pointerEvents: 'none' }]}><View style={styles.handlePill}><Text style={styles.handleText}>↔</Text></View></View>
      <View style={[styles.labels, { pointerEvents: 'none' }]}><AppText variant="eyebrow" style={styles.label}>BEFORE</AppText><AppText variant="eyebrow" style={styles.label}>AFTER</AppText></View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: colors.cream, borderRadius: radius.lg, overflow: 'hidden', width: '100%' },
  afterClip: { bottom: 0, left: 0, overflow: 'hidden', position: 'absolute', top: 0 },
  handle: { alignItems: 'center', backgroundColor: colors.white, bottom: 0, justifyContent: 'center', position: 'absolute', top: 0, width: 2 },
  handlePill: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: radius.pill, height: 38, justifyContent: 'center', width: 38 },
  handleText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  labels: { bottom: 14, flexDirection: 'row', justifyContent: 'space-between', left: 16, position: 'absolute', right: 16 },
  label: { color: colors.white },
});
