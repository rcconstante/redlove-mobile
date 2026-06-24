import { Pressable, StyleSheet, View } from 'react-native';

import { radius, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Text } from './text';

export function OptionGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrapper}>
      <Text variant="label">{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const active = option === value;
          return (
            <Pressable key={option} style={[styles.option, active ? styles.active : null]} onPress={() => onChange(option)}>
              <Text style={[styles.optionText, active ? styles.activeText : null]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderColor: themeColors.border,
    borderWidth: 1,
    justifyContent: 'center',
  },
  active: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  optionText: {
    color: themeColors.textMuted,
    fontWeight: '700',
  },
  activeText: {
    color: themeColors.white,
  },
  });
}
