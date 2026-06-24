import { router, usePathname } from 'expo-router';
import { useContext, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { radius, shadow, type ThemeColors } from '@/constants/theme';
import { NotificationContext } from '@/contexts/notification-context';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTheme } from '@/hooks/use-theme';
import { callsService } from '@/services/calls.service';
import { startCallRingtone, stopCallRingtone, type CallRingtoneRef } from '@/utils/call-audio';

function activeChatMatchId(pathname: string) {
  const match = pathname.match(/^\/chat\/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function GlobalIncomingCallBanner() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const notifications = useContext(NotificationContext);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const ringtoneRef = useRef<CallRingtoneRef['current']>(null);
  const call = notifications?.incomingCall ?? null;
  const hiddenInCurrentChat = call ? activeChatMatchId(pathname) === call.match_id : false;
  const visible = Boolean(call && !hiddenInCurrentChat);

  useEffect(() => {
    if (!visible) {
      stopCallRingtone(ringtoneRef);
      return undefined;
    }
    startCallRingtone(ringtoneRef);
    return () => stopCallRingtone(ringtoneRef);
  }, [call?.id, visible]);

  useEffect(() => () => stopCallRingtone(ringtoneRef), []);

  if (!call || !visible) return null;

  async function declineCall() {
    if (!call) return;
    stopCallRingtone(ringtoneRef);
    await callsService.decline(call.id).catch(() => undefined);
    await notifications?.refresh();
  }

  function openChat() {
    if (!call) return;
    stopCallRingtone(ringtoneRef);
    router.push({ pathname: '/chat/[matchId]', params: { matchId: String(call.match_id) } });
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingTop: Math.max(insets.top + 8, 14) }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Incoming ${call.call_type} call from ${call.display_name}`} onPress={openChat} style={styles.banner}>
        <Avatar uri={call.profile_photo_url} name={call.display_name} size={48} />
        <View style={styles.copy}>
          <Text style={styles.name} numberOfLines={1}>
            {call.display_name}
          </Text>
          <View style={styles.metaRow}>
            <Icon name={call.call_type === 'video' ? 'video' : 'phone-call'} size={13} color={colors.textMuted} />
            <Text style={styles.meta}>Incoming {call.call_type === 'video' ? 'video' : 'voice'} call</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Decline call" onPress={() => void declineCall()} style={[styles.roundButton, styles.declineButton]}>
          <Icon name="close" size={19} color={colors.white} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open call" onPress={openChat} style={[styles.roundButton, styles.acceptButton]}>
          <Icon name="phone-call" size={18} color={colors.white} />
        </Pressable>
      </Pressable>
    </View>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      top: 0,
      right: 0,
      left: 0,
      zIndex: 1000,
      paddingHorizontal: 12,
    },
    banner: {
      minHeight: 74,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: radius.lg,
      backgroundColor: themeColors.backgroundElevated,
      borderWidth: 1,
      borderColor: themeColors.borderStrong,
      ...shadow,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    name: {
      color: themeColors.text,
      fontSize: 15,
      lineHeight: 19,
      fontWeight: '900',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    meta: {
      color: themeColors.textMuted,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '700',
    },
    roundButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
    },
    acceptButton: {
      backgroundColor: themeColors.success,
    },
    declineButton: {
      backgroundColor: themeColors.danger,
    },
  });
}
