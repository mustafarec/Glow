import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import { Image, ImageStyle, Pressable, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';

import { Badge as RNRBadge } from '@/components/ui/badge';
import { Button as RNRButton } from '@/components/ui/button';
import { Card as RNRCard } from '@/components/ui/card';
import { Separator as RNRSeparator } from '@/components/ui/separator';
import { Text as RNRText } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { colors, radius, shadows, spacing, typography } from '@/theme';

export type IconName = keyof typeof Ionicons.glyphMap;
type AppTextVariant = 'body' | 'caption' | 'label' | 'title' | 'display' | 'eyebrow';

export function Icon({ name, size = 20, color = colors.ink, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}

type AppTextProps = Omit<React.ComponentProps<typeof RNRText>, 'variant'> & { variant?: AppTextVariant };

const textClasses: Record<AppTextVariant, string> = {
  body: 'text-foreground',
  caption: 'text-muted-foreground',
  label: 'text-foreground',
  title: 'text-foreground',
  display: 'text-foreground',
  eyebrow: 'text-muted-foreground uppercase',
};

export function AppText({ children, variant = 'body', style, className, ...props }: AppTextProps) {
  return <RNRText {...props} className={cn(textClasses[variant], className)} style={[textStyles[variant], style]}>{children}</RNRText>;
}

export function Button({ children, onPress, tone = 'dark', icon, disabled = false, style }: { children: ReactNode; onPress?: () => void; tone?: 'dark' | 'light' | 'accent' | 'quiet'; icon?: IconName; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const toneStyle = toneStyles[tone];
  return (
    <RNRButton
      disabled={disabled}
      onPress={onPress}
      variant={toneStyle.variant}
      className={cn('min-h-[54px] rounded-full px-6', toneStyle.className)}
      style={[styles.buttonShadow, style]}
    >
      {icon ? <Icon name={icon} size={18} color={toneStyle.text.color} /> : null}
      <RNRText style={[styles.buttonText, toneStyle.text]}>{children}</RNRText>
    </RNRButton>
  );
}

export function IconButton({ name, onPress, label, tone = 'light' }: { name: IconName; onPress?: () => void; label?: string; tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <RNRButton
      accessibilityLabel={label}
      onPress={onPress}
      variant={dark ? 'default' : 'outline'}
      size="icon"
      className={cn('rounded-full', dark ? 'bg-foreground' : 'border-border bg-card')}
    >
      <Icon name={name} size={20} color={dark ? colors.paper : colors.ink} />
    </RNRButton>
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
  return (
    <RNRBadge variant={toneStyle.variant} className={cn('min-h-7 rounded-full border-transparent px-3 py-1', toneStyle.className)}>
      {icon ? <Icon name={icon} size={13} color={toneStyle.text.color} /> : null}
      <RNRText style={[styles.pillText, toneStyle.text]}>{children}</RNRText>
    </RNRBadge>
  );
}

export function CreditBadge({ balance }: { balance: number }) {
  return <View style={styles.creditBadge}><Pill tone="dark" icon="sparkles-outline">{balance} credits</Pill></View>;
}

export function GlowImage({ uri, style, accessibilityLabel }: { uri: string; style?: StyleProp<ImageStyle>; accessibilityLabel?: string }) {
  return <Image source={{ uri }} accessibilityLabel={accessibilityLabel} style={[styles.glowImage, style]} resizeMode="cover" />;
}

export function ImagePlaceholder({ style, label }: { style?: StyleProp<ViewStyle>; label?: string }) {
  return (
    <View accessibilityRole="image" accessibilityLabel={label ?? 'Image preview unavailable until it is generated.'} style={[styles.imagePlaceholder, style]}>
      <Icon name="sparkles-outline" size={28} color={colors.clay} />
      {label ? <AppText variant="caption" style={styles.placeholderText}>{label}</AppText> : null}
    </View>
  );
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
    <Pressable onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} style={({ pressed }) => [pressed && styles.pressed]}>
      <RNRCard className={cn('mb-2 min-h-[76px] flex-row items-center gap-2 rounded-xl border px-2 py-2 shadow-none', selected && 'border-primary bg-accent')}>
        <View style={[styles.choiceIcon, { backgroundColor: accent ?? colors.cream }]}>{icon ? <Icon name={icon} size={20} color={selected ? colors.white : colors.ink} /> : <View style={styles.choiceDot} />}</View>
        <View style={styles.choiceCopy}><AppText variant="label">{title}</AppText>{description ? <AppText variant="caption" style={styles.mutedText}>{description}</AppText> : null}</View>
        <Icon name={selected ? 'checkmark-circle' : 'chevron-forward'} size={20} color={selected ? colors.clay : colors.muted} />
      </RNRCard>
    </Pressable>
  );
}

export function RecommendationCard({ title, subtitle, tag, imageUri, onPress, compact = false }: { title: string; subtitle: string; tag: string; imageUri?: string; onPress?: () => void; compact?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} style={({ pressed }) => [pressed && styles.pressed]}>
      <RNRCard className={cn(
        compact
          ? 'mb-2 min-h-[88px] flex-row items-center gap-2 rounded-xl border p-2 shadow-none'
          : 'mb-4 overflow-hidden rounded-3xl border-0 p-0 shadow-sm',
      )}>
        {imageUri ? <GlowImage uri={imageUri} style={compact ? styles.recommendationCompactImage : styles.recommendationImage} /> : <ImagePlaceholder style={compact ? styles.recommendationCompactImage : styles.recommendationImage} />}
        <View style={styles.recommendationCopy}>
          <AppText variant="eyebrow" style={styles.clayText}>{tag}</AppText>
          <AppText variant={compact ? 'label' : 'title'} style={styles.recommendationTitle}>{title}</AppText>
          <AppText variant="caption" style={styles.mutedText}>{subtitle}</AppText>
        </View>
        <Icon name="arrow-forward" size={18} color={colors.inkSoft} />
      </RNRCard>
    </Pressable>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><AppText variant="title">{value}</AppText><AppText variant="caption" style={styles.mutedText}>{label}</AppText></View>;
}

export function Divider() {
  return <RNRSeparator className="my-4" />;
}

export function EmptyState({ icon = 'sparkles-outline', title, description, action, onAction }: { icon?: IconName; title: string; description: string; action?: string; onAction?: () => void }) {
  return (
    <RNRCard className="items-center justify-center gap-2 rounded-3xl border-0 px-6 py-8 shadow-none">
      <Icon name={icon} size={28} color={colors.clay} />
      <AppText variant="title" style={styles.emptyTitle}>{title}</AppText>
      <AppText style={styles.mutedText}>{description}</AppText>
      {action ? <Button tone="light" onPress={onAction}>{action}</Button> : null}
    </RNRCard>
  );
}

const textStyles = StyleSheet.create({
  body: { fontFamily: typography.body, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: typography.body, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: typography.body, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  title: { fontFamily: typography.display, fontSize: 23, lineHeight: 29, fontWeight: '500' },
  display: { fontFamily: typography.display, fontSize: 39, lineHeight: 45, fontWeight: '500', letterSpacing: -0.7 },
  eyebrow: { fontFamily: typography.body, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, lineHeight: 16 },
});

const styles = StyleSheet.create({
  buttonShadow: { ...shadows.soft },
  buttonText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 50, marginBottom: spacing.lg },
  headerCopy: { alignItems: 'center', flex: 1, paddingHorizontal: spacing.sm },
  headerSpacer: { height: 40, width: 40 },
  creditBadge: { flexShrink: 0 },
  sectionTitle: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, marginTop: spacing.lg },
  actionText: { color: colors.clay, fontWeight: '700' },
  pillText: { fontSize: 13, fontWeight: '700' },
  imageSurface: { backgroundColor: colors.cream, borderRadius: radius.lg, overflow: 'hidden' },
  glowImage: { backgroundColor: colors.cream, borderRadius: radius.md },
  imagePlaceholder: { alignItems: 'center', backgroundColor: colors.cream, justifyContent: 'center' },
  placeholderText: { color: colors.inkSoft, marginTop: spacing.sm, maxWidth: 230, textAlign: 'center' },
  imageShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20, 16, 12, 0.12)' },
  choiceIcon: { alignItems: 'center', borderRadius: radius.sm, height: 48, justifyContent: 'center', width: 48 },
  choiceDot: { backgroundColor: colors.clay, borderRadius: radius.pill, height: 9, width: 9 },
  choiceCopy: { flex: 1, gap: 2 },
  mutedText: { color: colors.muted },
  clayText: { color: colors.clay },
  recommendationImage: { borderRadius: 0, height: 185, width: '100%' },
  recommendationCopy: { flex: 1, gap: 4, padding: spacing.md },
  recommendationTitle: { marginTop: 2 },
  recommendationCompactImage: { borderRadius: radius.sm, height: 70, width: 70 },
  stat: { flex: 1, gap: 2 },
  emptyTitle: { marginTop: spacing.xs, textAlign: 'center' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});

const toneStyles = {
  dark: { variant: 'default' as const, className: 'bg-foreground', text: { color: colors.paper } },
  light: { variant: 'outline' as const, className: 'border-border bg-card', text: { color: colors.ink } },
  accent: { variant: 'default' as const, className: 'bg-primary', text: { color: colors.white } },
  quiet: { variant: 'ghost' as const, className: 'bg-transparent', text: { color: colors.clay } },
};

const pillStyles = {
  neutral: { variant: 'secondary' as const, className: 'bg-secondary', text: { color: colors.inkSoft } },
  accent: { variant: 'outline' as const, className: 'bg-accent', text: { color: colors.clayDark } },
  sage: { variant: 'secondary' as const, className: 'bg-[#E2E9DF]', text: { color: colors.success } },
  dark: { variant: 'default' as const, className: 'bg-foreground', text: { color: colors.paper } },
};
