import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import { Image, ImageStyle, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export function Icon({ name, size = 20, color = colors.ink, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}

export function AppText({ children, variant = 'body', style, ...props }: React.ComponentProps<typeof Text> & { variant?: 'body' | 'caption' | 'label' | 'title' | 'display' | 'eyebrow' }) {
  return <Text {...props} style={[textStyles[variant], style]}>{children}</Text>;
}

export function Button({ children, onPress, tone = 'dark', icon, disabled = false, style }: { children: ReactNode; onPress?: () => void; tone?: 'dark' | 'light' | 'accent' | 'quiet'; icon?: IconName; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const toneStyle = toneStyles[tone];
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, toneStyle.button, disabled && styles.disabled, pressed && !disabled && styles.pressed, style]}>
      {icon ? <Icon name={icon} size={18} color={toneStyle.text.color} /> : null}
      <AppText style={[styles.buttonText, toneStyle.text]}>{children}</AppText>
    </Pressable>
  );
}

export function IconButton({ name, onPress, label, tone = 'light' }: { name: IconName; onPress?: () => void; label?: string; tone?: 'light' | 'dark' }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, tone === 'dark' ? styles.iconButtonDark : styles.iconButtonLight, pressed && styles.pressed]}>
      <Icon name={name} size={20} color={tone === 'dark' ? colors.paper : colors.ink} />
    </Pressable>
  );
}

export function ScreenHeader({ title, eyebrow, onBack, right }: { title?: string; eyebrow?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      {onBack ? <IconButton name="chevron-back" onPress={onBack} label="Go back" /> : <View style={styles.headerSpacer} />}
      <View style={styles.headerCopy}>
        {eyebrow ? <AppText variant="eyebrow">{eyebrow}</AppText> : null}
        {title ? <AppText variant="title" numberOfLines={1}>{title}</AppText> : null}
      </View>
      {right ?? <View style={styles.headerSpacer} />}
    </View>
  );
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <AppText variant="eyebrow" style={style}>{children}</AppText>;
}

export function SectionTitle({ children, action, onAction }: { children: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <AppText variant="label">{children}</AppText>
      {action ? <Pressable onPress={onAction}><AppText variant="caption" style={styles.actionText}>{action}</AppText></Pressable> : null}
    </View>
  );
}

export function Pill({ children, tone = 'neutral', icon }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'sage' | 'dark'; icon?: IconName }) {
  const toneStyle = pillStyles[tone];
  return <View style={[styles.pill, toneStyle.container]}>{icon ? <Icon name={icon} size={13} color={toneStyle.text.color} /> : null}<AppText variant="caption" style={[styles.pillText, toneStyle.text]}>{children}</AppText></View>;
}

export function CreditBadge({ balance }: { balance: number }) {
  return <View style={styles.creditBadge}><Pill tone="dark" icon="sparkles-outline">{balance} credits</Pill></View>;
}

export function GlowImage({ uri, style, accessibilityLabel }: { uri: string; style?: StyleProp<ImageStyle>; accessibilityLabel?: string }) {
  return <Image source={{ uri }} accessibilityLabel={accessibilityLabel} style={[styles.glowImage, style]} resizeMode="cover" />;
}

export function ImageSurface({ uri, children, style, height = 220 }: { uri: string; children?: ReactNode; style?: StyleProp<ViewStyle>; height?: number }) {
  return (
    <View style={[styles.imageSurface, { height }, style]}>
      <GlowImage uri={uri} style={StyleSheet.absoluteFill} />
      <View style={styles.imageShade} />
      {children}
    </View>
  );
}

export function ChoiceCard({ selected, title, description, onPress, accent, icon }: { selected?: boolean; title: string; description?: string; onPress?: () => void; accent?: string; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.choiceCard, selected && styles.choiceCardSelected, pressed && styles.pressed]}>
      <View style={[styles.choiceIcon, { backgroundColor: accent ?? colors.cream }]}>{icon ? <Icon name={icon} size={20} color={selected ? colors.white : colors.ink} /> : <View style={styles.choiceDot} />}</View>
      <View style={styles.choiceCopy}><AppText variant="label">{title}</AppText>{description ? <AppText variant="caption" style={styles.mutedText}>{description}</AppText> : null}</View>
      <Icon name={selected ? 'checkmark-circle' : 'chevron-forward'} size={20} color={selected ? colors.clay : colors.muted} />
    </Pressable>
  );
}

