import { Modal as NativeModal, Pressable, StyleSheet, View, type ModalProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTheme } from '@/hooks/use-theme';
import { Icon } from './icon';
import { Text } from './text';

type Props = ModalProps & {
  title: string;
  onClose: () => void;
  layout?: 'sheet' | 'full';
};

export function Modal({ title, onClose, children, layout = 'sheet', ...props }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const full = layout === 'full';
  const Container = full ? SafeAreaView : View;

  return (
    <NativeModal transparent={!full} animationType="fade" {...props}>
      <View style={[styles.backdrop, full ? styles.fullBackdrop : null]}>
        <Container style={[styles.sheet, full ? styles.fullSheet : null]}>
          <View style={styles.header}>
            <Text variant="heading" style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
              <Icon name="close" size={18} color={colors.text} />
            </Pressable>
          </View>
          {children}
        </Container>
      </View>
    </NativeModal>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  fullBackdrop: {
    justifyContent: 'center',
    backgroundColor: themeColors.background,
  },
  sheet: {
    maxHeight: '86%',
    backgroundColor: themeColors.backgroundElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: 18,
    gap: 16,
  },
  fullSheet: {
    flex: 1,
    maxHeight: '100%',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.card,
  },
  });
}
