import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Text } from '@/components/ui/text';
import { radius, type ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTheme } from '@/hooks/use-theme';
import { authService } from '@/services/auth.service';
import { validateEmail } from '@/utils/validation';
import { useState } from 'react';

export function FreePremiumBanner() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user, setUser } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user || !user.freePremiumGrantedAt || user.paypalConnected || dismissed) return null;

  const grantedAt = new Date(user.freePremiumGrantedAt);
  const daysSinceGrant = (Date.now() - grantedAt.getTime()) / (1000 * 60 * 60 * 24);
  const daysUntilRequired = Math.max(0, Math.ceil(14 - daysSinceGrant));
  const isPaused = user.freePremiumPaused;
  const title = isPaused ? 'Premium paused' : '1 month free premium';
  const message = isPaused
    ? 'Connect PayPal to resume your free month and get 30 bonus credits + 1 extra week.'
    : `Connect PayPal within ${daysUntilRequired} day${daysUntilRequired === 1 ? '' : 's'} to keep it and earn 30 bonus credits + 1 extra week.`;

  async function connectPayPal() {
    const email = paypalEmail.trim().toLowerCase();
    const validation = validateEmail(email);
    if (!validation.ok) {
      Alert.alert(validation.message ?? 'Enter a valid PayPal email');
      return;
    }
    setLoading(true);
    try {
      const result = await authService.connectPaypal(email);
      setUser(result.user);
      setOpen(false);
      setPaypalEmail('');
      Alert.alert('PayPal connected', 'You received 30 bonus credits and your premium was extended by 1 week.');
    } catch (err) {
      Alert.alert('Failed to connect', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${message}`} onPress={() => setOpen(true)} style={[styles.banner, isPaused ? styles.bannerPaused : null]}>
        <View style={styles.icon}>
          <Icon name={isPaused ? 'bell' : 'gift'} size={16} color={isPaused ? colors.danger : colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text variant="small" style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
          style={[styles.connectButton, isPaused ? styles.connectButtonDanger : null]}
        >
          <Text style={styles.connectButtonText}>Connect</Text>
        </Pressable>
        {!isPaused ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss premium trial banner"
            onPress={(event) => {
              event.stopPropagation();
              setDismissed(true);
            }}
            style={styles.dismiss}
          >
            <Icon name="close" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </Pressable>

      <Modal visible={open} title={title} onClose={() => setOpen(false)} onRequestClose={() => setOpen(false)}>
        <View style={styles.modalCopy}>
          <Text style={styles.modalTitle}>{message}</Text>
          <Text variant="muted">
            Enter the email address linked to your PayPal account. This keeps your subscription ready after the free month. No charge today.
          </Text>
          <View style={styles.benefits}>
            <Text style={styles.benefitTitle}>You will receive immediately:</Text>
            <Text variant="small">- 30 bonus credits</Text>
            <Text variant="small">- +1 extra week added to your premium</Text>
            {isPaused ? <Text variant="small">- Premium restored immediately</Text> : null}
          </View>
          <Input label="PayPal email address" value={paypalEmail} onChangeText={setPaypalEmail} keyboardType="email-address" autoCapitalize="none" />
          <Button title={loading ? 'Connecting...' : 'Connect and claim bonuses'} fullWidth loading={loading} onPress={connectPayPal} />
          <Button title="Open Premium" fullWidth variant="ghost" onPress={() => router.push('/premium')} />
        </View>
      </Modal>
    </>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  banner: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(233,30,99,0.08)',
    borderBottomColor: 'rgba(233,30,99,0.22)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerPaused: {
    backgroundColor: 'rgba(255,77,103,0.1)',
    borderBottomColor: 'rgba(255,77,103,0.32)',
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(233,30,99,0.12)',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    color: themeColors.primary,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  message: {
    color: themeColors.text,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  strong: {
    color: themeColors.primary,
    fontWeight: '900',
  },
  connectButton: {
    minHeight: 30,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: themeColors.primary,
  },
  connectButtonDanger: {
    backgroundColor: themeColors.danger,
  },
  connectButtonText: {
    color: themeColors.white,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  dismiss: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCopy: {
    gap: 14,
  },
  modalTitle: {
    color: themeColors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  benefits: {
    gap: 5,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: 'rgba(233,30,99,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(233,30,99,0.22)',
  },
  benefitTitle: {
    color: themeColors.primary,
    fontWeight: '900',
  },
  });
}