export function RecommendationCard({ title, subtitle, tag, imageUri, onPress, compact = false }: { title: string; subtitle: string; tag: string; imageUri: string; onPress?: () => void; compact?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [compact ? styles.recommendationCompact : styles.recommendationCard, pressed && styles.pressed]}>
      <GlowImage uri={imageUri} style={compact ? styles.recommendationCompactImage : styles.recommendationImage} />
      <View style={styles.recommendationCopy}>
        <AppText variant="eyebrow" style={styles.clayText}>{tag}</AppText>
        <AppText variant={compact ? 'label' : 'title'} style={styles.recommendationTitle}>{title}</AppText>
        <AppText variant="caption" style={styles.mutedText}>{subtitle}</AppText>
      </View>
      <Icon name="arrow-forward" size={18} color={colors.inkSoft} />
    </Pressable>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><AppText variant="title">{value}</AppText><AppText variant="caption" style={styles.mutedText}>{label}</AppText></View>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function EmptyState({ icon = 'sparkles-outline', title, description, action, onAction }: { icon?: IconName; title: string; description: string; action?: string; onAction?: () => void }) {
  return <View style={styles.emptyState}><Icon name={icon} size={28} color={colors.clay} /><AppText variant="title" style={styles.emptyTitle}>{title}</AppText><AppText style={styles.mutedText}>{description}</AppText>{action ? <Button tone="light" onPress={onAction}>{action}</Button> : null}</View>;
}

const textStyles = StyleSheet.create({
  body: { color: colors.ink, fontFamily: typography.body, fontSize: 16, lineHeight: 24 },
  caption: { color: colors.inkSoft, fontFamily: typography.body, fontSize: 13, lineHeight: 19 },
  label: { color: colors.ink, fontFamily: typography.body, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  title: { color: colors.ink, fontFamily: typography.display, fontSize: 23, lineHeight: 29, fontWeight: '500' },
  display: { color: colors.ink, fontFamily: typography.display, fontSize: 39, lineHeight: 45, fontWeight: '500', letterSpacing: -0.7 },
  eyebrow: { color: colors.muted, fontFamily: typography.body, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, lineHeight: 16, textTransform: 'uppercase' },
});

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 50, marginBottom: spacing.lg },
  headerCopy: { alignItems: 'center', flex: 1, paddingHorizontal: spacing.sm },
  headerSpacer: { height: 40, width: 40 },
  creditBadge: { flexShrink: 0 },
  iconButton: { alignItems: 'center', borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  iconButtonLight: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1 },
  iconButtonDark: { backgroundColor: colors.ink },
  button: { alignItems: 'center', borderRadius: radius.pill, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 54, paddingHorizontal: spacing.lg },
  buttonText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  sectionTitle: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, marginTop: spacing.lg },
  actionText: { color: colors.clay, fontWeight: '700' },
  pill: { alignItems: 'center', borderRadius: radius.pill, flexDirection: 'row', gap: 5, minHeight: 28, paddingHorizontal: 11 },
  pillText: { fontWeight: '700' },
  imageSurface: { backgroundColor: colors.cream, borderRadius: radius.lg, overflow: 'hidden' },
  glowImage: { backgroundColor: colors.cream, borderRadius: radius.md },
  imageShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20, 16, 12, 0.12)' },
  choiceCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, minHeight: 76, padding: spacing.sm },
  choiceCardSelected: { borderColor: colors.clay, backgroundColor: colors.blushSoft },
  choiceIcon: { alignItems: 'center', borderRadius: radius.sm, height: 48, justifyContent: 'center', width: 48 },
  choiceDot: { backgroundColor: colors.clay, borderRadius: radius.pill, height: 9, width: 9 },
  choiceCopy: { flex: 1, gap: 2 },
  mutedText: { color: colors.muted },
  clayText: { color: colors.clay },
  recommendationCard: { backgroundColor: colors.card, borderRadius: radius.lg, ...shadows.soft, marginBottom: spacing.md, overflow: 'hidden' },
  recommendationImage: { borderRadius: 0, height: 185, width: '100%' },
  recommendationCopy: { flex: 1, gap: 4, padding: spacing.md },
  recommendationTitle: { marginTop: 2 },
  recommendationCompact: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, minHeight: 88, padding: spacing.sm },
  recommendationCompactImage: { borderRadius: radius.sm, height: 70, width: 70 },
  stat: { flex: 1, gap: 2 },
  divider: { backgroundColor: colors.line, height: 1, marginVertical: spacing.md },
  emptyState: { alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, gap: spacing.sm, justifyContent: 'center', padding: spacing.xl, textAlign: 'center' },
  emptyTitle: { marginTop: spacing.xs, textAlign: 'center' },
});

const toneStyles = {
  dark: { button: { backgroundColor: colors.ink }, text: { color: colors.paper } },
  light: { button: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1 }, text: { color: colors.ink } },
  accent: { button: { backgroundColor: colors.clay }, text: { color: colors.white } },
  quiet: { button: { backgroundColor: 'transparent' }, text: { color: colors.clay } },
} as const;

const pillStyles = {
  neutral: { container: { backgroundColor: colors.cream }, text: { color: colors.inkSoft } },
  accent: { container: { backgroundColor: colors.blushSoft }, text: { color: colors.clayDark } },
  sage: { container: { backgroundColor: colors.sageSoft }, text: { color: colors.success } },
  dark: { container: { backgroundColor: colors.ink }, text: { color: colors.paper } },
} as const;
