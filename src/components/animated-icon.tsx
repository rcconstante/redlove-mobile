import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';

export function AnimatedSplashOverlay() {
  const styles = useThemedStyles(createStyles);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 450);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.splash}>
      <Image source={require('../../assets/images/applogo.png')} style={styles.logo} contentFit="contain" />
    </View>
  );
}

export function AnimatedIcon() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.iconContainer}>
      <Image source={require('../../assets/images/applogo.png')} style={styles.icon} contentFit="contain" />
    </View>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  splash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.background,
  },
  logo: {
    width: 180,
    height: 120,
  },
  iconContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 96,
    height: 64,
  },
  });
}
