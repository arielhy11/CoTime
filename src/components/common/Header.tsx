import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRTL } from '../../hooks/useRTL';
import { colors, TOUCH_TARGET } from '../../theme/tokens';
import { AppText } from './AppText';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function Header({ title, onBack, right }: HeaderProps) {
  const router = useRouter();
  const rtl = useRTL();
  const { t } = useTranslation();
  const Chevron = rtl ? ChevronRight : ChevronLeft;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={styles.back}
        hitSlop={8}
      >
        <Chevron color={colors.text} size={26} />
      </Pressable>
      <AppText variant="bold" style={styles.title} center numberOfLines={1}>
        {title ?? ''}
      </AppText>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  title: { flex: 1, fontSize: 18 },
  right: { minWidth: TOUCH_TARGET, alignItems: 'flex-end' },
});
