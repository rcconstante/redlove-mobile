import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  type AudioPlayer,
} from 'expo-audio';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Linking, PanResponder, Platform, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View, type GestureResponderEvent, type LayoutChangeEvent, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import { SafeArea } from '@/components/layout/safe-area';
import { ScreenWrapper } from '@/components/layout/screen-wrapper';
import { EmptyState } from '@/components/shared/empty-state';
import { FreePremiumBanner } from '@/components/shared/free-premium-banner';
import { InterestsTags } from '@/components/shared/interests-tags';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { MediaGallery } from '@/components/shared/media-gallery';
import { ProtectedImage } from '@/components/shared/protected-image';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { OptionGroup } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { colors, radius, shadow, registerThemeStyleSheet, themePalettes } from '@/constants/theme';
import { NotificationContext } from '@/contexts/notification-context';
import { useAuth } from '@/hooks/use-auth';
import { useResource } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { absoluteMediaUrl } from '@/lib/api';
import { authService } from '@/services/auth.service';
import { callsService } from '@/services/calls.service';
import { discoverService } from '@/services/discover.service';
import { guardianService } from '@/services/guardian.service';
import { likesService } from '@/services/likes.service';
import { matchesService } from '@/services/matches.service';
import { mediaService } from '@/services/media.service';
import { messagesService } from '@/services/messages.service';
import { notificationsService, type NotificationThread } from '@/services/notifications.service';
import { premiumService } from '@/services/premium.service';
import { usersService } from '@/services/users.service';
import type { GuardianReport, GuardianUserSummary, LikeStats, MediaItem, NotificationItem, ReceivedLike } from '@/types/api.types';
import type { IncomingCall, Match, Message } from '@/types/chat.types';
import type { CreditPack, PaymentRecord, PremiumPlan, PremiumStatus } from '@/types/payment.types';
import type { DiscoverProfile, Gender, Preferences, UserProfile } from '@/types/user.types';
import { startCallRingtone, stopCallRingtone } from '@/utils/call-audio';
import { COUNTRIES, GENDERS, INTERESTS, REPORT_REASONS } from '@/utils/constants';
import { formatCurrency, formatDate, formatDateTime, formatHeight } from '@/utils/format';
import { cleanText, validateBirthDate, validateDisplayName, validateEmail, validatePassword } from '@/utils/validation';

type LoadableProps = {
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
};

type LegalKind = 'privacy' | 'terms' | 'trust';

type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

type PendingChatAttachment = PickedImage & {
  id: string;
  kind: 'image';
  previewUri: string;
  remoteUrl?: string;
};

type ChatGif = Awaited<ReturnType<typeof messagesService.gifs>>['data'][number];
type WebRtcModule = typeof import('react-native-webrtc');
type RtcPeerConnection = InstanceType<WebRtcModule['RTCPeerConnection']>;
type RtcMediaStream = InstanceType<WebRtcModule['MediaStream']>;
type RtcCallPhase = 'idle' | 'calling' | 'active';
type RtcCallKind = 'audio' | 'video';

type LegalContent = {
  title: string;
  url: string;
};

const LEGAL_CONTENT: Record<LegalKind, LegalContent> = {
  privacy: {
    title: 'Privacy Policy',
    url: 'https://redlove.today/privacy',
  },
  terms: {
    title: 'Terms of Service',
    url: 'https://redlove.today/terms',
  },
  trust: {
    title: 'Trust and Safety',
    url: 'https://redlove.today/trust',
  },
};

const MATCH_MAKER_SWIPE_THRESHOLD = 90;
const MATCH_MAKER_SUPERLIKE_THRESHOLD = 85;
const WEBRTC_NATIVE_BUILD_MESSAGE =
  'WebRTC native module not found. Voice and video calls require the custom RedLove Expo development build or a production build. Expo Go cannot load react-native-webrtc. If this is already a dev build, rebuild and reinstall it after native dependency changes.';

const MOODS = [
  "Let's hang out",
  'Thinking long-term',
  'Grab a coffee',
  'Just a bit of fun',
  'Someone to chat with',
  'Explore together',
  'Netflix and chill',
  'Open to anything',
  'Music and vibes',
  'Adventure awaits',
] as const;

const ONBOARDING_STEPS = [
  {
    eyebrow: 'RedLove',
    title: 'Find real connections',
    body: 'Meet people who like you for who you are.',
  },
  {
    eyebrow: 'Compatibility',
    title: 'Match with compatible people',
    body: 'Our smart matching helps you find people with similar vibes.',
  },
  {
    eyebrow: 'Chat',
    title: 'Chat, connect and build something real',
    body: 'Start conversations and build meaningful relationships.',
  },
] as const;

const ONBOARDING_ASSETS = {
  logo: require('../../assets/images/logo.png') as number,
  female: require('../../assets/images/onboarding-female.png') as number,
  male: require('../../assets/images/oboarding-male.png') as number,
} as const;

const ONBOARDING_CHAT_MESSAGES = [
  { id: 'music', side: 'left', person: 'male', text: 'Hey! You have great taste in music.', time: '10:21 AM' },
  { id: 'reply', side: 'right', person: 'female', text: 'Thanks! What are you listening to these days?', time: '10:22 AM' },
  { id: 'afrobeats', side: 'left', person: 'male', text: 'A lot of Afrobeats and R&B.', time: '10:24 AM' },
] as const;

function Loadable({ loading, error, children }: LoadableProps) {
  if (loading) return <LoadingSpinner />;
  if (error) return <EmptyState title="Could not load" message={error} />;
  return <>{children}</>;
}

function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text style={styles.formError}>{message}</Text>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="heading">{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, value }: { label: string; value?: string | number | boolean | null }) {
  const rendered = value === true ? 'Yes' : value === false ? 'No' : value == null || value === '' ? 'Not set' : String(value);
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <Text>{rendered}</Text>
    </View>
  );
}

function numericParam(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function computeCompatibility(myProfile: UserProfile | null | undefined, other: DiscoverProfile): number {
  if (!myProfile) return 0;
  let score = 0;
  let total = 0;

  const myInterests = myProfile.interests ?? [];
  const theirInterests = other.interests ?? [];
  if (myInterests.length > 0 && theirInterests.length > 0) {
    const shared = myInterests.filter((interest) => theirInterests.includes(interest)).length;
    const possible = Math.min(myInterests.length, theirInterests.length);
    score += Math.round((shared / possible) * 50);
    total += 50;
  }

  if (myProfile.lookingFor && other.lookingFor) {
    if (myProfile.lookingFor === other.lookingFor) score += 30;
    total += 30;
  }

  if (myProfile.location && other.location) {
    if (myProfile.location.toLowerCase() === other.location.toLowerCase()) score += 20;
    total += 20;
  }

  if (total === 0) return ((other.id * 7) % 31) + 55;
  return Math.round((score / total) * 100);
}

async function openPaymentProvider(orderId: string, approvalUrl?: string) {
  const url = approvalUrl ?? (await paypalCheckoutUrl(orderId));
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) throw new Error('PayPal checkout could not be opened on this device.');
  await Linking.openURL(url);
}

async function paypalCheckoutUrl(orderId: string) {
  const config = await premiumService.paypalConfig();
  const host = config.mode === 'live' || config.mode === 'production' ? 'www.paypal.com' : 'www.sandbox.paypal.com';
  return `https://${host}/checkoutnow?token=${encodeURIComponent(orderId)}`;
}

function formatAudioDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = String(total % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function isTrustedLegalUrl(url: string): boolean {
  if (url === 'about:blank') return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && (parsed.hostname === 'redlove.today' || parsed.hostname === 'www.redlove.today');
  } catch {
    return false;
  }
}

function genderLabel(value: Gender): string {
  return value === 'nonbinary' ? 'Nonbinary' : value.charAt(0).toUpperCase() + value.slice(1);
}

function dateYearsAgo(years: number): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setFullYear(date.getFullYear() - years);
  return date;
}

function formatBirthDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseBirthDateValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function mimeFromUri(uri: string): string {
  const clean = uri.split('?')[0]?.toLowerCase() ?? '';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function extensionFromMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

function pickedImageFromAsset(asset: ImagePicker.ImagePickerAsset, prefix = 'profile-photo'): PickedImage {
  const type = asset.mimeType ?? mimeFromUri(asset.uri);
  const name = asset.fileName?.trim() || `${prefix}-${Date.now()}.${extensionFromMime(type)}`;
  return { uri: asset.uri, name, type };
}

function formatChatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function cleanCallEventText(text: string): string {
  const cleaned = text.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim();
  return cleaned || 'Call event';
}

async function requestPickedImage(source: 'library' | 'camera'): Promise<PickedImage | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error(source === 'camera' ? 'Camera access is required to take a profile photo.' : 'Photo library access is required to choose a profile photo.');
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.9,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.9,
        });

  if (result.canceled || !result.assets[0]) return null;
  return pickedImageFromAsset(result.assets[0]);
}

async function requestChatImages(limit: number): Promise<PendingChatAttachment[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library access is required to attach a chat photo.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: Math.max(1, limit),
    quality: 0.9,
  });

  if (result.canceled) return [];
  return result.assets.slice(0, limit).map((asset, index) => {
    const picked = pickedImageFromAsset(asset, 'chat-photo');
    return {
      ...picked,
      id: `${Date.now()}-${index}-${asset.assetId ?? asset.uri}`,
      kind: 'image',
      previewUri: asset.uri,
    };
  });
}

function serializeRtcDescription(description: { type?: string; sdp?: string } | null | undefined): string {
  if (!description?.type || !description.sdp) {
    throw new Error('Could not create a valid call offer.');
  }
  return JSON.stringify({ type: description.type, sdp: description.sdp });
}

function parseRtcPayload<T = any>(payload: string): T {
  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new Error('Received invalid call signaling data.');
  }
}

function waitForIceGatheringComplete(peer: RtcPeerConnection, timeoutMs = 3500): Promise<void> {
  if (peer.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const eventTarget = peer as unknown as {
      addEventListener: (name: string, handler: () => void) => void;
      removeEventListener: (name: string, handler: () => void) => void;
    };
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      eventTarget.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    };
    const onChange = () => {
      if (peer.iceGatheringState === 'complete') finish();
    };
    const timer = setTimeout(finish, timeoutMs);
    eventTarget.addEventListener('icegatheringstatechange', onChange);
  });
}

function stopRtcStream(stream: RtcMediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
  stream?.release?.();
}

function LegalWebView({ kind, fullHeight = false }: { kind: LegalKind; fullHeight?: boolean }) {
  const content = LEGAL_CONTENT[kind];
  const { height } = useWindowDimensions();
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const modalHeight = Math.min(640, Math.max(430, height * 0.68));

  return (
    <View style={[styles.legalWebFrame, fullHeight ? styles.legalWebFrameFull : { height: modalHeight }]}>
      <WebView
        key={`${kind}-${reloadKey}`}
        source={{ uri: content.url }}
        style={styles.legalWebView}
        originWhitelist={['https://*']}
        startInLoadingState
        setSupportMultipleWindows={false}
        thirdPartyCookiesEnabled={false}
        sharedCookiesEnabled={false}
        allowsBackForwardNavigationGestures
        onLoadStart={() => setError(null)}
        onShouldStartLoadWithRequest={(request) => isTrustedLegalUrl(request.url)}
        onError={(event) => setError(event.nativeEvent.description || 'The page could not be loaded.')}
        onHttpError={(event) => setError(`The page returned HTTP ${event.nativeEvent.statusCode}.`)}
        renderLoading={() => (
          <View style={styles.legalWebState}>
            <ActivityIndicator color={colors.primary} />
            <Text variant="small" style={styles.centerText}>
              Loading {content.title}
            </Text>
          </View>
        )}
      />
      {error ? (
        <View style={styles.legalWebError}>
          <Text style={styles.error}>{error}</Text>
          <Button title="Reload" variant="outline" onPress={() => setReloadKey((current) => current + 1)} />
        </View>
      ) : null}
    </View>
  );
}

function AuthScreenShell({
  title,
  highlight,
  subtitle,
  children,
}: {
  title: string;
  highlight?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const highlightIndex = highlight ? title.lastIndexOf(highlight) : -1;
  const titleStart = highlight && highlightIndex >= 0 ? title.slice(0, highlightIndex) : title;
  const titleEnd = highlight && highlightIndex >= 0 ? title.slice(highlightIndex + highlight.length) : '';

  return (
    <SafeArea>
      <KeyboardAvoidingView style={styles.authKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.authScroll}>
          <View style={styles.authContent}>
            <View style={styles.authBrand}>
              <View style={styles.authTitleRow}>
                <Text style={styles.authTitle}>{titleStart}</Text>
                {highlight && highlightIndex >= 0 ? <Text style={[styles.authTitle, styles.authTitleAccent]}>{highlight}</Text> : null}
                {titleEnd ? <Text style={styles.authTitle}>{titleEnd}</Text> : null}
              </View>
              {subtitle ? (
                <View style={styles.authSubtitleRow}>
                  <Text style={styles.authSubtitle}>{subtitle}</Text>
                  <Icon name="heart" size={13} color={colors.primary} strokeWidth={2} />
                </View>
              ) : null}
            </View>
            <View style={styles.authForm}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}

type AuthTextFieldProps = TextInputProps & {
  icon: React.ComponentProps<typeof Icon>['name'];
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
};

function AuthTextField({ icon, label, secureTextEntry, style, ...props }: AuthTextFieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = Boolean(secureTextEntry);
  return (
    <View style={styles.authInputGroup}>
      {label ? <Text style={styles.authFieldLabel}>{label}</Text> : null}
      <View style={styles.authField}>
        <Icon name={icon} size={18} color={colors.textMuted} />
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.authInput, style]}
          autoCapitalize="none"
          secureTextEntry={isPassword && !visible}
          {...props}
        />
        {isPassword ? (
          <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} hitSlop={10} onPress={() => setVisible((current) => !current)}>
            <Icon name={visible ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function AuthSelectField({
  icon,
  value,
  placeholder,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  value?: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.authField}>
      <Icon name={icon} size={18} color={colors.textMuted} />
      <Text style={[styles.authSelectText, !value ? styles.authSelectPlaceholder : null]}>{value || placeholder}</Text>
      <Icon name="chevron-down" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function AuthBirthDateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const maxDate = useMemo(() => dateYearsAgo(18), []);
  const minDate = useMemo(() => dateYearsAgo(99), []);
  const selectedDate = useMemo(() => parseBirthDateValue(value) ?? maxDate, [maxDate, value]);
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(selectedDate);

  useEffect(() => {
    if (open) setDraftDate(selectedDate);
  }, [open, selectedDate]);

  function handleDateChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type !== 'dismissed' && date) onChange(formatBirthDateValue(date));
      return;
    }
    if (date) setDraftDate(date);
  }

  if (Platform.OS === 'web') {
    return (
      <AuthTextField
        icon="calendar"
        value={value}
        onChangeText={onChange}
        placeholder="Birthday"
        keyboardType="numbers-and-punctuation"
        returnKeyType="next"
      />
    );
  }

  return (
    <>
      <AuthSelectField icon="calendar" value={value} placeholder="Birthday" onPress={() => setOpen(true)} />
      {open && Platform.OS === 'android' ? (
        <DateTimePicker value={selectedDate} mode="date" display="calendar" minimumDate={minDate} maximumDate={maxDate} onChange={handleDateChange} />
      ) : null}
      <Modal visible={open && Platform.OS !== 'android'} title="Birthday" onClose={() => setOpen(false)} onRequestClose={() => setOpen(false)}>
        <View style={styles.datePickerPanel}>
          <DateTimePicker value={draftDate} mode="date" display="spinner" minimumDate={minDate} maximumDate={maxDate} onChange={handleDateChange} />
          <Button
            title="Done"
            fullWidth
            onPress={() => {
              onChange(formatBirthDateValue(draftDate));
              setOpen(false);
            }}
          />
        </View>
      </Modal>
    </>
  );
}

function AuthGenderField({ value, onChange }: { value: Gender; onChange: (value: Gender) => void }) {
  const [open, setOpen] = useState(false);

  function choose(next: Gender) {
    onChange(next);
    setOpen(false);
  }

  return (
    <>
      <AuthSelectField icon="gender" value={genderLabel(value)} placeholder="Gender" onPress={() => setOpen(true)} />
      <Modal visible={open} title="Gender" onClose={() => setOpen(false)} onRequestClose={() => setOpen(false)}>
        <View style={styles.dropdownList}>
          {GENDERS.map((option) => {
            const active = option === value;
            return (
              <Pressable key={option} accessibilityRole="button" style={[styles.dropdownOption, active ? styles.dropdownOptionActive : null]} onPress={() => choose(option)}>
                <Text style={[styles.dropdownOptionText, active ? styles.dropdownOptionTextActive : null]}>{genderLabel(option)}</Text>
                {active ? <Text style={styles.dropdownSelected}>Selected</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </>
  );
}

function AuthLegalConsent() {
  const [activeLegal, setActiveLegal] = useState<LegalKind | null>(null);
  return (
    <>
      <Text style={styles.authConsent}>
        By signing up, you agree to our{' '}
        <Text style={styles.authConsentLink} onPress={() => setActiveLegal('terms')}>
          Terms of Service
        </Text>{' '}
        and{' '}
        <Text style={styles.authConsentLink} onPress={() => setActiveLegal('privacy')}>
          Privacy Policy
        </Text>
      </Text>
      <Modal
        visible={activeLegal != null}
        title={activeLegal ? LEGAL_CONTENT[activeLegal].title : 'Legal'}
        layout="full"
        onClose={() => setActiveLegal(null)}
        onRequestClose={() => setActiveLegal(null)}
      >
        {activeLegal ? <LegalWebView kind={activeLegal} fullHeight /> : null}
      </Modal>
    </>
  );
}

function OnboardingTopMark({ stepIndex }: { stepIndex: number }) {
  if (stepIndex === 0) {
    return <Image source={ONBOARDING_ASSETS.logo} contentFit="contain" style={styles.onboardingLogo} />;
  }
  return (
    <View style={styles.onboardingIconMark}>
      <Icon name={stepIndex === 1 ? 'spark' : 'matches'} size={28} color={colors.primary} />
    </View>
  );
}

function OnboardingVisual({ stepIndex }: { stepIndex: number }) {
  if (stepIndex === 1) return <OnboardingMatchVisual />;
  if (stepIndex === 2) return <OnboardingChatVisual />;
  return <OnboardingDiscoveryVisual />;
}

function OnboardingCoverImage({ source }: { source: number }) {
  return <Image source={source} contentFit="cover" style={StyleSheet.absoluteFill} />;
}

function OnboardingAvatarImage({ person, style }: { person: 'female' | 'male'; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <OnboardingCoverImage source={ONBOARDING_ASSETS[person]} />
    </View>
  );
}

function OnboardingDiscoveryVisual() {
  return (
    <View style={styles.onboardingVisualStage}>
      <View style={[styles.onboardingProfileCard, styles.onboardingProfileCardBack]}>
        <OnboardingCoverImage source={ONBOARDING_ASSETS.male} />
      </View>
      <View style={[styles.onboardingProfileCard, styles.onboardingProfileCardFront]}>
        <OnboardingCoverImage source={ONBOARDING_ASSETS.female} />
        <View style={styles.onboardingPhotoHeart}>
          <Icon name="heart" size={18} color={colors.primary} />
        </View>
      </View>
      <View style={styles.onboardingFloatingHeart}>
        <Icon name="heart" size={42} color={colors.primary} strokeWidth={1.7} />
      </View>
    </View>
  );
}

function OnboardingMatchVisual() {
  return (
    <View style={styles.onboardingVisualStage}>
      <View style={styles.onboardingMatchCard}>
        <View style={styles.onboardingAvatarPair}>
          <OnboardingAvatarImage person="female" style={[styles.onboardingMatchAvatar, styles.onboardingMatchAvatarLeft]} />
          <OnboardingAvatarImage person="male" style={[styles.onboardingMatchAvatar, styles.onboardingMatchAvatarRight]} />
        </View>
        <View style={styles.onboardingMatchHeart}>
          <Icon name="heart" size={18} color={colors.white} />
        </View>
        <Text style={styles.onboardingMatchTitle}>{"It's a match!"}</Text>
        <Text style={styles.onboardingMatchText}>You and David like each other</Text>
      </View>
    </View>
  );
}

function OnboardingChatMessage({
  side,
  person,
  text,
  time,
}: {
  side: 'left' | 'right';
  person: 'female' | 'male';
  text: string;
  time: string;
}) {
  const isRight = side === 'right';
  const avatar = <OnboardingAvatarImage person={person} style={styles.onboardingChatAvatar} />;
  const bubble = (
    <View style={[styles.onboardingChatBubble, isRight ? styles.onboardingChatBubbleRight : styles.onboardingChatBubbleLeft]}>
      <Text style={isRight ? styles.onboardingChatTextStrong : styles.onboardingChatText}>{text}</Text>
      <Text style={isRight ? styles.onboardingChatTimeStrong : styles.onboardingChatTime}>{time}</Text>
    </View>
  );

  return (
    <View style={[styles.onboardingChatRow, isRight ? styles.onboardingChatRowRight : null]}>
      {isRight ? bubble : avatar}
      {isRight ? avatar : bubble}
    </View>
  );
}

function OnboardingChatVisual() {
  return (
    <View style={styles.onboardingVisualStage}>
      <View style={styles.onboardingChatCard}>
        {ONBOARDING_CHAT_MESSAGES.map((message) => (
          <OnboardingChatMessage key={message.id} side={message.side} person={message.person} text={message.text} time={message.time} />
        ))}
      </View>
    </View>
  );
}

export function LandingScreen() {
  useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const { height } = useWindowDimensions();
  const step = ONBOARDING_STEPS[stepIndex];
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;
  const compact = height < 720;

  function goNext() {
    if (isLastStep) {
      router.push('/(auth)/register');
      return;
    }
    setStepIndex((current) => Math.min(current + 1, ONBOARDING_STEPS.length - 1));
  }

  return (
    <ScreenWrapper scroll contentStyle={StyleSheet.flatten([styles.onboarding, compact ? styles.onboardingCompact : null])}>
      <View style={styles.onboardingPhone}>
        <View style={styles.onboardingHeader}>
          <OnboardingTopMark stepIndex={stepIndex} />
        </View>
        <View style={styles.onboardingCopy}>
          <Text style={styles.onboardingTitle}>{step.title}</Text>
          <Text style={styles.onboardingBody}>{step.body}</Text>
        </View>
        <OnboardingVisual stepIndex={stepIndex} />
        <View style={styles.onboardingDots}>
          {ONBOARDING_STEPS.map((item, index) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={`Show onboarding step ${index + 1}`}
              onPress={() => setStepIndex(index)}
              style={[styles.onboardingDot, index === stepIndex ? styles.onboardingDotActive : null]}
            />
          ))}
        </View>
        <View style={styles.onboardingActionBlock}>
          <Button title={isLastStep ? 'Get Started' : 'Next'} fullWidth onPress={goNext} style={styles.onboardingPrimaryButton} />
          {!isLastStep ? (
            <Button title="Skip" fullWidth variant="ghost" onPress={() => router.push('/(auth)/register')} />
          ) : (
            <Button title="Log in" fullWidth variant="ghost" onPress={() => router.push('/(auth)/login')} />
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
}

export function LoginScreen() {
  useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const emailCheck = validateEmail(email);
    const passCheck = validatePassword(password);
    if (!emailCheck.ok || !passCheck.ok) {
      setError(emailCheck.message ?? passCheck.message ?? 'Check your details.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await login({ email: email.trim().toLowerCase(), password });
      router.replace(user.profilePhotoUrl ? '/(tabs)/discover' : '/(onboarding)/photo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenShell title="Welcome" subtitle="Nice to see you again">
      <AuthTextField
        icon="mail"
        value={email}
        onChangeText={setEmail}
        label="Email"
        placeholder="Enter your email"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        autoCorrect={false}
        returnKeyType="next"
      />
      <AuthTextField
        icon="lock"
        value={password}
        onChangeText={setPassword}
        label="Password"
        placeholder="Enter your password"
        secureTextEntry
        textContentType="password"
        autoComplete="current-password"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />
      <ErrorText message={error} />
      <Button title="Log in" fullWidth loading={loading} onPress={submit} style={styles.authPrimaryButton} />
      <View style={styles.authLinkRow}>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.push('/(auth)/forgot-password')}>
          <Text variant="small" style={styles.authLink}>
            Forgot password?
          </Text>
        </Pressable>
      </View>
      <View style={styles.authSwitch}>
        <Text variant="muted">New here?</Text>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.authLink}>Create account</Text>
        </Pressable>
      </View>
    </AuthScreenShell>
  );
}

export function RegisterScreen() {
  useTheme();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender>('woman');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const checks = [validateDisplayName(displayName), validateEmail(email), validatePassword(password), validateBirthDate(birthDate)];
    const failed = checks.find((check) => !check.ok);
    if (failed) {
      setError(failed.message ?? 'Check your details.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({
        displayName: cleanText(displayName, 50),
        email: email.trim().toLowerCase(),
        password,
        birthDate,
        gender,
      });
      router.replace('/(onboarding)/photo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenShell title="Create your account" highlight="account" subtitle="Let's get to know you better">
      <AuthTextField
        icon="profile"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Display name"
        textContentType="name"
        autoComplete="name"
        autoCapitalize="words"
        returnKeyType="next"
      />
      <AuthTextField
        icon="mail"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        autoCorrect={false}
        returnKeyType="next"
      />
      <AuthTextField
        icon="lock"
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        autoCorrect={false}
        returnKeyType="next"
      />
      <AuthBirthDateField value={birthDate} onChange={setBirthDate} />
      <AuthGenderField value={gender} onChange={setGender} />
      <ErrorText message={error} />
      <AuthLegalConsent />
      <Button title="Sign up" fullWidth loading={loading} onPress={submit} style={styles.authPrimaryButton} />
      <View style={styles.authSwitch}>
        <Text variant="muted">Already have an account?</Text>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.authLink}>Log in</Text>
        </Pressable>
      </View>
    </AuthScreenShell>
  );
}

export function ForgotPasswordScreen() {
  useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; token: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      setError(emailCheck.message ?? 'Enter a valid email.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await authService.forgotPassword(email.trim().toLowerCase()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request a reset.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper title="Reset password">
      <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <ErrorText message={error} />
      {result ? (
        <Card style={styles.gap}>
          <Text>{result.message}</Text>
          {result.token ? <Text selectable>{result.token}</Text> : null}
        </Card>
      ) : null}
      <Button title="Request reset" loading={loading} onPress={submit} />
      {result?.token ? (
        <Button
          title="Continue"
          variant="outline"
          onPress={() => router.push({ pathname: '/(auth)/reset-password', params: { token: result.token } })}
        />
      ) : null}
    </ScreenWrapper>
  );
}

export function ResetPasswordScreen() {
  useTheme();
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const passCheck = validatePassword(password);
    if (!token.trim() || !passCheck.ok) {
      setError(!token.trim() ? 'Reset token is required.' : passCheck.message ?? 'Check your password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.resetPassword(token.trim(), password);
      Alert.alert('Password updated', 'You can log in with your new password.');
      router.replace('/(auth)/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper title="New password">
      <Input label="Reset token" value={token} onChangeText={setToken} autoCapitalize="none" />
      <Input label="New password" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" />
      <ErrorText message={error} />
      <Button title="Update password" loading={loading} onPress={submit} />
    </ScreenWrapper>
  );
}

export function OnboardingPhotoScreen() {
  useTheme();
  const { user, setUser } = useAuth();
  const [pickedPhoto, setPickedPhoto] = useState<PickedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUri = pickedPhoto?.uri ?? absoluteMediaUrl(user?.profilePhotoUrl) ?? null;

  async function choosePhoto(source: 'library' | 'camera') {
    setError(null);
    try {
      const picked = await requestPickedImage(source);
      if (picked) setPickedPhoto(picked);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open photo picker.');
    }
  }

  async function submit() {
    if (!pickedPhoto && !user?.profilePhotoUrl) {
      setError('Add a profile photo to continue.');
      return;
    }
    if (!pickedPhoto) {
      router.replace('/(onboarding)/interests');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const uploaded = await mediaService.upload({
        ...pickedPhoto,
        isNude: false,
        isProfilePhoto: true,
        context: 'profile',
      });
      if (user) setUser({ ...user, profilePhotoUrl: uploaded.url });
      router.replace('/(onboarding)/interests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper title="Profile photo" subtitle="Add a clear face photo. This is the first image people see.">
      <View style={styles.photoUploadStage}>
        <Pressable accessibilityRole="button" style={styles.photoCircle} onPress={() => void choosePhoto('library')}>
          {previewUri ? <Image source={{ uri: previewUri }} contentFit="cover" style={StyleSheet.absoluteFill} /> : null}
          {!previewUri ? (
            <View style={styles.photoPlaceholder}>
              <View style={styles.photoPlus}>
                <Icon name="camera" size={25} color={colors.white} />
              </View>
              <Text variant="small" style={styles.photoHint}>
                Add photo
              </Text>
            </View>
          ) : null}
        </Pressable>
        <Text variant="muted" style={styles.centerText}>
          Choose your strongest profile picture. Square crop works best.
        </Text>
      </View>
      <View style={styles.photoActions}>
        <Button title="Choose photo" fullWidth variant="outline" onPress={() => void choosePhoto('library')} />
        <Button title="Take photo" fullWidth variant="outline" onPress={() => void choosePhoto('camera')} />
      </View>
      <ErrorText message={error} />
      <Button title="Continue" fullWidth loading={loading} onPress={submit} />
    </ScreenWrapper>
  );
}

export function OnboardingInterestsScreen() {
  useTheme();
  const { user, setUser } = useAuth();
  const [selected, setSelected] = useState<string[]>(user?.interests ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const minimumInterests = 3;
  const canContinue = selected.length >= minimumInterests;

  function toggle(interest: string) {
    setSelected((current) => (current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]));
  }

  async function submit() {
    if (!canContinue) {
      setError(`Choose at least ${minimumInterests} interests.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updated = await usersService.updateProfile({ interests: selected });
      setUser(updated);
      router.replace('/(onboarding)/welcome');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save interests.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper title="Choose interests" subtitle="Pick a few signals so your profile feels personal from the start.">
      <Card style={styles.interestsHero}>
        <Text variant="heading" style={styles.centerText}>
          What are you into?
        </Text>
        <Text variant="muted" style={styles.centerText}>
          Select at least {minimumInterests}. You can change these later.
        </Text>
        <View style={styles.interestCountPill}>
          <Text style={styles.interestCountText}>
            {selected.length}/{INTERESTS.length} selected
          </Text>
        </View>
      </Card>
      <View style={styles.interestGrid}>
        {INTERESTS.map((interest) => {
          const active = selected.includes(interest);
          return (
            <Pressable
              key={interest}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => toggle(interest)}
              style={[styles.interestChip, active ? styles.interestChipActive : null]}
            >
              <Text style={[styles.interestChipText, active ? styles.interestChipTextActive : null]}>{interest}</Text>
            </Pressable>
          );
        })}
      </View>
      <ErrorText message={error} />
      <Button title="Continue" fullWidth disabled={!canContinue} loading={loading} onPress={submit} />
    </ScreenWrapper>
  );
}

export function OnboardingWelcomeScreen() {
  useTheme();
  return (
    <ScreenWrapper title="Welcome">
      <Card style={styles.gap}>
        <Text variant="heading">Your profile is ready.</Text>
        <Text variant="muted">Start discovering people who match your preferences.</Text>
      </Card>
      <Button title="Go to Discover" onPress={() => router.replace('/(tabs)/discover')} />
    </ScreenWrapper>
  );
}

function DiscoverAppHeader() {
  const { user, logout } = useAuth();
  const loadNotifications = useCallback(() => notificationsService.list(), []);
  const notifications = useResource<NotificationItem[]>(loadNotifications);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const unread = notifications.data?.filter((item) => !item.is_read).length ?? 0;

  function goTo(path: Href) {
    setProfileMenuOpen(false);
    router.push(path);
  }

  return (
    <View style={styles.discoverAppHeader}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/discover')} style={styles.discoverLogoWrap}>
        <Image source={require('../../assets/images/logo.png')} contentFit="contain" style={styles.discoverLogo} />
      </Pressable>
      <View style={styles.discoverHeaderActions}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/premium')} style={styles.creditPill}>
          <Text style={styles.creditText}>{user?.credits ?? 0}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Premium plan"
          onPress={() => router.push('/premium')}
          style={[styles.headerIconCircle, user?.isPremium ? styles.headerIconCircleActive : null]}
        >
          <Icon name="crown" size={21} color={user?.isPremium ? colors.primary : colors.textMuted} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push('/notifications')} style={styles.headerIconCircle}>
          <Icon name="bell" size={21} color={colors.textMuted} />
          {unread > 0 ? (
            <View style={styles.headerUnreadBadge}>
              <Text style={styles.headerUnreadText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile menu" onPress={() => setProfileMenuOpen((current) => !current)}>
          <Avatar uri={user?.profilePhotoUrl} name={user?.displayName} size={40} />
        </Pressable>
      </View>
      {profileMenuOpen ? (
        <View style={styles.profileDropdown}>
          <View style={styles.profileDropdownHeader}>
            <Avatar uri={user?.profilePhotoUrl} name={user?.displayName} size={42} />
            <View style={styles.flex}>
              <Text style={styles.profileDropdownName} numberOfLines={1}>
                {user?.displayName ?? 'Profile'}
              </Text>
              <Text variant="small" style={styles.profileDropdownEmail} numberOfLines={1}>
                {user?.email ?? ''}
              </Text>
            </View>
          </View>
          <ProfileMenuItem icon="profile" label="My Profile" onPress={() => goTo('/me' as Href)} />
          <ProfileMenuItem icon="photo" label="My Photos" onPress={() => goTo('/me/media')} />
          <ProfileMenuItem icon="payments" label="Payment History" onPress={() => goTo('/payments/history')} />
          <ProfileMenuItem icon="settings" label="Settings" onPress={() => goTo('/settings')} />
          <View style={styles.profileDropdownSeparator} />
          <ProfileMenuItem icon="logout" label="Log out" onPress={() => void logout()} danger />
        </View>
      ) : null}
    </View>
  );
}

function ProfileMenuItem({
  icon,
  label,
  onPress,
  highlight = false,
  danger = false,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  onPress: () => void;
  highlight?: boolean;
  danger?: boolean;
}) {
  const color = danger ? colors.danger : highlight ? colors.primary : colors.text;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.profileDropdownItem, pressed ? styles.pressedFade : null]}>
      <Icon name={icon} size={18} color={color} />
      <Text style={[styles.profileDropdownItemText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function DiscoverPageHeader({ stats, onPreferences }: { stats: LikeStats | null; onPreferences: () => void }) {
  const remainingLikes = stats ? Math.max(0, stats.dailyLikeLimit - stats.likesSentToday) : null;

  return (
    <View style={styles.discoverPageHeader}>
      <Text variant="heading">Discover</Text>
      <View style={styles.discoverPageHeaderActions}>
        {stats?.isPremium ? (
          <View style={styles.premiumPill}>
            <Icon name="crown" size={14} color={colors.primary} />
            <Text style={styles.premiumPillText}>Premium</Text>
          </View>
        ) : (
          <View style={styles.likesLeftPill}>
            <Text style={styles.likesLeftText}>{remainingLikes ?? '-'} likes left</Text>
          </View>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Discovery preferences" onPress={onPreferences} style={styles.preferencesIconButton}>
          <View style={styles.preferencesSliders}>
            {[0, 1, 2].map((line) => (
              <View key={line} style={styles.preferencesSliderTrack}>
                <View style={[styles.preferencesSliderKnob, line === 1 ? styles.preferencesSliderKnobRight : null]} />
              </View>
            ))}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function DiscoverFeaturedCard({
  profile,
  liked,
  busy,
  compatibility,
  onLike,
  onPress,
}: {
  profile: DiscoverProfile;
  liked: boolean;
  busy: boolean;
  compatibility: number;
  onLike: () => void;
  onPress: () => void;
}) {
  const photoUrl = absoluteMediaUrl(profile.profilePhotoUrl);
  const online = profile.isOnline ?? true;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.featuredCard}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} contentFit="cover" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={styles.discoverInitial}>
          <Text style={styles.discoverInitialText}>{profile.displayName.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.discoverCardScrim} />
      <View style={styles.matchBadge}>
        <Icon name="spark" size={12} color={colors.white} />
        <Text style={styles.matchBadgeText}>{compatibility}% match</Text>
      </View>
      <View style={[styles.onlineDot, online ? styles.onlineDotActive : styles.onlineDotInactive]} />
      <View style={styles.featuredCardFooter}>
        <View style={styles.featuredNameRow}>
          <Text style={styles.featuredName} numberOfLines={1}>
            {profile.displayName},
          </Text>
          <Text style={styles.featuredAge}>{profile.age}</Text>
        </View>
        {profile.location ? (
          <View style={styles.locationRow}>
            <Icon name="location" size={12} color="rgba(255,255,255,0.68)" />
            <Text style={styles.featuredLocation} numberOfLines={1}>
              {profile.location}
            </Text>
          </View>
        ) : null}
        <Pressable accessibilityRole="button" disabled={liked || busy} onPress={onLike} style={[styles.sendLikePill, liked ? styles.sendLikePillLiked : null]}>
          <Text style={styles.sendLikeText} numberOfLines={1}>
            {liked ? 'Liked' : `Send ${profile.displayName} a like`}
          </Text>
          <Icon name={liked ? 'heart' : 'send'} size={16} color={colors.white} />
        </Pressable>
      </View>
    </Pressable>
  );
}

function DiscoverGridCard({
  profile,
  liked,
  compatibility,
  tileSize,
  onPress,
}: {
  profile: DiscoverProfile;
  liked: boolean;
  compatibility: number;
  tileSize: number;
  onPress: () => void;
}) {
  const photoUrl = absoluteMediaUrl(profile.profilePhotoUrl);
  const online = profile.isOnline ?? true;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.gridCard, { width: tileSize, height: tileSize }]}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} contentFit="cover" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={styles.discoverInitial}>
          <Text style={styles.gridInitialText}>{profile.displayName.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.gridCardScrim} />
      <View style={[styles.gridOnlineDot, online ? styles.onlineDotActive : styles.onlineDotInactive]} />
      {liked ? (
        <View style={styles.gridLikedOverlay}>
          <Icon name="heart" size={30} color={colors.white} />
        </View>
      ) : null}
      <View style={styles.gridCardFooter}>
        <Text style={styles.gridName} numberOfLines={1}>
          {profile.displayName}, {profile.age}
        </Text>
        <View style={styles.gridMatchRow}>
          <Icon name="spark" size={9} color="rgba(255,255,255,0.74)" />
          <Text style={styles.gridMatchText}>{compatibility}%</Text>
        </View>
      </View>
    </Pressable>
  );
}

function DiscoverBoostBanner({ width }: { width: number }) {
  return (
    <View style={[styles.boostBanner, { width }]}>
      <View style={styles.boostTopRow}>
        <View style={styles.boostIconCircle}>
          <Icon name="bolt" size={26} color={colors.warning} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.boostTitle}>Get Extra Views</Text>
          <Text style={styles.boostSubtitle}>Be seen by more people and get more matches</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/premium')} style={styles.boostButton}>
        <Icon name="bolt" size={17} color={colors.white} />
        <Text style={styles.boostButtonText}>Boost your profile</Text>
      </Pressable>
    </View>
  );
}

function moodIconName(index: number): React.ComponentProps<typeof Icon>['name'] {
  const icons: React.ComponentProps<typeof Icon>['name'][] = ['smile', 'heart', 'camera', 'spark', 'send', 'location', 'profile', 'check', 'bell', 'up'];
  return icons[index] ?? 'smile';
}

function DiscoverMoodsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <Modal visible={visible} title="What's your mood?" onClose={onClose} onRequestClose={onClose}>
      <Text variant="muted">Let others know what you are looking for right now.</Text>
      <ScrollView style={styles.moodList} contentContainerStyle={styles.moodListContent}>
        <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={[styles.moodOption, selected == null ? styles.moodOptionActive : null]}>
          <Icon name="close" size={18} color={colors.text} />
          <Text style={styles.moodText}>No mood right now</Text>
          <View style={[styles.moodRadio, selected == null ? styles.moodRadioActive : null]} />
        </Pressable>
        {MOODS.map((mood, index) => (
          <Pressable
            key={mood}
            accessibilityRole="button"
            onPress={() => setSelected(index)}
            style={[styles.moodOption, selected === index ? styles.moodOptionActive : null]}
          >
            <Icon name={moodIconName(index)} size={18} color={colors.text} />
            <Text style={styles.moodText}>{mood}</Text>
            <View style={[styles.moodRadio, selected === index ? styles.moodRadioActive : null]} />
          </Pressable>
        ))}
      </ScrollView>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.moodSaveButton}>
        <Text style={styles.moodSaveText}>{selected == null ? 'Skip' : 'Save mood'}</Text>
      </Pressable>
    </Modal>
  );
}

export function DiscoverScreen() {
  useTheme();
  const loadProfiles = useCallback(() => discoverService.profiles(20), []);
  const resource = useResource(loadProfiles);
  const stats = useResource<LikeStats>(likesService.stats);
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [moodsOpen, setMoodsOpen] = useState(false);
  const profiles = resource.data ?? [];
  const featured = profiles.slice(0, 5);
  const gridGap = 10;
  const gridWidth = Math.max(0, width - 32);
  const tileSize = Math.floor((gridWidth - gridGap * 2) / 3);

  async function like(profile: DiscoverProfile) {
    if (likedIds.has(profile.id)) return;
    setBusyId(profile.id);
    try {
      const result = await likesService.send(profile.id, 'like');
      setLikedIds((current) => new Set(current).add(profile.id));
      if (result.matched && result.matchId) {
        Alert.alert("It's a match", `You matched with ${profile.displayName}.`, [
          { text: 'Keep browsing' },
          { text: 'Message', onPress: () => router.push({ pathname: '/chat/[matchId]', params: { matchId: String(result.matchId) } }) },
        ]);
      }
      void stats.reload();
    } catch (err) {
      Alert.alert('Action failed', err instanceof Error ? err.message : 'Could not complete action.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SafeArea>
      <View style={styles.discoverRoot}>
        <DiscoverAppHeader />
      <FreePremiumBanner />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.discoverScroll}>
          <DiscoverPageHeader stats={stats.data} onPreferences={() => router.push('/(tabs)/preferences')} />
          <Loadable loading={resource.loading} error={resource.error}>
            {profiles.length > 0 ? (
              <>
                <View style={styles.recommendedSection}>
                  <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>Recommended for you today</Text>
                    <Text variant="muted">Picked especially for you</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRail}>
                    {featured.map((profile) => (
                      <DiscoverFeaturedCard
                        key={profile.id}
                        profile={profile}
                        liked={likedIds.has(profile.id)}
                        busy={busyId === profile.id}
                        compatibility={computeCompatibility(user, profile)}
                        onLike={() => void like(profile)}
                        onPress={() => router.push({ pathname: '/profile/[id]', params: { id: String(profile.id) } })}
                      />
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.allSection}>
                  <Text style={styles.sectionTitle}>All</Text>
                  <View style={styles.discoverGrid}>
                    {profiles.flatMap((profile, index) => {
                      const nodes: React.ReactNode[] = [];
                      if (index > 0 && index % 6 === 0) nodes.push(<DiscoverBoostBanner key={`boost-${index}`} width={gridWidth} />);
                      nodes.push(
                        <DiscoverGridCard
                          key={profile.id}
                          profile={profile}
                          liked={likedIds.has(profile.id)}
                          compatibility={computeCompatibility(user, profile)}
                          tileSize={tileSize}
                          onPress={() => router.push({ pathname: '/profile/[id]', params: { id: String(profile.id) } })}
                        />,
                      );
                      return nodes;
                    })}
                  </View>
                </View>
              </>
            ) : (
              <EmptyState title="No profiles yet" message="Adjust preferences or check again later." actionLabel="Reload" onAction={resource.reload} />
            )}
          </Loadable>
        </ScrollView>
        <Pressable accessibilityRole="button" onPress={() => setMoodsOpen(true)} style={styles.moodsButton}>
          <Icon name="smile" size={22} color={colors.black} />
          <Text style={styles.moodsText}>Moods</Text>
        </Pressable>
        <DiscoverMoodsSheet visible={moodsOpen} onClose={() => setMoodsOpen(false)} />
      </View>
    </SafeArea>
  );
}

export function MatchMakerScreen() {
  useTheme();
  const loadProfiles = useCallback(() => discoverService.profiles(20), []);
  const resource = useResource(loadProfiles);
  const stats = useResource<LikeStats>(likesService.stats);
  const reloadProfiles = resource.reload;
  const reloadStats = stats.reload;
  const [index, setIndex] = useState(0);
  const [acting, setActing] = useState(false);
  const drag = useRef(new Animated.ValueXY()).current;
  const { width } = useWindowDimensions();
  const profile = resource.data?.[index] ?? null;
  const nextProfile = resource.data?.[index + 1] ?? null;
  const remainingLikes = stats.data ? Math.max(0, stats.data.dailyLikeLimit - stats.data.likesSentToday) : null;
  const outOfLikes = stats.data ? !stats.data.isPremium && remainingLikes === 0 : false;
  const rotate = drag.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-18deg', '0deg', '18deg'],
    extrapolate: 'clamp',
  });
  const likeOpacity = drag.x.interpolate({ inputRange: [28, 130], outputRange: [0, 1], extrapolate: 'clamp' });
  const passOpacity = drag.x.interpolate({ inputRange: [-130, -28], outputRange: [1, 0], extrapolate: 'clamp' });
  const superlikeOpacity = drag.y.interpolate({ inputRange: [-150, -45], outputRange: [1, 0], extrapolate: 'clamp' });

  useEffect(() => {
    setIndex(0);
  }, [resource.data]);

  useEffect(() => {
    drag.setValue({ x: 0, y: 0 });
  }, [drag, profile?.id]);

  const resetCard = useCallback(() => {
    Animated.spring(drag, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      tension: 80,
      useNativeDriver: false,
    }).start();
  }, [drag]);

  const animateCardOut = useCallback((action: 'like' | 'pass' | 'superlike') => {
    const toValue =
      action === 'like'
        ? { x: width + 140, y: 40 }
        : action === 'pass'
          ? { x: -width - 140, y: 40 }
          : { x: 0, y: -width - 220 };

    return new Promise<void>((resolve) => {
      Animated.timing(drag, {
        toValue,
        duration: 220,
        useNativeDriver: false,
      }).start(() => resolve());
    });
  }, [drag, width]);

  const completeSwipe = useCallback(async (action: 'like' | 'pass' | 'superlike') => {
    if (!profile || acting) return;
    setActing(true);
    try {
      await animateCardOut(action);
      const result = action === 'superlike' ? await likesService.superlike(profile.id) : await likesService.send(profile.id, action);
      if (result.matched && result.matchId) {
        Alert.alert("It's a match", `You matched with ${profile.displayName}.`, [
          { text: 'Keep swiping' },
          { text: 'Message', onPress: () => router.push({ pathname: '/chat/[matchId]', params: { matchId: String(result.matchId) } }) },
        ]);
      }
      setIndex((current) => current + 1);
      void reloadStats();
    } catch (err) {
      resetCard();
      Alert.alert('Action failed', err instanceof Error ? err.message : 'Could not complete action.');
    } finally {
      setActing(false);
    }
  }, [acting, animateCardOut, profile, reloadStats, resetCard]);

  const reloadMatchMaker = useCallback(async () => {
    setIndex(0);
    drag.setValue({ x: 0, y: 0 });
    await Promise.all([reloadProfiles(), reloadStats()]);
  }, [drag, reloadProfiles, reloadStats]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => !acting && (Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8),
        onPanResponderMove: (_, gesture) => {
          drag.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_, gesture) => {
          const horizontal = Math.abs(gesture.dx);
          const vertical = Math.abs(gesture.dy);
          if (gesture.dy < -MATCH_MAKER_SUPERLIKE_THRESHOLD && vertical > horizontal) {
            void completeSwipe('superlike');
            return;
          }
          if (gesture.dx > MATCH_MAKER_SWIPE_THRESHOLD) {
            void completeSwipe('like');
            return;
          }
          if (gesture.dx < -MATCH_MAKER_SWIPE_THRESHOLD) {
            void completeSwipe('pass');
            return;
          }
          resetCard();
        },
        onPanResponderTerminate: resetCard,
      }),
    [acting, completeSwipe, drag, resetCard],
  );

  const currentPhotoUrl = profile ? absoluteMediaUrl(profile.profilePhotoUrl) : null;
  const nextPhotoUrl = nextProfile ? absoluteMediaUrl(nextProfile.profilePhotoUrl) : null;

  return (
    <ScreenWrapper title="Match Maker" scroll={false} contentStyle={styles.matchMakerContent}>
      <Loadable loading={resource.loading} error={resource.error}>
        {outOfLikes ? (
          <EmptyState
            title="Out of likes"
            message={`You've used all ${stats.data?.dailyLikeLimit ?? 0} daily likes. Upgrade for unlimited likes.`}
            actionLabel="View Premium"
            onAction={() => router.push('/premium')}
          />
        ) : profile ? (
          <View style={styles.matchMakerScreen}>
            <View style={styles.matchMakerTopBar}>
              <View style={styles.flex}>
                <Text variant="heading">Fulltreffer</Text>
                <Text variant="muted">Find your perfect match</Text>
              </View>
              <View style={styles.matchMakerTopActions}>
                <Badge label={stats.data?.isPremium ? 'Unlimited' : `${remainingLikes ?? '-'} likes left`} tone={stats.data?.isPremium ? 'success' : 'accent'} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open preferences"
                  onPress={() => router.push('/(tabs)/preferences')}
                  style={styles.matchMakerIconButton}
                >
                  <View style={styles.matchMakerSliders}>
                    {[0, 1, 2].map((line) => (
                      <View key={line} style={styles.matchMakerSliderTrack}>
                        <View style={[styles.matchMakerSliderKnob, line === 1 ? styles.matchMakerSliderKnobRight : null]} />
                      </View>
                    ))}
                  </View>
                </Pressable>
              </View>
            </View>

            <View style={styles.swipeDeck}>
              {nextProfile ? (
                <View style={styles.swipeBackCard}>
                  {nextPhotoUrl ? (
                    <Image source={{ uri: nextPhotoUrl }} contentFit="cover" style={[StyleSheet.absoluteFill, styles.swipeBackPhoto]} />
                  ) : (
                    <View style={styles.swipeInitial}>
                      <Text style={styles.swipeInitialText}>{nextProfile.displayName.charAt(0)}</Text>
                    </View>
                  )}
                </View>
              ) : null}

              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.swipeCard,
                  {
                    transform: [{ translateX: drag.x }, { translateY: drag.y }, { rotate }],
                  },
                ]}
              >
                {currentPhotoUrl ? (
                  <Image source={{ uri: currentPhotoUrl }} contentFit="cover" style={StyleSheet.absoluteFill} />
                ) : (
                  <View style={styles.swipeInitial}>
                    <Text style={styles.swipeInitialText}>{profile.displayName.charAt(0)}</Text>
                  </View>
                )}

                <View style={styles.swipeScrim} />
                <Animated.View style={[styles.swipeStamp, styles.swipeLikeStamp, { opacity: likeOpacity }]}>
                  <Text style={[styles.swipeStampText, styles.swipeLikeText]}>LIKE</Text>
                </Animated.View>
                <Animated.View style={[styles.swipeStamp, styles.swipePassStamp, { opacity: passOpacity }]}>
                  <Text style={[styles.swipeStampText, styles.swipePassText]}>NOPE</Text>
                </Animated.View>
                <Animated.View style={[styles.swipeStamp, styles.swipeCrushStamp, { opacity: superlikeOpacity }]}>
                  <Text style={[styles.swipeStampText, styles.swipeCrushText]}>CRUSH</Text>
                </Animated.View>

                <View style={styles.swipeInfo}>
                  <View style={styles.swipeNameRow}>
                    <Text style={styles.swipeName} numberOfLines={1}>
                      {profile.displayName},
                    </Text>
                    <Text style={styles.swipeAge}>{profile.age}</Text>
                    {profile.isVerified ? <Badge label="Verified" tone="success" /> : null}
                  </View>
                  <View style={styles.swipeMeta}>
                    {profile.lookingFor ? <Badge label={profile.lookingFor} /> : null}
                    {profile.location ? <Badge label={profile.location} tone="accent" /> : null}
                    {profile.distance != null ? <Badge label={`${profile.distance} km`} /> : null}
                  </View>
                  {profile.bio ? (
                    <Text style={styles.swipeBio} numberOfLines={2}>
                      {profile.bio}
                    </Text>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/profile/[id]', params: { id: String(profile.id) } })}
                    style={styles.swipeProfileLink}
                  >
                    <Text style={styles.swipeProfileLinkText}>View full profile</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </View>

            <View style={styles.swipeActionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pass"
                disabled={acting}
                onPress={() => void completeSwipe('pass')}
                style={[styles.swipeRoundButton, styles.swipePassButton, acting ? styles.disabledButton : null]}
              >
                <Icon name="close" size={30} color={colors.danger} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Superlike"
                disabled={acting}
                onPress={() => void completeSwipe('superlike')}
                style={[styles.swipeRoundButton, styles.swipeCrushButton, acting ? styles.disabledButton : null]}
              >
                <Icon name="up" size={27} color={colors.secondary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Like"
                disabled={acting}
                onPress={() => void completeSwipe('like')}
                style={[styles.swipeRoundButton, styles.swipeLikeButton, acting ? styles.disabledButton : null]}
              >
                <Icon name="heart" size={34} color={colors.white} />
              </Pressable>
            </View>
            <Text variant="small" style={styles.swipeHint}>
              Swipe right to like · left to pass · up to crush
            </Text>
          </View>
        ) : (
          <EmptyState title="You've seen everyone" message="Check back later or adjust your preferences." actionLabel="Refresh" onAction={reloadMatchMaker} />
        )}
      </Loadable>
    </ScreenWrapper>
  );
}

export function LikesScreen() {
  useTheme();
  const { user } = useAuth();
  const [tab, setTab] = useState<'all' | 'new' | 'online'>('all');
  const [likedBackIds, setLikedBackIds] = useState<Set<number>>(new Set());
  const [passedIds, setPassedIds] = useState<Set<number>>(new Set());
  const [likingId, setLikingId] = useState<number | null>(null);
  const stats = useResource<LikeStats>(likesService.stats);
  const resource = useResource<ReceivedLike[]>(likesService.received);
  const allLikes = resource.data ?? [];
  const visibleLikes = allLikes.filter((like, index) => {
    if (passedIds.has(like.fromUser.id)) return false;
    if (tab === 'new') return index < Math.ceil(allLikes.length / 2);
    if (tab === 'online') return like.fromUser.isOnline === true;
    return true;
  });

  async function handleLikeBack(profile: DiscoverProfile) {
    if (likedBackIds.has(profile.id) || likingId) return;
    setLikingId(profile.id);
    try {
      const result = await likesService.send(profile.id, 'like');
      setLikedBackIds((current) => new Set(current).add(profile.id));
      await Promise.all([resource.reload(), stats.reload()]);
      if (result.matched && result.matchId) {
        Alert.alert("It's a match", `You matched with ${profile.displayName}.`, [
          { text: 'Keep browsing', style: 'cancel' },
          { text: 'Message', onPress: () => router.push({ pathname: '/chat/[matchId]', params: { matchId: String(result.matchId) } }) },
        ]);
      }
    } catch (err) {
      Alert.alert('Could not send like', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLikingId(null);
    }
  }

  return (
    <ScreenWrapper contentStyle={styles.likesScreen}>
      <View style={styles.likesIntro}>
        <Text style={styles.likesTitle}>Your likes list</Text>
        <Text style={styles.likesSubtitle}>{"These people already liked you - like them back and it's a match!"}</Text>
      </View>

      <View style={styles.likesTabs}>
        {[
          { value: 'all' as const, label: 'All likes', icon: 'heart' as const },
          { value: 'new' as const, label: 'New likes', icon: 'clock' as const },
          { value: 'online' as const, label: 'Online', icon: 'phone' as const },
        ].map((item) => {
          const active = tab === item.value;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(item.value)}
              style={[styles.likesTab, active ? styles.likesTabActive : null]}
            >
              <Icon name={item.icon} size={15} color={active ? colors.text : colors.textMuted} />
              <Text style={[styles.likesTabText, active ? styles.likesTabTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {stats.data && !stats.data.isPremium && !user?.isPremium ? (
        <LikesLockedView count={stats.data.likesReceivedCount} />
      ) : (
        <Loadable loading={resource.loading} error={resource.error}>
          {visibleLikes.length === 0 ? (
            <LikesEmptyState />
          ) : (
            <View style={styles.likesGrid}>
              <LikesBoostCard />
              {visibleLikes.map((like) => (
                <LikesProfileCard
                  key={like.id}
                  like={like}
                  likedBack={likedBackIds.has(like.fromUser.id)}
                  busy={likingId === like.fromUser.id}
                  onLikeBack={() => void handleLikeBack(like.fromUser)}
                  onPass={() => setPassedIds((current) => new Set(current).add(like.fromUser.id))}
                />
              ))}
            </View>
          )}
        </Loadable>
      )}
    </ScreenWrapper>
  );
}

function LikesLockedView({ count }: { count: number }) {
  return (
    <View style={styles.likesLocked}>
      <View style={styles.likesLockedPreview}>
        {[0, 1, 2, 3].map((item) => (
          <View key={item} style={styles.likesLockedTile} />
        ))}
      </View>
      <Card style={styles.likesLockedCard}>
        <View style={styles.likesLockedIcon}>
          <Icon name="crown" size={30} color={colors.primary} />
        </View>
        <Text style={styles.likesLockedTitle}>
          {count} {count === 1 ? 'person' : 'people'} liked you
        </Text>
        <Text style={styles.likesLockedText}>Upgrade to Premium to see who liked you</Text>
        <Button title="Get Premium" onPress={() => router.push('/premium')} />
      </Card>
    </View>
  );
}

function LikesEmptyState() {
  return (
    <View style={styles.likesEmpty}>
      <View style={styles.likesEmptyIcon}>
        <Icon name="heart" size={34} color={colors.textSubtle} />
      </View>
      <Text style={styles.likesEmptyTitle}>No likes yet</Text>
      <Text style={styles.likesEmptyText}>Keep being active and more people will find you!</Text>
    </View>
  );
}

function LikesBoostCard() {
  return (
    <Card style={styles.likesBoostCard}>
      <View style={styles.likesBoostCredit}>
        <Icon name="heart" size={12} color={colors.primary} />
        <Text style={styles.likesBoostCreditText}>150</Text>
      </View>
      <View style={styles.likesBoostBody}>
        <View style={styles.likesBoostIcon}>
          <Icon name="bolt" size={27} color={colors.primary} />
        </View>
        <Text style={styles.likesBoostText}>Be seen by more people and get 4x more likes.</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/premium')} style={styles.likesBoostButton}>
        <Text style={styles.likesBoostButtonText}>Activate</Text>
      </Pressable>
    </Card>
  );
}

function LikesProfileCard({
  like,
  likedBack,
  busy,
  onLikeBack,
  onPass,
}: {
  like: ReceivedLike;
  likedBack: boolean;
  busy: boolean;
  onLikeBack: () => void;
  onPass: () => void;
}) {
  const profile = like.fromUser;
  const photoUrl = absoluteMediaUrl(profile.profilePhotoUrl);

  return (
    <View style={styles.likeCardWrap}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/profile/[id]', params: { id: String(profile.id) } })}
        style={styles.likePhotoCard}
      >
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} contentFit="cover" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.discoverInitial}>
            <Text style={styles.gridInitialText}>{profile.displayName.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.likeCardScrim} />
        {like.isSuperlike ? (
          <View style={styles.likeCrushBadge}>
            <Icon name="spark" size={11} color={colors.white} />
            <Text style={styles.likeCrushText}>Crush</Text>
          </View>
        ) : null}
        <View style={[styles.gridOnlineDot, profile.isOnline ? styles.onlineDotActive : styles.onlineDotInactive]} />
        <View style={styles.likePhotoFooter}>
          <Text style={styles.likeCardName} numberOfLines={1}>
            {profile.displayName}, {profile.age}
          </Text>
          {profile.location ? (
            <Text style={styles.likeCardMeta} numberOfLines={1}>
              {profile.location}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.likeActions}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Pass on ${profile.displayName}`} onPress={onPass} style={styles.likePassButton}>
          <Icon name="close" size={18} color={colors.danger} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Like ${profile.displayName} back`}
          disabled={likedBack || busy}
          onPress={onLikeBack}
          style={[styles.likeBackButton, likedBack ? styles.likeBackButtonActive : null, busy ? styles.disabledButton : null]}
        >
          {busy ? <ActivityIndicator size="small" color={colors.white} /> : <Icon name="heart" size={18} color={likedBack ? colors.white : colors.primary} />}
        </Pressable>
      </View>
    </View>
  );
}

export function MatchesScreen() {
  useTheme();
  const resource = useResource<Match[]>(matchesService.list);
  const stats = useResource<LikeStats>(likesService.stats);
  const [sortNewest, setSortNewest] = useState(true);
  const [quickHiSendingId, setQuickHiSendingId] = useState<number | null>(null);
  const matches = resource.data ?? [];
  const newMatches = matches.filter((match) => !match.lastMessage);
  const conversations = matches.filter((match) => match.lastMessage);
  const sortedConversations = sortNewest ? conversations : [...conversations].reverse();

  async function sendQuickHi(match: Match) {
    if (quickHiSendingId) return;
    setQuickHiSendingId(match.id);
    try {
      await messagesService.send(match.id, { text: 'Hi', messageType: 'text' });
      await resource.reload();
      router.push({ pathname: '/chat/[matchId]', params: { matchId: String(match.id) } });
    } catch (err) {
      Alert.alert('Could not send message', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setQuickHiSendingId(null);
    }
  }

  return (
    <ScreenWrapper contentStyle={styles.matchesScreen}>
      <View style={styles.matchesTopBar}>
        <Text style={styles.matchesTitle}>Chats</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push('/notifications')} style={styles.matchesBellButton}>
          <Icon name="bell" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
      <Loadable loading={resource.loading} error={resource.error}>
        <View style={styles.matchesStoriesSection}>
          <Text style={styles.matchesSectionLabel}>LIKES AND MATCHES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchesStoryRail}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/likes')} style={styles.matchesStoryItem}>
              <View style={styles.likesStoryCircle}>
                <Icon name="heart" size={25} color={colors.primary} />
                {(stats.data?.likesReceivedCount ?? 0) > 0 ? (
                  <View style={styles.storyCountBadge}>
                    <Text style={styles.storyCountText}>{(stats.data?.likesReceivedCount ?? 0) > 99 ? '99+' : stats.data?.likesReceivedCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.storyLabel}>Likes</Text>
            </Pressable>

            {newMatches.map((match) => (
              <MatchStoryItem key={match.id} match={match} isNew />
            ))}

            {conversations.map((match) => (
              <MatchStoryItem key={match.id} match={match} />
            ))}

            {!resource.loading && matches.length === 0 ? (
              <View style={styles.matchesStoryEmpty}>
                <Text style={styles.matchesStoryEmptyText}>Mutual matches will appear here</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>

        <View style={styles.matchesDivider} />

        {newMatches.map((match) => (
          <Card key={`new-match-${match.id}`} style={styles.newMatchCard}>
            <View style={styles.newMatchAvatarWrap}>
              <Avatar uri={absoluteMediaUrl(match.otherUser.profilePhotoUrl)} name={match.otherUser.displayName} size={54} />
              <View style={styles.newMatchSpark}>
                <Icon name="spark" size={15} color={colors.primary} />
              </View>
            </View>
            <View style={styles.newMatchCopy}>
              <View style={styles.newMatchNameRow}>
                <Text style={styles.newMatchName} numberOfLines={1}>
                  {match.otherUser.displayName}
                </Text>
                <Icon name="check" size={14} color={colors.success} />
              </View>
              <Text style={styles.newMatchMessage} numberOfLines={2}>{"It's a match! Start the conversation"}</Text>
            </View>
            <View style={styles.newMatchActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/chat/[matchId]', params: { matchId: String(match.id) } })}
                style={styles.startChatButton}
              >
                <Text style={styles.startChatText}>Start chat</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={quickHiSendingId === match.id}
                onPress={() => void sendQuickHi(match)}
                style={[styles.quickHiButton, quickHiSendingId === match.id ? styles.disabledButton : null]}
              >
                {quickHiSendingId === match.id ? <ActivityIndicator size="small" color={colors.text} /> : <Icon name="send" size={13} color={colors.text} />}
                <Text style={styles.quickHiText}>Quick hi</Text>
              </Pressable>
            </View>
          </Card>
        ))}

        {conversations.length > 0 ? (
          <View style={styles.messagesHeader}>
            <Text style={styles.matchesSectionLabel}>MESSAGES</Text>
            <Pressable accessibilityRole="button" onPress={() => setSortNewest((value) => !value)} style={styles.sortButton}>
              <Text style={styles.sortText}>{sortNewest ? 'Newest' : 'Oldest'}</Text>
            </Pressable>
          </View>
        ) : null}

        {sortedConversations.map((match) => (
          <ConversationRow key={match.id} match={match} />
        ))}

        {!resource.loading && newMatches.length === 0 && conversations.length === 0 ? <MatchesEmptyState /> : null}
      </Loadable>
    </ScreenWrapper>
  );
}

function MatchStoryItem({ match, isNew = false }: { match: Match; isNew?: boolean }) {
  const hasUnread = (match.unreadCount ?? 0) > 0;
  const firstName = match.otherUser.displayName.trim().split(/\s+/)[0] || match.otherUser.displayName;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/chat/[matchId]', params: { matchId: String(match.id) } })}
      style={styles.matchesStoryItem}
    >
      <View style={[styles.storyAvatarRing, hasUnread || isNew ? styles.storyAvatarRingActive : null]}>
        <Avatar uri={absoluteMediaUrl(match.otherUser.profilePhotoUrl)} name={match.otherUser.displayName} size={56} />
      </View>
      <View style={[styles.storyOnlineDot, match.otherUser.isOnline ? styles.onlineDotActive : styles.onlineDotInactive]} />
      {isNew ? (
        <View style={styles.storyNewBadge}>
          <Text style={styles.storyNewBadgeText}>NEW</Text>
        </View>
      ) : null}
      {hasUnread ? (
        <View style={styles.storyUnreadBadge}>
          <Text style={styles.storyUnreadText}>{match.unreadCount > 99 ? '99+' : match.unreadCount}</Text>
        </View>
      ) : null}
      <Text style={[styles.storyLabel, hasUnread || isNew ? styles.storyLabelActive : null]} numberOfLines={1}>
        {firstName}
      </Text>
    </Pressable>
  );
}

function ConversationRow({ match }: { match: Match }) {
  const hasUnread = (match.unreadCount ?? 0) > 0;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/chat/[matchId]', params: { matchId: String(match.id) } })}
      style={({ pressed }) => [styles.conversationRow, pressed ? styles.pressedFade : null]}
    >
      <View style={styles.conversationAvatarWrap}>
        <Avatar uri={absoluteMediaUrl(match.otherUser.profilePhotoUrl)} name={match.otherUser.displayName} size={58} />
        <View style={[styles.conversationOnlineDot, match.otherUser.isOnline ? styles.onlineDotActive : styles.onlineDotInactive]} />
      </View>
      <View style={styles.conversationCopy}>
        <View style={styles.rowBetween}>
          <Text style={[styles.conversationName, hasUnread ? styles.conversationNameUnread : null]} numberOfLines={1}>
            {match.otherUser.displayName}
          </Text>
          {hasUnread ? <Badge label={String(match.unreadCount)} tone="danger" /> : null}
        </View>
        <Text style={[styles.conversationMessage, hasUnread ? styles.conversationMessageUnread : null]} numberOfLines={1}>
          {match.lastMessage ?? 'Say hi'}
        </Text>
        <Text style={styles.conversationTime}>{formatDateTime(match.lastMessageAt ?? match.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

function MatchesEmptyState() {
  return (
    <View style={styles.matchesEmpty}>
      <View style={styles.likesEmptyIcon}>
        <Icon name="heart" size={34} color={colors.textSubtle} />
      </View>
      <Text style={styles.likesEmptyTitle}>No chats yet</Text>
      <Text style={styles.likesEmptyText}>When you match with someone, they will appear here.</Text>
    </View>
  );
}

export function ChatScreen() {
  useTheme();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const matchId = numericParam(params.matchId);
  const { user } = useAuth();
  const notifications = useContext(NotificationContext);
  const loadMessages = useCallback(() => (matchId ? messagesService.thread(matchId) : Promise.resolve([])), [matchId]);
  const resource = useResource<Message[]>(loadMessages);
  const matches = useResource<Match[]>(matchesService.list);
  const scrollRef = useRef<ScrollView>(null);
  const webRtcRef = useRef<WebRtcModule | null>(null);
  const pcRef = useRef<RtcPeerConnection | null>(null);
  const localStreamRef = useRef<RtcMediaStream | null>(null);
  const remoteStreamRef = useRef<RtcMediaStream | null>(null);
  const ringtoneRef = useRef<AudioPlayer | null>(null);
  const callIdRef = useRef<number | null>(null);
  const callStartedAtRef = useRef<number | null>(null);
  const iceLastIdRef = useRef(0);
  const pendingIceRef = useRef<string[]>([]);
  const isCallerRef = useRef(false);
  const voiceRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const voiceRecorderState = useAudioRecorderState(voiceRecorder, 250);
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingChatAttachment[]>([]);
  const [viewOnce, setViewOnce] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [voiceSending, setVoiceSending] = useState(false);
  const [callPhase, setCallPhase] = useState<RtcCallPhase>('idle');
  const [callKind, setCallKind] = useState<RtcCallKind>('audio');
  const [localStream, setLocalStream] = useState<RtcMediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<RtcMediaStream | null>(null);
  const [callMuted, setCallMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const messages = resource.data ?? [];
  const match = matches.data?.find((item) => item.id === matchId) ?? null;
  const otherUser = match?.otherUser ?? null;
  const incomingCall = notifications?.incomingCall?.match_id === matchId ? notifications.incomingCall : null;
  const incomingCallId = incomingCall?.id ?? null;
  const iHaveSent = messages.some((message) => message.senderId === user?.id);
  const theyHaveSent = messages.some((message) => message.senderId !== user?.id);
  const callsUnlocked = iHaveSent && theyHaveSent;
  const recordingVoice = voiceRecorderState.isRecording;
  const composerBusy = sending || voiceSending;
  const canSend = !recordingVoice && (Boolean(text.trim()) || pendingAttachments.length > 0);
  const setMessagesData = resource.setData;
  const silentRefreshMessages = useCallback(async () => {
    if (!matchId) return;
    try {
      setMessagesData(await messagesService.thread(matchId));
    } catch {
      // Keep the current thread visible if a background poll fails.
    }
  }, [matchId, setMessagesData]);

  const loadWebRtc = useCallback(async (): Promise<WebRtcModule> => {
    if (webRtcRef.current) return webRtcRef.current;
    try {
      const module = await import('react-native-webrtc');
      module.registerGlobals?.();
      webRtcRef.current = module;
      return module;
    } catch {
      throw new Error(WEBRTC_NATIVE_BUILD_MESSAGE);
    }
  }, []);

  const applyCallAudioMode = useCallback(async (routeToSpeaker: boolean) => {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: Platform.OS === 'android' ? !routeToSpeaker : false,
    });
  }, []);

  const flushPendingIce = useCallback(async (callId: number) => {
    const pending = [...pendingIceRef.current];
    pendingIceRef.current = [];
    await Promise.allSettled(pending.map((candidate) => callsService.addIceCandidate(callId, candidate)));
  }, []);

  const createPeerConnection = useCallback((rtc: WebRtcModule): RtcPeerConnection => {
    const peer = new rtc.RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'],
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
      ],
    });
    pcRef.current = peer;

    const peerEvents = peer as unknown as {
      addEventListener: (name: string, handler: (event: any) => void) => void;
    };

    peerEvents.addEventListener('icecandidate', (event: any) => {
      const candidate = event.candidate;
      if (!candidate) return;
      const payload = JSON.stringify(candidate);
      const callId = callIdRef.current;
      if (!callId) {
        pendingIceRef.current.push(payload);
        return;
      }
      void callsService.addIceCandidate(callId, payload).catch(() => undefined);
    });

    peerEvents.addEventListener('track', (event: any) => {
      const stream = event.streams?.[0] as RtcMediaStream | undefined;
      if (!stream) return;
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
    });

    peerEvents.addEventListener('connectionstatechange', () => {
      if (peer.connectionState === 'connected') {
        if (!callStartedAtRef.current) callStartedAtRef.current = Date.now();
        setCallPhase('active');
      }
    });

    return peer;
  }, []);

  const cleanupCall = useCallback(async (notifyBackend: boolean) => {
    const callId = callIdRef.current;
    const startedAt = callStartedAtRef.current;
    stopCallRingtone(ringtoneRef);
    callIdRef.current = null;
    callStartedAtRef.current = null;
    iceLastIdRef.current = 0;
    pendingIceRef.current = [];
    isCallerRef.current = false;

    if (notifyBackend && callId) {
      const duration = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : undefined;
      await callsService.end(callId, duration).catch(() => undefined);
    }

    pcRef.current?.close();
    pcRef.current = null;
    stopRtcStream(localStreamRef.current);
    stopRtcStream(remoteStreamRef.current);
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallPhase('idle');
    setCallMuted(false);
    setCameraOff(false);
    setSpeakerOn(false);
    await setAudioModeAsync({ allowsRecording: false, shouldPlayInBackground: false, shouldRouteThroughEarpiece: false }).catch(() => undefined);
    void silentRefreshMessages();
  }, [silentRefreshMessages]);

  const attachLocalMedia = useCallback(async (rtc: WebRtcModule, peer: RtcPeerConnection, kind: RtcCallKind): Promise<RtcMediaStream> => {
    const stream = await rtc.mediaDevices.getUserMedia({
      audio: true,
      video: kind === 'video' ? { facingMode: 'user' } : false,
    });
    const typedStream = stream as RtcMediaStream;
    typedStream.getTracks().forEach((track) => peer.addTrack(track, typedStream));
    localStreamRef.current = typedStream;
    setLocalStream(typedStream);
    return typedStream;
  }, []);

  useEffect(() => {
    if (!matchId) return undefined;
    const timer = setInterval(() => {
      void silentRefreshMessages();
    }, 4000);
    return () => clearInterval(timer);
  }, [matchId, silentRefreshMessages]);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length]);

  useEffect(() => {
    const refresh = notifications?.refresh;
    if (!matchId || !refresh) return undefined;
    const timer = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [matchId, notifications?.refresh]);

  useEffect(() => {
    const shouldRing = Boolean((incomingCallId && callPhase === 'idle') || (callPhase === 'calling' && isCallerRef.current));
    if (!shouldRing) {
      stopCallRingtone(ringtoneRef);
      return undefined;
    }
    startCallRingtone(ringtoneRef);
    return () => stopCallRingtone(ringtoneRef);
  }, [callPhase, incomingCallId]);

  useEffect(() => {
    return () => {
      stopCallRingtone(ringtoneRef);
      void setAudioModeAsync({ allowsRecording: false, shouldPlayInBackground: false, shouldRouteThroughEarpiece: false }).catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (callPhase === 'idle') return undefined;
    const timer = setInterval(() => {
      const run = async () => {
        const callId = callIdRef.current;
        const peer = pcRef.current;
        const rtc = webRtcRef.current;
        if (!callId || !peer || !rtc) return;

        const status = await callsService.status(callId);
        if (status.status === 'declined' || status.status === 'ended') {
          Alert.alert('Call ended');
          await cleanupCall(false);
          return;
        }

        if (isCallerRef.current && status.answer && !peer.remoteDescription) {
          await peer.setRemoteDescription(new rtc.RTCSessionDescription(parseRtcPayload(status.answer)));
          if (!callStartedAtRef.current) callStartedAtRef.current = Date.now();
          setCallPhase('active');
        }

        const ice = await callsService.iceCandidates(callId, iceLastIdRef.current);
        for (const item of ice.candidates) {
          iceLastIdRef.current = Math.max(iceLastIdRef.current, item.id);
          await peer.addIceCandidate(new rtc.RTCIceCandidate(parseRtcPayload(item.candidate)));
        }
      };
      void run().catch(() => undefined);
    }, 1400);

    return () => clearInterval(timer);
  }, [callPhase, cleanupCall]);

  async function chooseAttachment() {
    const remaining = 10 - pendingAttachments.length;
    if (remaining <= 0) {
      Alert.alert('Attachment limit', 'You can send up to 10 photos at once.');
      return;
    }
    try {
      const picked = await requestChatImages(remaining);
      if (picked.length > 0) {
        setPendingAttachments((current) => [...current, ...picked].slice(0, 10));
      }
    } catch (err) {
      Alert.alert('Photo picker failed', err instanceof Error ? err.message : 'Try again later.');
    }
  }

  function addGif(gif: ChatGif) {
    const url = gif.images.original.url;
    const previewUri = gif.images.fixed_height_small?.url ?? url;
    const safeName = `${(gif.title || 'gif').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'gif'}.gif`;
    setPendingAttachments((current) => [
      ...current,
      {
        id: `gif-${gif.id}-${Date.now()}`,
        uri: url,
        name: safeName,
        type: 'image/gif',
        kind: 'image' as const,
        previewUri,
        remoteUrl: url,
      },
    ].slice(0, 10));
    setGifOpen(false);
  }

  async function send() {
    if (!matchId || !canSend || composerBusy) return;
    setSending(true);
    try {
      const messageText = text.trim();
      if (messageText) {
        await messagesService.send(matchId, { text: messageText, messageType: 'text' });
      }

      for (const attachment of pendingAttachments) {
        if (attachment.remoteUrl) {
          await messagesService.send(matchId, {
            mediaUrl: attachment.remoteUrl,
            messageType: 'image',
            isNude: false,
            isViewOnce: viewOnce,
          });
          continue;
        }

        const uploaded = await mediaService.upload({
          uri: attachment.uri,
          name: attachment.name,
          type: attachment.type,
          isNude: false,
          isProfilePhoto: false,
          context: 'chat',
        });
        await messagesService.send(matchId, {
          mediaUrl: uploaded.url,
          messageType: 'image',
          isNude: false,
          isViewOnce: viewOnce,
        });
      }

      setText('');
      setPendingAttachments([]);
      setViewOnce(false);
      await silentRefreshMessages();
    } catch (err) {
      Alert.alert('Could not send', err instanceof Error ? err.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  async function startVoiceRecording() {
    if (composerBusy || callPhase !== 'idle') return;
    if (!matchId) return;
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission needed', 'Allow microphone access to record voice notes.');
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        shouldPlayInBackground: false,
      });
      await voiceRecorder.prepareToRecordAsync();
      voiceRecorder.record();
    } catch (err) {
      Alert.alert('Could not record', err instanceof Error ? err.message : 'Please check microphone permissions.');
      await setAudioModeAsync({ allowsRecording: false, shouldPlayInBackground: false }).catch(() => undefined);
    }
  }

  async function stopVoiceRecording() {
    if (!recordingVoice || !matchId) return;
    setVoiceSending(true);
    try {
      await voiceRecorder.stop();
      const uri = voiceRecorder.uri;
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => undefined);
      if (!uri) throw new Error('The voice note could not be saved.');
      const uploaded = await mediaService.upload({
        uri,
        name: `voice-note-${Date.now()}.m4a`,
        type: 'audio/mp4',
        isNude: false,
        isProfilePhoto: false,
        context: 'chat',
      });
      await messagesService.send(matchId, {
        mediaUrl: uploaded.url,
        messageType: 'audio',
        isNude: false,
        isViewOnce: false,
      });
      await silentRefreshMessages();
    } catch (err) {
      Alert.alert('Could not send voice note', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setVoiceSending(false);
      await setAudioModeAsync({ allowsRecording: false, shouldPlayInBackground: false }).catch(() => undefined);
    }
  }

  async function toggleVoiceRecording() {
    if (recordingVoice) {
      await stopVoiceRecording();
      return;
    }
    await startVoiceRecording();
  }

  async function startCall(kind: RtcCallKind) {
    if (!matchId || callPhase !== 'idle') return;
    if (!callsUnlocked) {
      Alert.alert('Chat a little first', 'Both of you need to send a message before calling.');
      return;
    }
    setCallKind(kind);
    const initialSpeakerOn = kind === 'video';
    setSpeakerOn(initialSpeakerOn);
    setCallPhase('calling');
    isCallerRef.current = true;
    try {
      const rtc = await loadWebRtc();
      const peer = createPeerConnection(rtc);
      await applyCallAudioMode(initialSpeakerOn);
      await attachLocalMedia(rtc, peer, kind);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await waitForIceGatheringComplete(peer);
      const order = await callsService.initiate(matchId, kind, serializeRtcDescription(peer.localDescription ?? offer));
      callIdRef.current = order.callId;
      await flushPendingIce(order.callId);
    } catch (err) {
      await cleanupCall(false);
      Alert.alert('Could not start call', err instanceof Error ? err.message : 'Please check camera and microphone permissions.');
    }
  }

  async function answerIncomingCall() {
    if (!incomingCall || callPhase !== 'idle') return;
    const kind = incomingCall.call_type;
    setCallKind(kind);
    const initialSpeakerOn = kind === 'video';
    setSpeakerOn(initialSpeakerOn);
    setCallPhase('calling');
    isCallerRef.current = false;
    try {
      const rtc = await loadWebRtc();
      const peer = createPeerConnection(rtc);
      await applyCallAudioMode(initialSpeakerOn);
      await attachLocalMedia(rtc, peer, kind);
      await peer.setRemoteDescription(new rtc.RTCSessionDescription(parseRtcPayload(incomingCall.offer)));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await waitForIceGatheringComplete(peer);
      callIdRef.current = incomingCall.id;
      await callsService.answer(incomingCall.id, serializeRtcDescription(peer.localDescription ?? answer));
      await flushPendingIce(incomingCall.id);
      if (!callStartedAtRef.current) callStartedAtRef.current = Date.now();
      setCallPhase('active');
      await notifications?.refresh();
    } catch (err) {
      await cleanupCall(false);
      Alert.alert('Could not answer call', err instanceof Error ? err.message : 'Please check camera and microphone permissions.');
    }
  }

  async function declineIncomingCall() {
    if (!incomingCall) return;
    stopCallRingtone(ringtoneRef);
    await callsService.decline(incomingCall.id).catch(() => undefined);
    await notifications?.refresh();
  }

  async function endCurrentCall() {
    await cleanupCall(true);
  }

  function toggleMute() {
    const next = !callMuted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setCallMuted(next);
  }

  function toggleCamera() {
    const next = !cameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setCameraOff(next);
  }

  async function toggleSpeaker() {
    if (Platform.OS !== 'android') {
      Alert.alert('Use system audio routing', 'On iPhone, change the call output from Control Center or connected Bluetooth devices.');
      return;
    }
    const next = !speakerOn;
    setSpeakerOn(next);
    try {
      await applyCallAudioMode(next);
    } catch {
      setSpeakerOn(!next);
      Alert.alert('Speaker unavailable', 'Could not change the call audio route.');
    }
  }

  if (!matchId) return <EmptyState title="Invalid chat" />;

  return (
    <SafeArea edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.chatRoot}>
        <DiscoverAppHeader />
        {incomingCall && callPhase === 'idle' ? (
          <ChatIncomingCallBanner incomingCall={incomingCall} onAccept={() => void answerIncomingCall()} onDecline={() => void declineIncomingCall()} />
        ) : null}
        {callPhase !== 'idle' ? (
          <ChatCallOverlay
            phase={callPhase}
            kind={callKind}
            otherName={otherUser?.displayName ?? incomingCall?.display_name ?? 'RedLove user'}
            localStream={localStream}
            remoteStream={remoteStream}
            muted={callMuted}
            cameraOff={cameraOff}
            speakerOn={speakerOn}
            onToggleMute={toggleMute}
            onToggleCamera={toggleCamera}
            onToggleSpeaker={() => void toggleSpeaker()}
            onEnd={() => void endCurrentCall()}
          />
        ) : null}
        <KeyboardAvoidingView style={styles.chatKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.chatHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to matches" onPress={() => router.replace('/(tabs)/matches')} style={styles.chatBackButton}>
              <Icon name="chevron-left" size={22} color={colors.text} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!otherUser}
              onPress={() => otherUser && router.push({ pathname: '/profile/[id]', params: { id: String(otherUser.id) } })}
              style={styles.chatHeaderProfile}
            >
              <Avatar uri={otherUser?.profilePhotoUrl} name={otherUser?.displayName} size={42} />
              <View style={styles.chatHeaderCopy}>
                <View style={styles.chatNameRow}>
                  <Text style={styles.chatName} numberOfLines={1}>
                    {otherUser?.displayName ?? 'Match'}
                  </Text>
                  {otherUser?.isVerified ? <Icon name="check" size={14} color={colors.success} /> : null}
                </View>
                <Text style={styles.chatSubhead} numberOfLines={1}>
                  {otherUser?.location ?? (otherUser?.age ? `${otherUser.age} years old` : 'Online')}
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Audio call"
              accessibilityState={{ disabled: !callsUnlocked }}
              onPress={() => startCall('audio')}
              style={styles.chatIconButton}
            >
              <Icon name="phone-call" size={19} color={callsUnlocked ? colors.primary : colors.textMuted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Video call"
              accessibilityState={{ disabled: !callsUnlocked }}
              onPress={() => startCall('video')}
              style={styles.chatIconButton}
            >
              <Icon name="video" size={20} color={callsUnlocked ? colors.primary : colors.textMuted} />
            </Pressable>
          </View>

          <Loadable loading={(resource.loading && !resource.data) || (matches.loading && !matches.data)} error={resource.error || matches.error}>
            <ScrollView ref={scrollRef} style={styles.chatMessages} contentContainerStyle={styles.chatMessagesContent} keyboardShouldPersistTaps="handled">
              {messages.length === 0 ? (
                <View style={styles.chatEmpty}>
                  <Icon name="send" size={28} color={colors.textMuted} />
                  <Text style={styles.chatEmptyText}>No messages yet - say hello!</Text>
                </View>
              ) : (
                messages.map((message) => (
                  <ChatMessageBubble key={message.id} message={message} mine={message.senderId === user?.id} onImagePress={setLightboxUri} />
                ))
              )}
            </ScrollView>
          </Loadable>

          <ChatAttachmentTray
            attachments={pendingAttachments}
            viewOnce={viewOnce}
            onRemove={(id) => setPendingAttachments((current) => current.filter((attachment) => attachment.id !== id))}
            onToggleViewOnce={() => setViewOnce((current) => !current)}
          />

          {messages.length >= 15 ? <ChatDateFeedbackBanner matchId={matchId} /> : null}

          <View style={styles.chatComposer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Attach photo"
              disabled={composerBusy || recordingVoice || pendingAttachments.length >= 10}
              onPress={() => void chooseAttachment()}
              style={({ pressed }) => [
                styles.chatComposerIcon,
                pressed ? styles.pressedFade : null,
                composerBusy || recordingVoice || pendingAttachments.length >= 10 ? styles.disabledButton : null,
              ]}
            >
              <Icon name="image-plus" size={24} color={colors.textMuted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose GIF"
              disabled={composerBusy || recordingVoice || pendingAttachments.length >= 10}
              onPress={() => setGifOpen(true)}
              style={({ pressed }) => [
                styles.chatGifButton,
                pressed ? styles.pressedFade : null,
                composerBusy || recordingVoice || pendingAttachments.length >= 10 ? styles.disabledButton : null,
              ]}
            >
              <Text style={styles.chatGifText}>GIF</Text>
            </Pressable>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={recordingVoice ? 'Recording voice note...' : 'Type a message...'}
              placeholderTextColor={colors.textSubtle}
              multiline
              editable={!composerBusy && !recordingVoice}
              style={[styles.chatInput, recordingVoice ? styles.chatInputRecording : null]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={recordingVoice ? 'Stop and send voice note' : 'Record voice note'}
              accessibilityState={{ selected: recordingVoice, busy: voiceSending, disabled: sending || voiceSending || callPhase !== 'idle' }}
              disabled={sending || voiceSending || callPhase !== 'idle'}
              onPress={() => void toggleVoiceRecording()}
              style={({ pressed }) => [
                styles.chatComposerIcon,
                recordingVoice ? styles.chatComposerIconRecording : null,
                pressed ? styles.pressedFade : null,
                sending || voiceSending || callPhase !== 'idle' ? styles.disabledButton : null,
              ]}
            >
              {voiceSending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon name={recordingVoice ? 'stop' : 'mic'} size={23} color={recordingVoice ? colors.white : colors.textMuted} />
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              disabled={!canSend || composerBusy}
              onPress={() => void send()}
              style={[styles.chatSendButton, !canSend || composerBusy ? styles.disabledButton : null]}
            >
              {sending ? <ActivityIndicator size="small" color={colors.white} /> : <Icon name="send" size={20} color={colors.white} />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
        <ChatGifPicker visible={gifOpen} onClose={() => setGifOpen(false)} onSelect={addGif} />
        <Modal visible={Boolean(lightboxUri)} title="Photo" onClose={() => setLightboxUri(null)} onRequestClose={() => setLightboxUri(null)}>
          <View style={styles.chatLightbox}>
            {lightboxUri ? <Image source={{ uri: absoluteMediaUrl(lightboxUri) ?? lightboxUri }} contentFit="contain" style={StyleSheet.absoluteFill} /> : null}
          </View>
        </Modal>
      </View>
    </SafeArea>
  );
}

function ChatIncomingCallBanner({ incomingCall, onAccept, onDecline }: { incomingCall: IncomingCall; onAccept: () => void; onDecline: () => void }) {
  return (
    <View style={styles.incomingCallBanner}>
      <Avatar uri={incomingCall.profile_photo_url} name={incomingCall.display_name} size={44} />
      <View style={styles.incomingCallCopy}>
        <Text style={styles.incomingCallTitle}>{incomingCall.display_name}</Text>
        <Text style={styles.incomingCallText}>Incoming {incomingCall.call_type === 'video' ? 'video' : 'voice'} call</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Decline call" onPress={onDecline} style={[styles.callRoundButton, styles.callDeclineButton]}>
        <Icon name="close" size={19} color={colors.white} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Accept call" onPress={onAccept} style={[styles.callRoundButton, styles.callAcceptButton]}>
        <Icon name="phone-call" size={18} color={colors.white} />
      </Pressable>
    </View>
  );
}

function ChatCallOverlay({
  phase,
  kind,
  otherName,
  localStream,
  remoteStream,
  muted,
  cameraOff,
  speakerOn,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
  onEnd,
}: {
  phase: RtcCallPhase;
  kind: RtcCallKind;
  otherName: string;
  localStream: RtcMediaStream | null;
  remoteStream: RtcMediaStream | null;
  muted: boolean;
  cameraOff: boolean;
  speakerOn: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
  onEnd: () => void;
}) {
  const [RtcView, setRtcView] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    import('react-native-webrtc')
      .then((module) => {
        if (mounted) setRtcView(() => module.RTCView);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const remoteUrl = remoteStream?.toURL();
  const localUrl = localStream?.toURL();

  return (
    <View style={styles.callOverlay}>
      {kind === 'video' && RtcView && remoteUrl ? (
        <RtcView streamURL={remoteUrl} style={styles.callVideo} objectFit="cover" />
      ) : (
        <View style={styles.callAudioStage}>
          <View style={styles.callAvatarLarge}>
            <Icon name={kind === 'video' ? 'video' : 'phone-call'} size={42} color={colors.white} />
          </View>
          <Text style={styles.callName}>{otherName}</Text>
          <Text style={styles.callStatus}>{phase === 'calling' ? 'Calling...' : kind === 'video' ? 'Video call' : 'Voice call'}</Text>
        </View>
      )}

      {kind === 'video' && RtcView && localUrl && !cameraOff ? (
        <RtcView streamURL={localUrl} style={styles.callLocalVideo} objectFit="cover" />
      ) : null}

      <View style={styles.callControls}>
        <Pressable accessibilityRole="button" accessibilityLabel={muted ? 'Unmute' : 'Mute'} onPress={onToggleMute} style={styles.callControlButton}>
          <Icon name="mic" size={22} color={muted ? colors.danger : colors.white} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={speakerOn ? 'Use earpiece' : 'Use speaker'} onPress={onToggleSpeaker} style={[styles.callControlButton, speakerOn ? styles.callControlButtonActive : null]}>
          <Icon name="volume" size={22} color={speakerOn ? colors.primary : colors.white} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="End call" onPress={onEnd} style={[styles.callControlButton, styles.callEndButton]}>
          <Icon name="phone-call" size={22} color={colors.white} />
        </Pressable>
        {kind === 'video' ? (
          <Pressable accessibilityRole="button" accessibilityLabel={cameraOff ? 'Turn camera on' : 'Turn camera off'} onPress={onToggleCamera} style={styles.callControlButton}>
            <Icon name="video" size={22} color={cameraOff ? colors.danger : colors.white} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ChatMessageBubble({ message, mine, onImagePress }: { message: Message; mine: boolean; onImagePress: (uri: string) => void }) {
  const mediaUrl = absoluteMediaUrl(message.mediaUrl);

  if (message.messageType === 'call_event') {
    const text = cleanCallEventText(message.text);
    const isVideo = /video/i.test(text);
    return (
      <View style={styles.chatCallEvent}>
        <Icon name={isVideo ? 'video' : 'phone-call'} size={14} color={colors.textMuted} />
        <Text style={styles.chatCallEventText}>{text}</Text>
        <Text style={styles.chatCallEventTime}>{formatChatTime(message.createdAt)}</Text>
      </View>
    );
  }

  if (message.isViewOnce && message.isViewed && !mine) {
    return (
      <View style={[styles.chatBubbleWrap, styles.chatBubbleWrapTheir]}>
        <View style={styles.chatViewedOnce}>
          <Icon name="eye-off" size={14} color={colors.textMuted} />
          <Text style={styles.chatViewedOnceText}>Message viewed - no longer available</Text>
        </View>
        <Text style={styles.chatBubbleTime}>{formatChatTime(message.createdAt)}</Text>
      </View>
    );
  }

  const imageMessage = Boolean(mediaUrl) && (message.messageType === 'image' || message.messageType === 'gif');

  return (
    <View style={[styles.chatBubbleWrap, mine ? styles.chatBubbleWrapMine : styles.chatBubbleWrapTheir]}>
      <View style={[styles.chatBubble, mine ? styles.chatBubbleMine : styles.chatBubbleTheir]}>
        {message.text ? <Text style={[styles.chatBubbleText, mine ? styles.chatBubbleTextMine : null]}>{message.text}</Text> : null}
        {imageMessage && mediaUrl ? (
          <Pressable accessibilityRole="imagebutton" onPress={() => onImagePress(mediaUrl)} style={styles.chatMediaImageWrap}>
            <Image source={{ uri: mediaUrl }} contentFit="cover" style={StyleSheet.absoluteFill} blurRadius={message.isNude ? 22 : 0} />
            {message.isViewOnce ? (
              <View style={styles.chatViewOnceBadge}>
                <Icon name="eye" size={12} color={colors.white} />
                <Text style={styles.chatViewOnceText}>Once</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
        {mediaUrl && message.messageType === 'video' ? (
          <View style={styles.chatMediaPlaceholder}>
            <Icon name="video" size={19} color={mine ? colors.white : colors.textMuted} />
            <Text style={[styles.chatMediaPlaceholderText, mine ? styles.chatBubbleTextMine : null]}>Video message</Text>
          </View>
        ) : null}
        {mediaUrl && message.messageType === 'audio' ? (
          <VoiceMessagePlayer uri={mediaUrl} mine={mine} />
        ) : null}
      </View>
      <Text style={[styles.chatBubbleTime, mine ? styles.chatBubbleTimeMine : null]}>{formatChatTime(message.createdAt)}</Text>
    </View>
  );
}

function VoiceMessagePlayer({ uri, mine }: { uri: string; mine: boolean }) {
  const player = useAudioPlayer(uri, { downloadFirst: true, updateInterval: 350 });
  const status = useAudioPlayerStatus(player);
  const duration = formatAudioDuration(status.duration || status.currentTime);
  const iconColor = mine ? colors.white : colors.primary;

  async function togglePlayback() {
    try {
      if (status.playing) {
        player.pause();
        return;
      }
      if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration - 0.2)) {
        await player.seekTo(0);
      }
      player.play();
    } catch (err) {
      Alert.alert('Could not play voice note', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Pause voice note' : 'Play voice note'}
      onPress={() => void togglePlayback()}
      style={({ pressed }) => [styles.chatVoicePlayer, pressed ? styles.pressedFade : null]}
    >
      <View style={[styles.chatVoiceIcon, mine ? styles.chatVoiceIconMine : null]}>
        <Icon name={status.playing ? 'pause' : 'mic'} size={16} color={iconColor} />
      </View>
      <View style={styles.chatVoiceCopy}>
        <Text style={[styles.chatMediaPlaceholderText, mine ? styles.chatBubbleTextMine : null]}>{status.playing ? 'Playing' : 'Voice message'}</Text>
        {duration ? <Text style={[styles.chatVoiceDuration, mine ? styles.chatVoiceDurationMine : null]}>{duration}</Text> : null}
      </View>
    </Pressable>
  );
}

function ChatAttachmentTray({
  attachments,
  viewOnce,
  onRemove,
  onToggleViewOnce,
}: {
  attachments: PendingChatAttachment[];
  viewOnce: boolean;
  onRemove: (id: string) => void;
  onToggleViewOnce: () => void;
}) {
  if (attachments.length === 0) return null;

  return (
    <View style={styles.chatTray}>
      <View style={styles.chatTrayHeader}>
        <Text style={styles.chatTrayTitle}>{attachments.length} item{attachments.length === 1 ? '' : 's'} ready</Text>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: viewOnce }} onPress={onToggleViewOnce} style={[styles.chatViewOnceToggle, viewOnce ? styles.chatViewOnceToggleActive : null]}>
          <Icon name={viewOnce ? 'eye' : 'eye-off'} size={14} color={viewOnce ? colors.white : colors.textMuted} />
          <Text style={[styles.chatViewOnceToggleText, viewOnce ? styles.chatViewOnceToggleTextActive : null]}>{viewOnce ? 'View once' : 'Keep forever'}</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chatTrayList}>
        {attachments.map((attachment) => (
          <View key={attachment.id} style={styles.chatTrayItem}>
            <Image source={{ uri: attachment.previewUri }} contentFit="cover" style={StyleSheet.absoluteFill} />
            <Pressable accessibilityRole="button" accessibilityLabel="Remove attachment" onPress={() => onRemove(attachment.id)} style={styles.chatTrayRemove}>
              <Icon name="close" size={14} color={colors.white} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function ChatGifPicker({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (gif: ChatGif) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChatGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      messagesService.gifs(query)
        .then((response) => setResults(response.data ?? []))
        .catch((err) => {
          setResults([]);
          setError(err instanceof Error ? err.message : 'Could not load GIFs.');
        })
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query, visible]);

  return (
    <Modal visible={visible} title="GIFs" onClose={onClose} onRequestClose={onClose}>
      <Input label="Search GIFs" value={query} onChangeText={setQuery} placeholder="Search GIFs..." />
      {loading ? <LoadingSpinner /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && results.length === 0 ? <Text variant="muted">No GIFs found</Text> : null}
      <ScrollView style={styles.gifPickerList} contentContainerStyle={styles.gifPickerGrid}>
        {results.map((gif) => {
          const previewUri = gif.images.fixed_height_small?.url ?? gif.images.original.url;
          return (
            <Pressable key={gif.id} accessibilityRole="imagebutton" onPress={() => onSelect(gif)} style={styles.gifPickerItem}>
              <Image source={{ uri: previewUri }} contentFit="cover" style={StyleSheet.absoluteFill} />
            </Pressable>
          );
        })}
      </ScrollView>
      <Text variant="small" style={styles.gifPoweredBy}>Powered by GIPHY</Text>
    </Modal>
  );
}

function ChatDateFeedbackBanner({ matchId }: { matchId: number }) {
  const [step, setStep] = useState<'ask' | 'rate' | 'done' | 'hidden'>('ask');
  const [submitting, setSubmitting] = useState(false);

  async function submit(wentOnDate: boolean, rating?: number) {
    if (wentOnDate && !rating) {
      setStep('rate');
      return;
    }
    setSubmitting(true);
    try {
      await matchesService.submitDateFeedback(matchId, wentOnDate, rating);
      setStep('done');
      setTimeout(() => setStep('hidden'), 1800);
    } catch (err) {
      Alert.alert('Could not save feedback', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'hidden') return null;

  return (
    <View style={styles.chatFeedbackBanner}>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss date feedback" onPress={() => setStep('hidden')} style={styles.chatFeedbackClose}>
        <Icon name="close" size={15} color={colors.textMuted} />
      </Pressable>
      {step === 'ask' ? (
        <>
          <Text style={styles.chatFeedbackTitle}>Did you two meet up?</Text>
          <Text style={styles.chatFeedbackText}>Let us know how it went.</Text>
          <View style={styles.chatFeedbackActions}>
            <Button title="Yes" loading={submitting} onPress={() => void submit(true)} />
            <Button title="Not yet" variant="outline" loading={submitting} onPress={() => void submit(false)} />
          </View>
        </>
      ) : null}
      {step === 'rate' ? (
        <>
          <Text style={styles.chatFeedbackTitle}>How was it?</Text>
          <View style={styles.chatRatingRow}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <Pressable key={rating} accessibilityRole="button" disabled={submitting} onPress={() => void submit(true, rating)} style={styles.chatRatingButton}>
                <Text style={styles.chatRatingText}>{rating}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      {step === 'done' ? <Text style={styles.chatFeedbackDone}>Thanks for sharing.</Text> : null}
    </View>
  );
}

export function ChatMediaScreen() {
  useTheme();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const matchId = numericParam(params.matchId);
  const loadMessages = useCallback(() => (matchId ? messagesService.thread(matchId) : Promise.resolve([])), [matchId]);
  const resource = useResource<Message[]>(loadMessages);

  const mediaMessages = useMemo(
    () => resource.data?.filter((message) => message.mediaUrl).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)) ?? [],
    [resource.data],
  );

  return (
    <ScreenWrapper title="Chat media">
      <Loadable loading={resource.loading} error={resource.error}>
        {mediaMessages.length > 0 ? (
          <View style={styles.grid}>
            {mediaMessages.map((message) => (
              <View key={message.id} style={styles.mediaTile}>
                <ProtectedImage uri={message.mediaUrl} locked={message.isNude} height={170} />
                <Text variant="small" style={styles.subtle}>
                  {formatDateTime(message.createdAt)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState title="No media in this chat" />
        )}
      </Loadable>
    </ScreenWrapper>
  );
}

export function NotificationsScreen() {
  useTheme();
  const styles = useThemedStyles(createStyles);
  const resource = useResource<NotificationItem[]>(notificationsService.list);
  const [threadId, setThreadId] = useState<number | null>(null);
  const [thread, setThread] = useState<NotificationThread | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  async function openThread(notification: NotificationItem) {
    setThreadId(notification.id);
    try {
      const loaded = await notificationsService.thread(notification.id);
      setThread(loaded);
      if (!notification.is_read) await notificationsService.markRead(notification.id);
      await resource.reload();
    } catch (err) {
      Alert.alert('Could not open notification', err instanceof Error ? err.message : 'Try again later.');
    }
  }

  async function markAllRead() {
    try {
      await notificationsService.markAllRead();
      await resource.reload();
    } catch (err) {
      Alert.alert('Could not update notifications', err instanceof Error ? err.message : 'Try again later.');
    }
  }

  async function sendReply() {
    if (!threadId || !reply.trim()) return;
    setSending(true);
    try {
      await notificationsService.reply(threadId, reply.trim());
      setReply('');
      setThread(await notificationsService.thread(threadId));
      await resource.reload();
    } catch (err) {
      Alert.alert('Reply failed', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setSending(false);
    }
  }

  return (
    <ScreenWrapper title="Notifications">
      <View style={styles.actionRow}>
        <Button title="Refresh" variant="outline" onPress={resource.reload} />
        <Button title="Mark all read" variant="outline" onPress={markAllRead} />
      </View>
      <Loadable loading={resource.loading} error={resource.error}>
        {resource.data && resource.data.length > 0 ? (
          <View style={styles.list}>
            {resource.data.map((notification) => (
              <Pressable key={notification.id} onPress={() => void openThread(notification)} style={({ pressed }) => [styles.notificationRow, pressed ? styles.pressedFade : null]}>
                <View style={styles.rowBetween}>
                  <Text style={styles.bold}>{notification.title}</Text>
                  {!notification.is_read ? <Badge label="New" tone="danger" /> : null}
                </View>
                <Text variant="muted" numberOfLines={3}>
                  {notification.message}
                </Text>
                <Text variant="small" style={styles.subtle}>
                  {formatDateTime(notification.created_at)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState title="No notifications" />
        )}
      </Loadable>
      <Modal
        visible={threadId != null}
        title={thread?.notification.title ?? 'Notification'}
        onClose={() => {
          setThreadId(null);
          setThread(null);
          setReply('');
        }}
      >
        <ScrollView contentContainerStyle={styles.thread}>
          {thread ? (
            <>
              <View style={styles.theirBubble}>
                <Text>{thread.notification.message}</Text>
                <Text variant="small" style={styles.theirTime}>
                  {formatDateTime(thread.notification.created_at)}
                </Text>
              </View>
              {thread.replies.map((item) => {
                const mine = item.sender === 'user';
                return (
                  <View key={item.id} style={[styles.bubble, mine ? styles.myBubble : styles.theirBubble]}>
                    <Text style={mine ? styles.myBubbleText : undefined}>{item.message}</Text>
                    <Text variant="small" style={mine ? styles.myTime : styles.theirTime}>
                      {formatDateTime(item.created_at)}
                    </Text>
                  </View>
                );
              })}
            </>
          ) : (
            <LoadingSpinner />
          )}
        </ScrollView>
        <Input label="Reply" value={reply} onChangeText={setReply} multiline />
        <Button title="Send reply" loading={sending} onPress={sendReply} />
      </Modal>
    </ScreenWrapper>
  );
}

function profileIntentLabel(value?: string | null) {
  if (!value) return 'Here for dating';
  const normalized = value.toLowerCase();
  if (normalized.includes('relationship') || normalized.includes('love')) return 'Ready for a relationship';
  if (normalized.includes('friend')) return 'Open to friendship';
  if (normalized.includes('marriage')) return 'Looking for marriage';
  if (normalized.includes('flirt')) return 'Here to flirt';
  if (normalized.includes('hookup') || normalized.includes('sex')) return 'Here for hookups';
  if (normalized.includes('date')) return 'Here for dating';
  return `Looking for ${value}`;
}

function isNewProfile(createdAt?: string | null) {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  return Date.now() - created < 1000 * 60 * 60 * 24 * 30;
}

function profilePhotos(profile: UserProfile, mediaItems?: MediaItem[] | null) {
  const urls = [
    profile.profilePhotoUrl,
    ...(mediaItems?.filter((item) => item.mediaType === 'photo').map((item) => item.url) ?? []),
  ]
    .map(absoluteMediaUrl)
    .filter((url): url is string => Boolean(url));
  return Array.from(new Set(urls));
}

export function ProfileScreen() {
  useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const userId = numericParam(params.id);
  const loadProfile = useCallback(() => (userId ? usersService.profile(userId) : Promise.reject(new Error('Invalid profile.'))), [userId]);
  const loadMedia = useCallback(() => (userId ? mediaService.user(userId) : Promise.resolve([])), [userId]);
  const loadFavorite = useCallback(() => (userId ? likesService.favoriteStatus(userId) : Promise.resolve({ isFavorited: false })), [userId]);
  const profile = useResource(loadProfile);
  const media = useResource(loadMedia);
  const favorite = useResource(loadFavorite);
  const { height } = useWindowDimensions();
  const [reportOpen, setReportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>('fake_profile');
  const [description, setDescription] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [acting, setActing] = useState<'like' | 'superlike' | 'message' | null>(null);
  const activeProfile = profile.data;
  const photos = activeProfile ? profilePhotos(activeProfile, media.data) : [];
  const activePhoto = photos[photoIndex] ?? null;
  const previewHeight = Math.min(Math.max(height * 0.62, 430), 610);

  useEffect(() => {
    if (userId) void usersService.visit(userId);
  }, [userId]);

  useEffect(() => {
    if (photoIndex >= photos.length) setPhotoIndex(0);
  }, [photoIndex, photos.length]);

  function closeProfile() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/discover');
  }

  function nextPhoto() {
    if (photos.length <= 1) return;
    setPhotoIndex((current) => (current + 1) % photos.length);
  }

  async function like(action: 'like' | 'superlike') {
    if (!userId || acting) return;
    setActing(action);
    try {
      const result = action === 'superlike' ? await likesService.superlike(userId) : await likesService.send(userId, 'like');
      Alert.alert(result.matched ? "It's a match" : action === 'superlike' ? 'Superlike sent' : 'Like sent', result.matched ? `You matched with ${activeProfile?.displayName ?? 'this profile'}.` : 'Action complete.', [
        { text: 'Keep browsing' },
        ...(result.matched && result.matchId ? [{ text: 'Message', onPress: () => router.push({ pathname: '/chat/[matchId]', params: { matchId: String(result.matchId) } }) }] : []),
      ]);
    } catch (err) {
      Alert.alert('Action failed', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setActing(null);
    }
  }

  async function message() {
    if (!userId || acting) return;
    setActing('message');
    try {
      const result = await matchesService.startConversation(userId);
      router.push({ pathname: '/chat/[matchId]', params: { matchId: String(result.matchId) } });
    } catch (err) {
      Alert.alert('Could not start chat', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setActing(null);
    }
  }

  async function toggleFavorite() {
    if (!userId) return;
    try {
      if (favorite.data?.isFavorited) await likesService.removeFavorite(userId);
      else await likesService.addFavorite(userId);
      await favorite.reload();
      setMenuOpen(false);
    } catch (err) {
      Alert.alert('Favorite failed', err instanceof Error ? err.message : 'Try again later.');
    }
  }

  async function report() {
    if (!userId) return;
    try {
      await usersService.report(userId, reason, description);
      setReportOpen(false);
      setDescription('');
      Alert.alert('Report submitted');
    } catch (err) {
      Alert.alert('Report failed', err instanceof Error ? err.message : 'Try again later.');
    }
  }

  async function block() {
    if (!userId) return;
    Alert.alert('Block user', 'Block this profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () => void usersService.block(userId).then(() => router.replace('/(tabs)/discover')),
      },
    ]);
  }

  return (
    <SafeArea>
      <Loadable loading={profile.loading} error={profile.error}>
        {activeProfile ? (
          <View style={styles.profilePreviewRoot}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.profilePreviewScroll}>
              <View style={[styles.profilePreviewHero, { height: previewHeight }]}>
                {activePhoto ? (
                  <Image source={{ uri: activePhoto }} contentFit="cover" style={StyleSheet.absoluteFill} />
                ) : (
                  <View style={styles.profilePreviewInitial}>
                    <Text style={styles.profilePreviewInitialText}>{activeProfile.displayName.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.profilePreviewScrim} />
                {photos.length > 1 ? (
                  <View style={styles.profilePreviewPhotoDots}>
                    {photos.map((photo, index) => (
                      <View key={photo} style={[styles.profilePreviewPhotoDot, index === photoIndex ? styles.profilePreviewPhotoDotActive : null]} />
                    ))}
                  </View>
                ) : null}
                <View style={styles.profilePreviewTopInfo}>
                  <View style={[styles.profilePreviewOnlineDot, activeProfile.isOnline ? styles.onlineDotActive : styles.onlineDotInactive]} />
                  <View style={styles.profilePreviewNameBlock}>
                    <Text style={styles.profilePreviewName} numberOfLines={1}>
                      {activeProfile.displayName}, {activeProfile.age}
                    </Text>
                    {isNewProfile(activeProfile.createdAt) ? (
                      <View style={styles.profilePreviewBadge}>
                        <Icon name="spark" size={12} color={colors.primary} />
                        <Text style={styles.profilePreviewBadgeText}>New member</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.profilePreviewTopActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Profile options" onPress={() => setMenuOpen(true)} style={styles.profilePreviewCircle}>
                    <Icon name="more-horizontal" size={22} color={colors.white} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Close profile" onPress={closeProfile} style={styles.profilePreviewCircle}>
                    <Icon name="close" size={21} color={colors.white} />
                  </Pressable>
                </View>
                <View style={styles.profilePreviewActionRow}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Send superlike" disabled={Boolean(acting)} onPress={() => void like('superlike')} style={[styles.profilePreviewSmallAction, acting === 'superlike' ? styles.disabledButton : null]}>
                    <Icon name="spark" size={24} color={colors.white} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Send like" disabled={Boolean(acting)} onPress={() => void like('like')} style={[styles.profilePreviewLikeAction, acting === 'like' ? styles.disabledButton : null]}>
                    {acting === 'like' ? <ActivityIndicator color={colors.primary} /> : <Icon name="heart" size={30} color={colors.primary} />}
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Next photo" disabled={photos.length <= 1} onPress={nextPhoto} style={[styles.profilePreviewSmallAction, photos.length <= 1 ? styles.disabledButton : null]}>
                    <Icon name="chevron-right" size={24} color={colors.white} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.profilePreviewPanel}>
                <View style={styles.profilePreviewIntentRow}>
                  <Icon name="heart" size={19} color={colors.textMuted} />
                  <Text style={styles.profilePreviewIntentText}>{profileIntentLabel(activeProfile.lookingFor)}</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => void message()} disabled={acting === 'message'} style={styles.profilePreviewMessagePill}>
                  <Text style={styles.profilePreviewMessagePlaceholder} numberOfLines={1}>
                    Send a like to message...
                  </Text>
                  <View style={styles.profilePreviewSendButton}>
                    {acting === 'message' ? <ActivityIndicator color={colors.white} size="small" /> : <Icon name="send" size={19} color={colors.white} />}
                  </View>
                </Pressable>

                {activeProfile.bio ? (
                  <View style={styles.profilePreviewSection}>
                    <Text style={styles.profilePreviewSectionTitle}>About me</Text>
                    <Text style={styles.profilePreviewBody}>{activeProfile.bio}</Text>
                  </View>
                ) : null}

                <View style={styles.profilePreviewFactGrid}>
                  {activeProfile.location ? <Badge label={activeProfile.location} /> : null}
                  {activeProfile.heightCm ? <Badge label={formatHeight(activeProfile.heightCm)} /> : null}
                  {activeProfile.relationshipStatus ? <Badge label={activeProfile.relationshipStatus} /> : null}
                  {activeProfile.ethnicity ? <Badge label={activeProfile.ethnicity} /> : null}
                  {activeProfile.religion ? <Badge label={activeProfile.religion} /> : null}
                </View>

                <InterestsTags interests={activeProfile.interests} />
                {media.data && media.data.length > 0 ? (
                  <View style={styles.profilePreviewSection}>
                    <Text style={styles.profilePreviewSectionTitle}>Media</Text>
                    <MediaGallery items={media.data} />
                  </View>
                ) : null}
              </View>
            </ScrollView>

            <Modal visible={menuOpen} title="Profile options" onClose={() => setMenuOpen(false)} onRequestClose={() => setMenuOpen(false)}>
              <Button title={favorite.data?.isFavorited ? 'Remove favorite' : 'Add favorite'} variant="outline" onPress={() => void toggleFavorite()} />
              <Button title="Message" variant="outline" onPress={() => void message()} />
              <Button
                title="Report profile"
                variant="outline"
                onPress={() => {
                  setMenuOpen(false);
                  setReportOpen(true);
                }}
              />
              <Button title="Block profile" variant="danger" onPress={block} />
            </Modal>
            <Modal visible={reportOpen} title="Report profile" onClose={() => setReportOpen(false)} onRequestClose={() => setReportOpen(false)}>
              <OptionGroup label="Reason" value={reason} options={REPORT_REASONS} onChange={setReason} />
              <Input label="Description" value={description} onChangeText={setDescription} multiline />
              <Button title="Submit report" onPress={report} />
            </Modal>
          </View>
        ) : null}
      </Loadable>
    </SafeArea>
  );
}

export function MyProfileScreen() {
  useTheme();
  const { user, setUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [heightCm, setHeightCm] = useState(user?.heightCm ? String(user.heightCm) : '');
  const [interests, setInterests] = useState((user?.interests ?? []).join(', '));
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  async function changeProfilePhoto(source: 'library' | 'camera') {
    if (!user) return;
    setPhotoLoading(true);
    try {
      const picked = await requestPickedImage(source);
      if (!picked) return;
      const uploaded = await mediaService.upload({
        ...picked,
        isNude: false,
        isProfilePhoto: true,
        context: 'profile',
      });
      setUser({ ...user, profilePhotoUrl: uploaded.url });
      Alert.alert('Profile photo updated');
    } catch (err) {
      Alert.alert('Photo upload failed', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setPhotoLoading(false);
    }
  }

  async function save() {
    setLoading(true);
    try {
      const updated = await usersService.updateProfile({
        displayName: cleanText(displayName, 50),
        bio: cleanText(bio, 500),
        location: cleanText(location, 80),
        heightCm: heightCm ? Number(heightCm) : null,
        interests: interests.split(',').map((item) => item.trim()).filter(Boolean),
      });
      setUser(updated);
      Alert.alert('Profile saved');
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper title="My profile">
      {user ? (
        <>
          <Card style={styles.profileHeader}>
            <Avatar uri={user.profilePhotoUrl} name={user.displayName} size={72} />
            <View style={styles.matchCopy}>
              <Text variant="heading">{user.displayName}</Text>
              <Text variant="muted">{user.email}</Text>
              <Text variant="small" style={styles.subtle}>
                {user.credits} credits
              </Text>
            </View>
          </Card>
          <View style={styles.photoActions}>
            <Button title="Change profile photo" fullWidth variant="outline" loading={photoLoading} onPress={() => void changeProfilePhoto('library')} />
            <Button title="Take new photo" fullWidth variant="outline" disabled={photoLoading} onPress={() => void changeProfilePhoto('camera')} />
          </View>
          <Input label="Display name" value={displayName} onChangeText={setDisplayName} />
          <Input label="Bio" value={bio} onChangeText={setBio} multiline />
          <Input label="Location" value={location} onChangeText={setLocation} />
          <Input label="Height cm" value={heightCm} onChangeText={setHeightCm} keyboardType="number-pad" />
          <Input label="Interests" value={interests} onChangeText={setInterests} />
          <Button title="Save profile" loading={loading} onPress={save} />
          <View style={styles.actionRow}>
            <Button title="Media" variant="outline" onPress={() => router.push('/me/media')} />
            <Button title="Preferences" variant="outline" onPress={() => router.push('/me/preferences')} />
            <Button title="Settings" variant="outline" onPress={() => router.push('/settings')} />
          </View>
          <Button title="Premium and credits" variant="secondary" onPress={() => router.push('/premium')} />
          <Button title="Log out" variant="ghost" onPress={() => void logout()} />
        </>
      ) : null}
    </ScreenWrapper>
  );
}

export function MediaScreen() {
  useTheme();
  const { user, setUser } = useAuth();
  const resource = useResource<MediaItem[]>(mediaService.mine);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [isNude, setIsNude] = useState(false);
  const [isProfilePhoto, setIsProfilePhoto] = useState(false);
  const [loading, setLoading] = useState(false);

  async function chooseMedia(source: 'library' | 'camera') {
    try {
      const picked = await requestPickedImage(source);
      if (picked) setPickedImage(picked);
    } catch (err) {
      Alert.alert('Photo picker failed', err instanceof Error ? err.message : 'Try again later.');
    }
  }

  async function upload() {
    if (!pickedImage) {
      Alert.alert('Choose a photo first');
      return;
    }
    setLoading(true);
    try {
      const uploaded = await mediaService.upload({ ...pickedImage, isNude, isProfilePhoto, context: 'profile' });
      if (isProfilePhoto && user) setUser({ ...user, profilePhotoUrl: uploaded.url });
      setPickedImage(null);
      await resource.reload();
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setLoading(false);
    }
  }

  async function remove(item: MediaItem) {
    await mediaService.remove(item.id);
    await resource.reload();
  }

  return (
    <ScreenWrapper title="Media">
      <Loadable loading={resource.loading} error={resource.error}>
        {resource.data && resource.data.length > 0 ? <MediaGallery items={resource.data} /> : <EmptyState title="No media yet" />}
      </Loadable>
      {resource.data?.map((item) => (
        <Card key={item.id} style={styles.rowBetween}>
          <Text numberOfLines={1} style={styles.flex}>
            {item.isProfilePhoto ? 'Profile photo' : item.mediaType} {item.isNude ? 'NSFW' : ''}
          </Text>
          <Button title="Delete" variant="danger" onPress={() => void remove(item)} />
        </Card>
      ))}
      <Section title="Upload">
        <View style={styles.mediaPickerPreview}>
          {pickedImage ? (
            <Image source={{ uri: pickedImage.uri }} contentFit="cover" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <View style={styles.photoPlus}>
                <Icon name="camera" size={25} color={colors.white} />
              </View>
              <Text variant="small" style={styles.photoHint}>
                Select photo
              </Text>
            </View>
          )}
        </View>
        <View style={styles.photoActions}>
          <Button title="Choose photo" fullWidth variant="outline" onPress={() => void chooseMedia('library')} />
          <Button title="Take photo" fullWidth variant="outline" onPress={() => void chooseMedia('camera')} />
        </View>
        <View style={styles.actionRow}>
          <Button title={isProfilePhoto ? 'Profile photo' : 'Gallery'} variant={isProfilePhoto ? 'primary' : 'outline'} onPress={() => setIsProfilePhoto((v) => !v)} />
          <Button title={isNude ? 'NSFW' : 'Standard'} variant={isNude ? 'danger' : 'outline'} onPress={() => setIsNude((v) => !v)} />
        </View>
        <Button title="Upload" fullWidth loading={loading} onPress={upload} />
      </Section>
    </ScreenWrapper>
  );
}

const PREFERENCE_MIN_AGE = 18;
const PREFERENCE_MAX_AGE = 80;
const PREFERENCE_AGE_VALUES = Array.from({ length: PREFERENCE_MAX_AGE - PREFERENCE_MIN_AGE + 1 }, (_, index) => PREFERENCE_MIN_AGE + index);

const PREFERENCE_GENDER_OPTIONS: { value: Gender; label: string; icon: React.ComponentProps<typeof Icon>['name'] }[] = [
  { value: 'man', label: 'Man', icon: 'mars' },
  { value: 'woman', label: 'Woman', icon: 'venus' },
  { value: 'trans', label: 'Trans', icon: 'transgender' },
  { value: 'nonbinary', label: 'Non-binary', icon: 'nonbinary' },
];

function clampPreferenceAge(age: number) {
  return Math.min(PREFERENCE_MAX_AGE, Math.max(PREFERENCE_MIN_AGE, Math.round(age)));
}

function preferenceAgePercent(age: number) {
  const clamped = clampPreferenceAge(age);
  return ((clamped - PREFERENCE_MIN_AGE) / (PREFERENCE_MAX_AGE - PREFERENCE_MIN_AGE)) * 100;
}

function countriesSummary(countries: string[]) {
  if (countries.length === 0) return 'Any country';
  if (countries.length === 1) return countries[0];
  return `${countries[0]} +${countries.length - 1} more`;
}

function PreferenceAgeCard({
  label,
  value,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  displayValue: string;
  onChange: (value: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const percent = preferenceAgePercent(value);

  function updateFromLocation(locationX: number) {
    if (trackWidth <= 0) return;
    const ratio = Math.min(1, Math.max(0, locationX / trackWidth));
    onChange(clampPreferenceAge(PREFERENCE_MIN_AGE + ratio * (PREFERENCE_MAX_AGE - PREFERENCE_MIN_AGE)));
  }

  function updateFromEvent(event: GestureResponderEvent) {
    updateFromLocation(event.nativeEvent.locationX);
  }

  function handleLayout(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={styles.preferenceAgeCard}>
      <View style={styles.preferenceAgeHeader}>
        <Text style={styles.preferenceCardLabel}>{label}</Text>
        <Icon name="calendar" size={16} color={colors.primary} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Select ${label.toLowerCase()}`} onPress={() => setSelectorOpen(true)} style={styles.preferenceAgeValueButton}>
        <Text style={styles.preferenceAgeValue}>{displayValue}</Text>
      </Pressable>
      <Text style={styles.preferenceAgeUnit}>Years old</Text>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        onLayout={handleLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={updateFromEvent}
        onResponderMove={updateFromEvent}
        style={styles.preferenceSliderTrack}
      >
        <View style={styles.preferenceSliderBase} />
        <View style={[styles.preferenceSliderFill, { width: `${percent}%` }]} />
        <View style={[styles.preferenceSliderThumb, { left: `${percent}%` }]} />
      </View>
      <View style={styles.preferenceSliderLabels}>
        <Text style={styles.preferenceSliderLabel}>18</Text>
        <Text style={styles.preferenceSliderLabel}>80+</Text>
      </View>
      <Modal visible={selectorOpen} title={label} onClose={() => setSelectorOpen(false)} onRequestClose={() => setSelectorOpen(false)}>
        <ScrollView style={styles.preferenceAgeSelectorList} contentContainerStyle={styles.preferenceAgeSelectorContent}>
          {PREFERENCE_AGE_VALUES.map((age) => {
            const active = clampPreferenceAge(value) === age;
            return (
              <Pressable
                key={age}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  onChange(age);
                  setSelectorOpen(false);
                }}
                style={[styles.preferenceAgeSelectorOption, active ? styles.preferenceAgeSelectorOptionActive : null]}
              >
                <Text style={[styles.preferenceAgeSelectorText, active ? styles.preferenceAgeSelectorTextActive : null]}>{age === PREFERENCE_MAX_AGE ? '80+' : age}</Text>
                {active ? <Icon name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Modal>
    </View>
  );
}

function PreferenceSummaryRow({
  icon,
  title,
  value,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  title: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.preferenceSummaryCard, pressed ? styles.pressedFade : null]}>
      <View style={styles.preferenceSummaryIcon}>
        <Icon name={icon} size={21} color={colors.primary} />
      </View>
      <View style={styles.preferenceSummaryCopy}>
        <Text style={styles.preferenceSummaryTitle}>{title}</Text>
        <Text style={styles.preferenceSummaryValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Icon name="chevron-right" size={19} color={colors.textMuted} />
    </Pressable>
  );
}

export function PreferencesScreen() {
  useTheme();
  const resource = useResource<Preferences>(usersService.preferences);
  const [draftOverride, setDraftOverride] = useState<Preferences | null>(null);
  const [countriesOpen, setCountriesOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const draft = draftOverride ?? resource.data;

  function patch(next: Partial<Preferences>) {
    setDraftOverride((current) => {
      const base = current ?? resource.data;
      return base ? { ...base, ...next } : current;
    });
  }

  async function save() {
    if (!draft) return;
    try {
      await usersService.updatePreferences(draft);
      Alert.alert('Preferences saved');
      setDraftOverride(null);
      await resource.reload();
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Try again later.');
    }
  }

  function toggleCountry(country: string) {
    if (!draft) return;
    const active = draft.countries.includes(country);
    patch({
      countries: active ? draft.countries.filter((item) => item !== country) : [...draft.countries, country],
    });
  }

  const minAge = draft ? clampPreferenceAge(draft.minAge) : PREFERENCE_MIN_AGE;
  const maxAgeVisual = draft ? clampPreferenceAge(draft.maxAge >= PREFERENCE_MAX_AGE ? PREFERENCE_MAX_AGE : draft.maxAge) : PREFERENCE_MAX_AGE;
  const locationSummary = draft?.discoverLocation?.trim() || 'Set location';

  return (
    <ScreenWrapper title="Preferences" contentStyle={styles.preferencesScreen}>
      <Loadable loading={resource.loading} error={resource.error}>
        {draft ? (
          <>
            <View style={styles.preferenceAgeGrid}>
              <PreferenceAgeCard
                label="Min age"
                value={minAge}
                displayValue={String(minAge)}
                onChange={(value) => patch({ minAge: Math.min(value, maxAgeVisual) })}
              />
              <PreferenceAgeCard
                label="Max age"
                value={maxAgeVisual}
                displayValue={draft.maxAge >= PREFERENCE_MAX_AGE ? '80+' : String(maxAgeVisual)}
                onChange={(value) => patch({ maxAge: value >= PREFERENCE_MAX_AGE ? 99 : Math.max(value, minAge) })}
              />
            </View>

            <PreferenceSummaryRow
              icon="location"
              title="Location"
              value={locationSummary}
              onPress={() => setLocationOpen(true)}
            />

            <PreferenceSummaryRow
              icon="globe"
              title="Countries"
              value={countriesSummary(draft.countries)}
              onPress={() => setCountriesOpen(true)}
            />

            <View style={styles.preferenceGenderCard}>
              <View style={styles.preferenceGenderHeader}>
                <Icon name="heart" size={21} color={colors.primary} />
                <View style={styles.preferenceGenderCopy}>
                  <Text style={styles.preferenceGenderTitle}>Looking for</Text>
                  <Text style={styles.preferenceGenderSubtitle}>Select all that apply</Text>
                </View>
              </View>
              <View style={styles.preferenceGenderGrid}>
                {PREFERENCE_GENDER_OPTIONS.map((option) => {
                  const gender = option.value;
                  const active = draft.interestedInGenders.includes(gender);
                  return (
                    <Pressable
                      key={gender}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() =>
                        patch({
                          interestedInGenders: active
                            ? draft.interestedInGenders.filter((item) => item !== gender)
                            : [...draft.interestedInGenders, gender],
                        })
                      }
                      style={[styles.preferenceGenderOption, active ? styles.preferenceGenderOptionActive : null]}
                    >
                      {active ? (
                        <View style={styles.preferenceGenderCheck}>
                          <Icon name="check" size={10} color={colors.white} strokeWidth={3} />
                        </View>
                      ) : null}
                      <Icon name={option.icon} size={22} color={active ? colors.primary : colors.textMuted} />
                      <Text style={[styles.preferenceGenderOptionText, active ? styles.preferenceGenderOptionTextActive : null]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Button title="Save preference" fullWidth onPress={save} style={styles.preferencesSaveButton} />

            <Modal visible={locationOpen} title="Location" onClose={() => setLocationOpen(false)} onRequestClose={() => setLocationOpen(false)}>
              <Input label="Location" value={draft.discoverLocation ?? ''} onChangeText={(value) => patch({ discoverLocation: value })} placeholder="City, country" />
              <Button title="Done" onPress={() => setLocationOpen(false)} />
            </Modal>

            <Modal visible={countriesOpen} title="Countries" onClose={() => setCountriesOpen(false)} onRequestClose={() => setCountriesOpen(false)}>
              <View style={styles.countryActions}>
                <Button title="Any country" variant={draft.countries.length === 0 ? 'primary' : 'outline'} onPress={() => patch({ countries: [] })} />
                <Button title="Done" variant="secondary" onPress={() => setCountriesOpen(false)} />
              </View>
              <ScrollView style={styles.countryList} contentContainerStyle={styles.countryListContent}>
                {COUNTRIES.map((country) => {
                  const active = draft.countries.includes(country);
                  return (
                    <Pressable
                      key={country}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => toggleCountry(country)}
                      style={[styles.countryOption, active ? styles.countryOptionActive : null]}
                    >
                      <Text style={styles.countryOptionText}>{country}</Text>
                      {active ? <Icon name="check" size={18} color={colors.primary} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Modal>
          </>
        ) : null}
      </Loadable>
    </ScreenWrapper>
  );
}

type SettingsRowProps = {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
};

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.settingsSection}>
      <Text style={styles.settingsSectionTitle}>{title}</Text>
      <View style={styles.settingsGroup}>{children}</View>
    </View>
  );
}

function SettingsRow({ icon, label, value, onPress, right, danger = false, disabled = false }: SettingsRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const interactive = Boolean(onPress) && !disabled;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ disabled }}
      disabled={!interactive}
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, pressed && interactive ? styles.pressedFade : null, disabled ? styles.settingsRowDisabled : null]}
    >
      <View style={[styles.settingsRowIcon, danger ? styles.settingsRowIconDanger : null]}>
        <Icon name={icon} size={20} color={danger ? colors.danger : colors.textMuted} />
      </View>
      <View style={styles.settingsRowCopy}>
        <Text style={[styles.settingsRowLabel, danger ? styles.settingsRowLabelDanger : null]} numberOfLines={1}>
          {label}
        </Text>
        {value ? (
          <Text style={styles.settingsRowValue} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-right" size={20} color={danger ? colors.danger : colors.textSubtle} /> : null)}
    </Pressable>
  );
}

function SettingsPillSwitch({
  value,
  activeLabel,
  inactiveLabel,
  onValueChange,
  loading = false,
  tone = 'primary',
}: {
  value: boolean;
  activeLabel: string;
  inactiveLabel: string;
  onValueChange: (nextValue: boolean) => void;
  loading?: boolean;
  tone?: 'primary' | 'success' | 'danger';
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const activeStyle = tone === 'danger' ? styles.settingsSwitchDanger : tone === 'success' ? styles.settingsSwitchSuccess : styles.settingsSwitchPrimary;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: loading }}
      disabled={loading}
      onPress={() => onValueChange(!value)}
      style={[styles.settingsSwitch, value ? activeStyle : null, loading ? styles.settingsSwitchLoading : null]}
    >
      {loading ? <ActivityIndicator size="small" color={value ? colors.white : colors.textMuted} /> : null}
      <Text style={[styles.settingsSwitchText, value ? styles.settingsSwitchTextActive : null]} numberOfLines={1}>
        {value ? activeLabel : inactiveLabel}
      </Text>
    </Pressable>
  );
}

export function SettingsScreen() {
  const { user, setUser, logout } = useAuth();
  const appTheme = useTheme();
  const styles = useThemedStyles(createStyles);
  const themeColors = appTheme.colors;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [paypalModalOpen, setPaypalModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [paypalLoading, setPaypalLoading] = useState(false);
  const [presenceLoading, setPresenceLoading] = useState<'online' | 'pause' | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const activeThemeLabel = appTheme.options.find((option) => option.mode === appTheme.mode)?.label ?? 'White';

  async function changePassword() {
    const currentValidation = validatePassword(currentPassword);
    const newValidation = validatePassword(newPassword);
    if (!currentValidation.ok) {
      Alert.alert('Current password', currentValidation.message);
      return;
    }
    if (!newValidation.ok) {
      Alert.alert('New password', newValidation.message);
      return;
    }
    setPasswordLoading(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordModalOpen(false);
      Alert.alert('Password changed', 'Your account password has been updated.');
    } catch (err) {
      Alert.alert('Password failed', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setPasswordLoading(false);
    }
  }

  async function setOnlineStatus(isOnline: boolean) {
    setPresenceLoading('online');
    try {
      await usersService.setOnlineStatus(isOnline);
      if (user) setUser({ ...user, isOnline });
    } catch (err) {
      Alert.alert('Online status failed', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setPresenceLoading(null);
    }
  }

  async function setPauseStatus(isPaused: boolean) {
    setPresenceLoading('pause');
    try {
      await usersService.setPauseStatus(isPaused);
      if (user) setUser({ ...user, isPaused });
    } catch (err) {
      Alert.alert('Pause status failed', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setPresenceLoading(null);
    }
  }

  async function connectPaypal() {
    const email = paypalEmail.trim().toLowerCase();
    const validation = validateEmail(email);
    if (!validation.ok) {
      Alert.alert('PayPal email', validation.message);
      return;
    }
    setPaypalLoading(true);
    try {
      const result = await authService.connectPaypal(email);
      setUser(result.user);
      setPaypalEmail('');
      setPaypalModalOpen(false);
      Alert.alert('PayPal connected', 'Your free premium trial can continue after verification.');
    } catch (err) {
      Alert.alert('Could not connect PayPal', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setPaypalLoading(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirmText.trim() !== 'DELETE') {
      Alert.alert('Confirmation required', 'Type DELETE exactly to permanently delete your account.');
      return;
    }
    setDeleteLoading(true);
    try {
      await usersService.deleteAccount();
      setDeleteModalOpen(false);
      setDeleteConfirmText('');
      setUser(null);
      await logout();
    } catch (err) {
      Alert.alert('Delete failed', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setDeleteLoading(false);
    }
  }

  function openPaypalModal() {
    setPaypalEmail((current) => current || user?.email || '');
    setPaypalModalOpen(true);
  }

  function confirmLogout() {
    Alert.alert('Log out', 'You will need to sign in again to use RedLove.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <ScreenWrapper title="Settings" subtitle="Manage your account, visibility, payments, and app preferences." contentStyle={styles.settingsContent}>
      {user ? (
        <>
          <View style={styles.settingsProfile}>
            <Avatar uri={user.profilePhotoUrl} name={user.displayName} size={92} />
            <View style={styles.settingsProfileCopy}>
              <Text style={styles.settingsProfileName} numberOfLines={1}>
                {user.displayName}
              </Text>
              <Text style={styles.settingsProfileEmail} numberOfLines={1}>
                {user.email}
              </Text>
              <View style={styles.settingsProfileBadges}>
                <View style={styles.settingsStatusBadge}>
                  <View style={[styles.settingsStatusDot, user.isOnline ? styles.settingsStatusDotOnline : styles.settingsStatusDotOffline]} />
                  <Text style={styles.settingsStatusText}>{user.isOnline ? 'Online' : 'Offline'}</Text>
                </View>
                {user.isPremium ? (
                  <View style={[styles.settingsStatusBadge, styles.settingsPremiumBadge]}>
                    <Icon name="crown" size={13} color={themeColors.primary} />
                    <Text style={styles.settingsStatusText}>Premium</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <SettingsSection title="Account Settings">
            <SettingsRow icon="profile" label="Edit Profile" value="Profile, photos, and interests" onPress={() => router.push('/me' as Href)} />
            <SettingsRow icon="lock" label="Change password" value="Update your sign-in password" onPress={() => setPasswordModalOpen(true)} />
            <SettingsRow icon="shield" label="Security & Privacy" value="Trust and safety information" onPress={() => router.push('/(legal)/trust' as Href)} />
          </SettingsSection>

          <SettingsSection title="Visibility">
            <SettingsRow
              icon="compass"
              label="Online"
              value={user.isOnline ? 'Visible in online indicators' : 'Hidden from online indicators'}
              right={
                <SettingsPillSwitch
                  value={user.isOnline}
                  activeLabel="Online"
                  inactiveLabel="Offline"
                  loading={presenceLoading === 'online'}
                  tone="success"
                  onValueChange={(nextValue) => void setOnlineStatus(nextValue)}
                />
              }
            />
            <SettingsRow
              icon="pause"
              label="Paused"
              value={user.isPaused ? 'Discovery is paused' : 'Discovery is active'}
              right={
                <SettingsPillSwitch
                  value={user.isPaused}
                  activeLabel="Paused"
                  inactiveLabel="Active"
                  loading={presenceLoading === 'pause'}
                  tone="danger"
                  onValueChange={(nextValue) => void setPauseStatus(nextValue)}
                />
              }
            />
          </SettingsSection>

          <SettingsSection title="Payments">
            <SettingsRow
              icon="paypal"
              label="PayPal"
              value={user.paypalConnected ? 'Connected' : 'Connect within 14 days to keep premium'}
              onPress={user.paypalConnected ? undefined : openPaypalModal}
              right={user.paypalConnected ? <Text style={styles.settingsConnectedText}>Connected</Text> : undefined}
            />
            <SettingsRow icon="payments" label="Payment History" value="Orders, credits, and premium purchases" onPress={() => router.push('/payments/history')} />
          </SettingsSection>

          <SettingsSection title="App">
            <SettingsRow
              icon="theme"
              label="Theme"
              value={`${activeThemeLabel} mode`}
              onPress={() => setThemeModalOpen(true)}
            />
          </SettingsSection>

          <SettingsSection title="Legal">
            <SettingsRow icon="shield" label="Privacy" value="Privacy Policy" onPress={() => router.push('/(legal)/privacy' as Href)} />
            <SettingsRow icon="file" label="Terms" value="Terms of Service" onPress={() => router.push('/(legal)/terms' as Href)} />
            <SettingsRow icon="about" label="About" value="RedLove mobile" onPress={() => Alert.alert('About RedLove', 'Version 1.0.0')} />
          </SettingsSection>

          <SettingsSection title="Session">
            <SettingsRow icon="delete" label="Delete Account" value="Permanently remove your account" danger disabled={deleteLoading} onPress={() => setDeleteModalOpen(true)} />
            <SettingsRow icon="logout" label="Logout" value="Sign out of this device" danger onPress={confirmLogout} />
          </SettingsSection>

          <Modal visible={passwordModalOpen} title="Change password" onClose={() => setPasswordModalOpen(false)} onRequestClose={() => setPasswordModalOpen(false)}>
            <Input label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" />
            <Input label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" />
            <Button title="Save password" loading={passwordLoading} onPress={changePassword} />
          </Modal>

          <Modal visible={paypalModalOpen} title="Connect PayPal" onClose={() => setPaypalModalOpen(false)} onRequestClose={() => setPaypalModalOpen(false)}>
            <Text variant="muted">Connect PayPal within 14 days to keep your free premium and earn bonus credits.</Text>
            <Input label="PayPal email" value={paypalEmail} onChangeText={setPaypalEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <Button title="Connect PayPal" loading={paypalLoading} onPress={connectPaypal} />
          </Modal>

          <Modal visible={themeModalOpen} title="Theme" onClose={() => setThemeModalOpen(false)} onRequestClose={() => setThemeModalOpen(false)}>
            <View style={styles.themeOptions}>
              {appTheme.options.map((option) => {
                const active = option.mode === appTheme.mode;
                const optionPalette = themePalettes[option.mode];
                return (
                  <Pressable
                    key={option.mode}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      appTheme.selectMode(option.mode);
                      setThemeModalOpen(false);
                    }}
                    style={[styles.themeOption, active ? styles.themeOptionActive : null]}
                  >
                    <View style={[styles.themeSwatch, { backgroundColor: optionPalette.primary }]}>
                      <View style={[styles.themeSwatchInner, { backgroundColor: optionPalette.background }]} />
                    </View>
                    <View style={styles.themeOptionCopy}>
                      <Text style={styles.themeOptionTitle}>{option.label}</Text>
                      <Text style={styles.themeOptionDescription}>{option.description}</Text>
                    </View>
                    {active ? <Icon name="check" size={21} color={themeColors.primary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </Modal>

          <Modal
            visible={deleteModalOpen}
            title="Delete account"
            onClose={() => {
              setDeleteModalOpen(false);
              setDeleteConfirmText('');
            }}
            onRequestClose={() => {
              setDeleteModalOpen(false);
              setDeleteConfirmText('');
            }}
          >
            <Text variant="muted">This permanently deletes your account and data. Type DELETE to confirm.</Text>
            <Input label="Type DELETE" value={deleteConfirmText} onChangeText={setDeleteConfirmText} autoCapitalize="characters" autoCorrect={false} />
            <Button title="Delete account" variant="danger" loading={deleteLoading} disabled={deleteConfirmText.trim() !== 'DELETE'} onPress={() => void deleteAccount()} />
          </Modal>
        </>
      ) : null}
    </ScreenWrapper>
  );
}

type PendingPayment = {
  orderId: string;
  approvalUrl?: string;
  title: string;
  kind: 'premium' | 'credits';
};

export function PremiumScreen() {
  useTheme();
  const auth = useAuth();
  const status = useResource<PremiumStatus>(premiumService.status);
  const plans = useResource<PremiumPlan[]>(premiumService.plans);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [paymentLoadingId, setPaymentLoadingId] = useState<string | null>(null);

  async function buy(plan: PremiumPlan) {
    setPaymentLoadingId(plan.id);
    try {
      const order = await premiumService.createOrder('premium_plan', plan.id);
      setPendingPayment({ orderId: order.orderId, approvalUrl: order.approvalUrl, title: plan.name, kind: 'premium' });
      await openPaymentProvider(order.orderId, order.approvalUrl);
    } catch (err) {
      Alert.alert('Payment unavailable', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setPaymentLoadingId(null);
    }
  }

  async function capturePendingPayment() {
    if (!pendingPayment) return;
    setPaymentLoadingId(pendingPayment.orderId);
    try {
      await premiumService.captureOrder(pendingPayment.orderId);
      await Promise.all([status.reload(), auth.refresh()]);
      setPendingPayment(null);
      Alert.alert('Payment captured', 'Your premium status has been updated.');
    } catch (err) {
      Alert.alert('Capture failed', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setPaymentLoadingId(null);
    }
  }

  return (
    <ScreenWrapper title="Premium">
      <Loadable loading={status.loading} error={status.error}>
        {status.data ? (
          <Card style={styles.gap}>
            <Text variant="heading">{status.data.isPremium ? 'Premium active' : 'Free plan'}</Text>
            <Text variant="muted">{status.data.credits} credits</Text>
            <Text variant="small">Likes today: {status.data.likesRemainingToday}</Text>
          </Card>
        ) : null}
      </Loadable>
      <Loadable loading={plans.loading} error={plans.error}>
        {plans.data?.map((plan) => (
          <Card key={plan.id} style={styles.gap}>
            <View style={styles.rowBetween}>
              <Text variant="heading">{plan.name}</Text>
              <Text style={styles.price}>{formatCurrency(plan.priceUsd)}</Text>
            </View>
            <Text variant="muted">{plan.description}</Text>
            {plan.features.map((feature) => (
              <Text key={feature} variant="small">
                {feature}
              </Text>
            ))}
            <Button title="Select plan" loading={paymentLoadingId === plan.id} onPress={() => void buy(plan)} />
          </Card>
        ))}
      </Loadable>
      <Button title="Credit packs" variant="secondary" onPress={() => router.push('/premium/credits')} />
      <Button title="Payment history" variant="outline" onPress={() => router.push('/payments/history')} />
      <Modal visible={Boolean(pendingPayment)} title="Complete PayPal payment" onClose={() => setPendingPayment(null)} onRequestClose={() => setPendingPayment(null)}>
        <View style={styles.gap}>
          <Text style={styles.bold}>{pendingPayment?.title}</Text>
          <Text variant="muted">After approving the payment in PayPal, return here and confirm so RedLove can capture the order.</Text>
          {pendingPayment?.approvalUrl ? (
            <Button title="Open PayPal again" variant="outline" onPress={() => void openPaymentProvider(pendingPayment.orderId, pendingPayment.approvalUrl)} />
          ) : null}
          <Button title="I approved in PayPal" loading={paymentLoadingId === pendingPayment?.orderId} onPress={() => void capturePendingPayment()} />
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

export function CreditsScreen() {
  useTheme();
  const auth = useAuth();
  const packs = useResource<CreditPack[]>(premiumService.creditPacks);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [paymentLoadingId, setPaymentLoadingId] = useState<string | null>(null);

  async function buy(pack: CreditPack) {
    setPaymentLoadingId(pack.id);
    try {
      const order = await premiumService.createOrder('credit_pack', pack.id);
      setPendingPayment({ orderId: order.orderId, approvalUrl: order.approvalUrl, title: pack.label, kind: 'credits' });
      await openPaymentProvider(order.orderId, order.approvalUrl);
    } catch (err) {
      Alert.alert('Payment unavailable', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setPaymentLoadingId(null);
    }
  }

  async function capturePendingPayment() {
    if (!pendingPayment) return;
    setPaymentLoadingId(pendingPayment.orderId);
    try {
      await premiumService.captureOrder(pendingPayment.orderId);
      await auth.refresh();
      setPendingPayment(null);
      Alert.alert('Credits added', 'Your credits have been added to your account.');
    } catch (err) {
      Alert.alert('Capture failed', err instanceof Error ? err.message : 'Try again later.');
    } finally {
      setPaymentLoadingId(null);
    }
  }

  return (
    <ScreenWrapper title="Credits">
      <Loadable loading={packs.loading} error={packs.error}>
        {packs.data?.map((pack) => (
          <Card key={pack.id} style={styles.gap}>
            <Text variant="heading">{pack.label}</Text>
            <Text variant="muted">{formatCurrency(pack.priceUsd)}</Text>
            {pack.bonusCredits ? <Badge label={`+${pack.bonusCredits} bonus`} tone="accent" /> : null}
            <Button title="Buy credits" loading={paymentLoadingId === pack.id} onPress={() => void buy(pack)} />
          </Card>
        ))}
      </Loadable>
      <Button title="Payment history" variant="outline" onPress={() => router.push('/payments/history')} />
      <Modal visible={Boolean(pendingPayment)} title="Complete PayPal payment" onClose={() => setPendingPayment(null)} onRequestClose={() => setPendingPayment(null)}>
        <View style={styles.gap}>
          <Text style={styles.bold}>{pendingPayment?.title}</Text>
          <Text variant="muted">After approving the payment in PayPal, return here and confirm so RedLove can capture the order.</Text>
          {pendingPayment?.approvalUrl ? (
            <Button title="Open PayPal again" variant="outline" onPress={() => void openPaymentProvider(pendingPayment.orderId, pendingPayment.approvalUrl)} />
          ) : null}
          <Button title="I approved in PayPal" loading={paymentLoadingId === pendingPayment?.orderId} onPress={() => void capturePendingPayment()} />
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

export function PaymentHistoryScreen() {
  useTheme();
  const resource = useResource<PaymentRecord[]>(premiumService.history);
  return (
    <ScreenWrapper title="Payment history">
      <Loadable loading={resource.loading} error={resource.error}>
        {resource.data && resource.data.length > 0 ? (
          resource.data.map((payment) => (
            <Card key={payment.id} style={styles.gap}>
              <View style={styles.rowBetween}>
                <Text style={styles.bold}>{payment.itemId}</Text>
                <Badge label={payment.status} tone={payment.status === 'completed' ? 'success' : 'default'} />
              </View>
              <Text>{formatCurrency(payment.amount, payment.currency)}</Text>
              <Text variant="muted">{formatDateTime(payment.createdAt)}</Text>
            </Card>
          ))
        ) : (
          <EmptyState title="No payments" />
        )}
      </Loadable>
    </ScreenWrapper>
  );
}

export function GuardianDashboardScreen() {
  useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const auth = useResource(guardianService.auth);
  const stats = useResource(guardianService.stats);

  async function login() {
    try {
      await guardianService.login(username, password);
      await auth.reload();
      await stats.reload();
    } catch (err) {
      Alert.alert('Guardian login failed', err instanceof Error ? err.message : 'Try again.');
    }
  }

  if (auth.loading) return <LoadingSpinner />;
  if (!auth.data?.authenticated) {
    return (
      <ScreenWrapper title="Guardian">
        <Input label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title="Log in" onPress={login} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper title="Guardian">
      <Loadable loading={stats.loading} error={stats.error}>
        {stats.data ? (
          <View style={styles.grid}>
            <Stat title="Users" value={stats.data.totalUsers} />
            <Stat title="Reports" value={stats.data.totalReports} />
            <Stat title="Banned" value={stats.data.bannedUsers} />
            <Stat title="Premium" value={stats.data.premiumUsers} />
          </View>
        ) : null}
      </Loadable>
      <Button title="User management" onPress={() => router.push('/guardian/users')} />
      <Button title="Reports" variant="outline" onPress={() => router.push('/guardian/reports')} />
    </ScreenWrapper>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <Card style={styles.stat}>
      <Text variant="label">{title}</Text>
      <Text variant="heading">{value}</Text>
    </Card>
  );
}

export function GuardianUsersScreen() {
  useTheme();
  const [search, setSearch] = useState('');
  const loadUsers = useCallback(() => guardianService.users(search, 1), [search]);
  const resource = useResource(loadUsers);
  return (
    <ScreenWrapper title="Users">
      <Input label="Search" value={search} onChangeText={setSearch} />
      <Loadable loading={resource.loading} error={resource.error}>
        {resource.data?.users.map((user: GuardianUserSummary) => (
          <Pressable key={user.id} onPress={() => router.push({ pathname: '/guardian/users/[id]', params: { id: String(user.id) } })}>
            <Card style={styles.matchRow}>
              <Avatar uri={user.profilePhotoUrl} name={user.displayName} />
              <View style={styles.matchCopy}>
                <Text style={styles.bold}>{user.displayName}</Text>
                <Text variant="muted">{user.email}</Text>
                <Text variant="small">{user.isPremium ? 'Premium' : 'Free'} - {user.credits} credits</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </Loadable>
    </ScreenWrapper>
  );
}

export function GuardianReportsScreen() {
  useTheme();
  const resource = useResource<GuardianReport[]>(guardianService.reports);

  async function dismiss(reportId: number) {
    await guardianService.deleteReport(reportId);
    await resource.reload();
  }

  async function ban(report: GuardianReport) {
    if (!report.reported) return;
    await guardianService.ban(report.reported.id);
    await resource.reload();
  }

  return (
    <ScreenWrapper title="Reports">
      <Loadable loading={resource.loading} error={resource.error}>
        {resource.data && resource.data.length > 0 ? (
          resource.data.map((report) => (
            <Card key={report.id} style={styles.gap}>
              <Text style={styles.bold}>{report.reason}</Text>
              <Text variant="muted">{report.description ?? 'No description'}</Text>
              <Text variant="small">Reported: {report.reported?.displayName ?? 'Unknown'}</Text>
              <View style={styles.actionRow}>
                <Button title="Dismiss" variant="outline" onPress={() => void dismiss(report.id)} />
                <Button title="Ban user" variant="danger" disabled={!report.reported} onPress={() => void ban(report)} />
              </View>
            </Card>
          ))
        ) : (
          <EmptyState title="No reports" />
        )}
      </Loadable>
    </ScreenWrapper>
  );
}

export function GuardianUserDetailScreen() {
  useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = numericParam(params.id);
  const loadUser = useCallback(() => (id ? guardianService.user(id) : Promise.reject(new Error('Invalid user.'))), [id]);
  const resource = useResource(loadUser);
  const [credits, setCredits] = useState('10');

  async function action(task: () => Promise<unknown>) {
    try {
      await task();
      await resource.reload();
    } catch (err) {
      Alert.alert('Guardian action failed', err instanceof Error ? err.message : 'Try again later.');
    }
  }

  return (
    <ScreenWrapper title="User detail">
      <Loadable loading={resource.loading} error={resource.error}>
        {resource.data && id ? (
          <>
            <Card style={styles.profileHeader}>
              <Avatar uri={resource.data.profilePhotoUrl} name={resource.data.displayName} size={72} />
              <View style={styles.matchCopy}>
                <Text variant="heading">{resource.data.displayName}</Text>
                <Text variant="muted">{resource.data.email}</Text>
                <Text variant="small">{resource.data.credits} credits</Text>
              </View>
            </Card>
            <Field label="Reports" value={resource.data.reportCount} />
            <Field label="Media" value={resource.data.mediaCount} />
            <Field label="Suspended until" value={resource.data.suspendedUntil ? formatDate(resource.data.suspendedUntil) : 'Not suspended'} />
            <View style={styles.actionRow}>
              <Button title="Ban" variant="danger" onPress={() => void action(() => guardianService.ban(id))} />
              <Button title="Unban" variant="outline" onPress={() => void action(() => guardianService.unban(id))} />
            </View>
            <View style={styles.actionRow}>
              <Button title="Grant premium" onPress={() => void action(() => guardianService.grantPremium(id, 1))} />
              <Button title="Revoke premium" variant="outline" onPress={() => void action(() => guardianService.revokePremium(id))} />
            </View>
            <Input label="Credits to add" value={credits} onChangeText={setCredits} keyboardType="number-pad" />
            <Button title="Add credits" onPress={() => void action(() => guardianService.addCredits(id, Number(credits) || 0))} />
          </>
        ) : null}
      </Loadable>
    </ScreenWrapper>
  );
}

export function ContentScreen({ kind }: { kind: 'download' | 'showcase' | 'ad' }) {
  useTheme();
  const copy = {
    download: ['Download', 'Install RedLove on iOS and Android when store builds are available.'],
    showcase: ['Showcase', 'Preview the RedLove mobile experience.'],
    ad: ['Ad template', 'Campaign creative for RedLove.'],
  }[kind];
  return (
    <ScreenWrapper title={copy[0]}>
      <Card style={styles.gap}>
        <Text variant="heading">{copy[0]}</Text>
        <Text variant="muted">{copy[1]}</Text>
      </Card>
      <Button title="Get started" onPress={() => router.push('/landing')} />
    </ScreenWrapper>
  );
}

export function LegalScreen({ kind }: { kind: LegalKind }) {
  useTheme();
  const content = LEGAL_CONTENT[kind];
  return (
    <ScreenWrapper title={content.title} scroll={false} contentStyle={styles.legalScreen}>
      <LegalWebView kind={kind} fullHeight />
    </ScreenWrapper>
  );
}

function createStyles(themeColors: typeof colors) {
  return StyleSheet.create({
  authKeyboard: {
    flex: 1,
  },
  authScroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
    backgroundColor: themeColors.background,
  },
  authContent: {
    width: '100%',
    maxWidth: 390,
    minHeight: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
    gap: 26,
  },
  authBrand: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 0,
    paddingBottom: 4,
  },
  authTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'center',
    columnGap: 7,
    rowGap: 2,
  },
  authTitle: {
    color: themeColors.text,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    textAlign: 'center',
  },
  authTitleAccent: {
    color: themeColors.primary,
  },
  authSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  authSubtitle: {
    color: themeColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  authForm: {
    gap: 12,
  },
  authInputGroup: {
    gap: 7,
  },
  authFieldLabel: {
    color: themeColors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    paddingLeft: 6,
  },
  authField: {
    minHeight: 54,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.borderStrong,
    backgroundColor: themeColors.backgroundElevated,
  },
  authInput: {
    flex: 1,
    minHeight: 52,
    color: themeColors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  authSelectText: {
    flex: 1,
    color: themeColors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  authSelectPlaceholder: {
    color: themeColors.textMuted,
  },
  authConsent: {
    paddingHorizontal: 12,
    paddingTop: 2,
    color: themeColors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    fontWeight: '700',
  },
  authConsentLink: {
    color: themeColors.primary,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '900',
  },
  formError: {
    alignSelf: 'stretch',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: themeColors.danger,
    backgroundColor: themeColors.cardMuted,
    color: themeColors.danger,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  authPrimaryButton: {
    minHeight: 52,
    marginTop: 8,
    borderRadius: 15,
  },
  authLinkRow: {
    alignItems: 'center',
    paddingTop: 2,
  },
  authLink: {
    color: themeColors.primary,
    fontWeight: '900',
  },
  authSwitch: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: 4,
    columnGap: 8,
    paddingTop: 4,
  },
  preferencesScreen: {
    gap: 13,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  preferenceAgeGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  preferenceAgeCard: {
    flex: 1,
    minHeight: 128,
    padding: 13,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.backgroundElevated,
    gap: 5,
  },
  preferenceAgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  preferenceCardLabel: {
    color: themeColors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  preferenceAgeValue: {
    color: themeColors.text,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
    marginTop: 8,
  },
  preferenceAgeValueButton: {
    alignSelf: 'flex-start',
  },
  preferenceAgeUnit: {
    color: themeColors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  preferenceSliderTrack: {
    height: 24,
    justifyContent: 'center',
    marginTop: 10,
  },
  preferenceSliderBase: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: themeColors.cardMuted,
  },
  preferenceSliderFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: themeColors.primary,
  },
  preferenceSliderThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginLeft: -7,
    borderRadius: 7,
    backgroundColor: themeColors.primary,
  },
  preferenceSliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  preferenceSliderLabel: {
    color: themeColors.textSubtle,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
  },
  preferenceAgeSelectorList: {
    maxHeight: 390,
  },
  preferenceAgeSelectorContent: {
    gap: 6,
    paddingBottom: 8,
  },
  preferenceAgeSelectorOption: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.card,
  },
  preferenceAgeSelectorOptionActive: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.cardMuted,
  },
  preferenceAgeSelectorText: {
    color: themeColors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
  },
  preferenceAgeSelectorTextActive: {
    color: themeColors.primary,
  },
  preferenceSummaryCard: {
    minHeight: 72,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.backgroundElevated,
  },
  preferenceSummaryIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(233,30,99,0.1)',
  },
  preferenceSummaryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  preferenceSummaryTitle: {
    color: themeColors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  preferenceSummaryValue: {
    color: themeColors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  preferenceGenderCard: {
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.backgroundElevated,
    gap: 15,
  },
  preferenceGenderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  preferenceGenderCopy: {
    flex: 1,
    gap: 2,
  },
  preferenceGenderTitle: {
    color: themeColors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  preferenceGenderSubtitle: {
    color: themeColors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  preferenceGenderGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  preferenceGenderOption: {
    flex: 1,
    minHeight: 72,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.background,
  },
  preferenceGenderOptionActive: {
    borderColor: themeColors.primary,
    backgroundColor: 'rgba(233,30,99,0.1)',
  },
  preferenceGenderCheck: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: themeColors.primary,
  },
  preferenceGenderOptionText: {
    color: themeColors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  preferenceGenderOptionTextActive: {
    color: themeColors.primary,
  },
  preferencesSaveButton: {
    minHeight: 54,
    borderRadius: radius.md,
    marginTop: 2,
  },
  dropdownList: {
    gap: 10,
  },
  dropdownOption: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.card,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dropdownOptionActive: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.cardMuted,
  },
  dropdownOptionText: {
    color: themeColors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  dropdownOptionTextActive: {
    color: themeColors.primary,
  },
  dropdownSelected: {
    color: themeColors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  countryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  countryList: {
    maxHeight: 430,
  },
  countryListContent: {
    gap: 6,
    paddingBottom: 8,
  },
  countryOption: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.card,
  },
  countryOptionActive: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.cardMuted,
  },
  countryOptionText: {
    flex: 1,
    color: themeColors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  datePickerPanel: {
    gap: 14,
  },
  photoUploadStage: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  photoCircle: {
    width: 188,
    height: 188,
    borderRadius: 94,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.card,
    borderWidth: 2,
    borderColor: themeColors.borderStrong,
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoPlus: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary,
  },
  photoHint: {
    color: themeColors.textMuted,
    fontWeight: '800',
  },
  photoActions: {
    gap: 10,
  },
  mediaPickerPreview: {
    height: 220,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  onboarding: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
    gap: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: themeColors.background,
  },
  onboardingCompact: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  onboardingPhone: {
    width: '100%',
    maxWidth: 390,
    alignSelf: 'center',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 10,
    backgroundColor: themeColors.background,
  },
  onboardingHeader: {
    minHeight: 56,
    justifyContent: 'center',
  },
  onboardingLogo: {
    width: 162,
    height: 54,
  },
  onboardingIconMark: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    backgroundColor: 'rgba(233,30,99,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(233,30,99,0.22)',
  },
  onboardingCopy: {
    width: '100%',
    gap: 5,
    paddingTop: 0,
    paddingBottom: 2,
  },
  onboardingTitle: {
    maxWidth: 320,
    color: themeColors.text,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
  },
  onboardingBody: {
    maxWidth: 300,
    color: themeColors.textMuted,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '700',
  },
  onboardingVisualStage: {
    height: 330,
    marginTop: 4,
    justifyContent: 'center',
  },
  onboardingProfileCard: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.78)',
    backgroundColor: themeColors.card,
  },
  onboardingProfileCardBack: {
    right: 18,
    bottom: 20,
    width: '50%',
    aspectRatio: 0.66,
    transform: [{ rotate: '7deg' }],
    opacity: 0.92,
  },
  onboardingProfileCardFront: {
    left: 0,
    bottom: 0,
    width: '64%',
    aspectRatio: 0.66,
    transform: [{ rotate: '-5deg' }],
  },
  onboardingPhotoHeart: {
    position: 'absolute',
    right: 18,
    bottom: 20,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: themeColors.white,
    ...shadow,
  },
  onboardingFloatingHeart: {
    position: 'absolute',
    right: 8,
    top: 18,
    transform: [{ rotate: '-18deg' }],
  },
  onboardingMatchCard: {
    width: '76%',
    maxWidth: 270,
    minHeight: 250,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 22,
    backgroundColor: themeColors.backgroundElevated,
    borderWidth: 1,
    borderColor: 'rgba(233,30,99,0.42)',
    ...shadow,
  },
  onboardingAvatarPair: {
    width: 224,
    height: 94,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  onboardingMatchAvatar: {
    position: 'absolute',
    width: 94,
    height: 94,
    overflow: 'hidden',
    borderRadius: 47,
    borderWidth: 3,
    borderColor: themeColors.primary,
    backgroundColor: themeColors.cardMuted,
  },
  onboardingMatchAvatarLeft: {
    left: 14,
  },
  onboardingMatchAvatarRight: {
    right: 14,
  },
  onboardingMatchHeart: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: themeColors.primary,
    marginTop: -34,
  },
  onboardingMatchTitle: {
    color: themeColors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  onboardingMatchText: {
    color: themeColors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  onboardingChatCard: {
    width: '82%',
    maxWidth: 292,
    alignSelf: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 22,
    backgroundColor: themeColors.backgroundElevated,
    borderWidth: 1,
    borderColor: themeColors.borderStrong,
    ...shadow,
  },
  onboardingChatRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  onboardingChatRowRight: {
    justifyContent: 'flex-end',
  },
  onboardingChatAvatar: {
    width: 34,
    height: 34,
    overflow: 'hidden',
    borderRadius: 17,
    backgroundColor: themeColors.cardMuted,
  },
  onboardingChatBubble: {
    maxWidth: '72%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
  },
  onboardingChatBubbleLeft: {
    backgroundColor: themeColors.card,
  },
  onboardingChatBubbleRight: {
    backgroundColor: themeColors.primary,
  },
  onboardingChatText: {
    color: themeColors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  onboardingChatTextStrong: {
    color: themeColors.white,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  onboardingChatTime: {
    color: themeColors.textSubtle,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  onboardingChatTimeStrong: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  onboardingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 4,
  },
  onboardingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: themeColors.borderStrong,
  },
  onboardingDotActive: {
    width: 14,
    backgroundColor: themeColors.primary,
  },
  onboardingActionBlock: {
    gap: 8,
    paddingTop: 6,
  },
  onboardingPrimaryButton: {
    minHeight: 48,
    borderRadius: radius.pill,
  },
  centerText: {
    textAlign: 'center',
  },
  legalScreen: {
    paddingBottom: 16,
  },
  legalWebFrame: {
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.card,
  },
  legalWebFrameFull: {
    flex: 1,
  },
  legalWebView: {
    flex: 1,
    backgroundColor: themeColors.white,
  },
  legalWebState: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: themeColors.card,
  },
  legalWebError: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    left: 12,
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: themeColors.backgroundElevated,
    borderWidth: 1,
    borderColor: themeColors.borderStrong,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  list: {
    gap: 0,
  },
  notificationRow: {
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: themeColors.border,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gap: {
    gap: 12,
  },
  section: {
    gap: 10,
  },
  field: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: themeColors.border,
    gap: 4,
  },
  error: {
    color: themeColors.danger,
    fontWeight: '700',
  },
  interestsHero: {
    alignItems: 'center',
    gap: 12,
  },
  interestCountPill: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: themeColors.cardMuted,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  interestCountText: {
    color: themeColors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestChip: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderColor: themeColors.border,
    borderWidth: 1,
    justifyContent: 'center',
    backgroundColor: themeColors.card,
  },
  interestChipActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  interestChipText: {
    color: themeColors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  interestChipTextActive: {
    color: themeColors.white,
  },
  discoverRoot: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  discoverAppHeader: {
    position: 'relative',
    zIndex: 20,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomColor: themeColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: themeColors.background,
  },
  discoverLogoWrap: {
    flexShrink: 1,
  },
  discoverLogo: {
    width: 132,
    height: 36,
  },
  discoverHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  creditPill: {
    minWidth: 38,
    height: 38,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: themeColors.card,
    borderColor: themeColors.border,
    borderWidth: 1,
  },
  creditText: {
    color: themeColors.accent,
    fontWeight: '900',
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: themeColors.card,
    borderColor: themeColors.border,
    borderWidth: 1,
  },
  headerIconCircleActive: {
    backgroundColor: 'rgba(233,30,99,0.1)',
    borderColor: 'rgba(233,30,99,0.5)',
  },
  headerUnreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: themeColors.primary,
  },
  headerUnreadText: {
    color: themeColors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  profileDropdown: {
    position: 'absolute',
    top: 66,
    right: 12,
    width: 278,
    padding: 10,
    gap: 4,
    borderRadius: radius.lg,
    backgroundColor: themeColors.backgroundElevated,
    borderWidth: 1,
    borderColor: themeColors.borderStrong,
    zIndex: 100,
    ...shadow,
  },
  profileDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    paddingBottom: 10,
  },
  profileDropdownName: {
    color: themeColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  profileDropdownEmail: {
    color: themeColors.textMuted,
  },
  profileDropdownItem: {
    minHeight: 42,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.md,
  },
  profileDropdownItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  pressedFade: {
    opacity: 0.68,
  },
  profileDropdownSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: themeColors.border,
    marginVertical: 4,
  },
  discoverScroll: {
    paddingBottom: 118,
  },
  discoverPageHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  discoverPageHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  premiumPill: {
    minHeight: 30,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(233,30,99,0.1)',
  },
  premiumPillText: {
    color: themeColors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  likesLeftPill: {
    minHeight: 30,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  likesLeftText: {
    color: themeColors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  preferencesIconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  preferencesSliders: {
    width: 20,
    gap: 5,
  },
  preferencesSliderTrack: {
    width: 20,
    height: 2,
    borderRadius: radius.pill,
    backgroundColor: themeColors.textMuted,
  },
  preferencesSliderKnob: {
    position: 'absolute',
    left: 4,
    top: -3,
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: themeColors.textMuted,
  },
  preferencesSliderKnobRight: {
    left: 11,
  },
  recommendedSection: {
    gap: 12,
    paddingBottom: 18,
  },
  sectionHeading: {
    paddingHorizontal: 16,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    color: themeColors.text,
  },
  featuredRail: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 2,
  },
  featuredCard: {
    width: 278,
    height: 312,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: themeColors.cardMuted,
    borderWidth: 1,
    borderColor: themeColors.border,
    ...shadow,
  },
  discoverInitial: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.cardMuted,
  },
  discoverInitialText: {
    color: themeColors.textSubtle,
    fontSize: 72,
    fontWeight: '900',
  },
  discoverCardScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  matchBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  matchBadgeText: {
    color: themeColors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  onlineDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: themeColors.white,
  },
  onlineDotActive: {
    backgroundColor: themeColors.success,
  },
  onlineDotInactive: {
    backgroundColor: themeColors.textSubtle,
  },
  featuredCardFooter: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    gap: 7,
    padding: 12,
    paddingTop: 58,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  featuredNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  featuredName: {
    flexShrink: 1,
    color: themeColors.white,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  featuredAge: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontWeight: '700',
  },
  featuredLocation: {
    flex: 1,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sendLikePill: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  sendLikePillLiked: {
    backgroundColor: themeColors.primary,
  },
  sendLikeText: {
    flex: 1,
    color: themeColors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  allSection: {
    gap: 12,
    paddingHorizontal: 16,
  },
  discoverGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: themeColors.cardMuted,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  gridInitialText: {
    color: themeColors.textSubtle,
    fontSize: 34,
    fontWeight: '900',
  },
  gridCardScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  gridOnlineDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: themeColors.white,
  },
  gridLikedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(233,30,99,0.18)',
  },
  gridLikedText: {
    color: themeColors.white,
    fontSize: 28,
    fontWeight: '900',
  },
  gridCardFooter: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 7,
    paddingBottom: 7,
    paddingTop: 26,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  gridName: {
    color: themeColors.white,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  gridMatchText: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
  },
  gridMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  boostBanner: {
    padding: 16,
    gap: 14,
    borderRadius: 18,
    backgroundColor: themeColors.primaryDark,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  boostTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  boostIconCircle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  boostTitle: {
    color: themeColors.white,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  boostSubtitle: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  boostButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  boostButtonText: {
    color: themeColors.white,
    fontWeight: '900',
  },
  moodsButton: {
    position: 'absolute',
    right: 16,
    bottom: 22,
    minHeight: 48,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.pill,
    backgroundColor: themeColors.white,
    ...shadow,
  },
  moodsText: {
    color: themeColors.black,
    fontSize: 14,
    fontWeight: '900',
  },
  moodList: {
    maxHeight: 390,
  },
  moodListContent: {
    gap: 6,
  },
  moodOption: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  moodOptionActive: {
    backgroundColor: 'rgba(233,30,99,0.1)',
    borderColor: 'rgba(233,30,99,0.28)',
  },
  moodText: {
    flex: 1,
    color: themeColors.text,
    fontWeight: '800',
  },
  moodRadio: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: themeColors.textSubtle,
  },
  moodRadioActive: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.primary,
  },
  moodSaveButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: themeColors.white,
  },
  moodSaveText: {
    color: themeColors.black,
    fontWeight: '900',
  },
  matchMakerContent: {
    gap: 14,
  },
  matchMakerScreen: {
    flex: 1,
    gap: 12,
  },
  matchMakerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  matchMakerTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchMakerIconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  matchMakerSliders: {
    width: 22,
    gap: 5,
  },
  matchMakerSliderTrack: {
    width: 22,
    height: 2,
    borderRadius: radius.pill,
    backgroundColor: themeColors.text,
  },
  matchMakerSliderKnob: {
    position: 'absolute',
    left: 4,
    top: -3,
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: themeColors.text,
  },
  matchMakerSliderKnobRight: {
    left: 12,
  },
  swipeDeck: {
    flex: 1,
    minHeight: 320,
    position: 'relative',
  },
  swipeBackCard: {
    position: 'absolute',
    top: 10,
    right: 10,
    bottom: 0,
    left: 10,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: themeColors.cardMuted,
    borderWidth: 1,
    borderColor: themeColors.border,
    transform: [{ scale: 0.96 }, { translateY: 10 }],
  },
  swipeBackPhoto: {
    opacity: 0.48,
  },
  swipeCard: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.borderStrong,
    ...shadow,
  },
  swipeInitial: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.cardMuted,
  },
  swipeInitialText: {
    color: themeColors.textSubtle,
    fontSize: 88,
    fontWeight: '900',
  },
  swipeScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  swipeInfo: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    gap: 9,
    padding: 18,
    paddingTop: 56,
    backgroundColor: 'rgba(0,0,0,0.54)',
  },
  swipeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swipeName: {
    flexShrink: 1,
    color: themeColors.white,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  swipeAge: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
  },
  swipeMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  swipeBio: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 14,
    lineHeight: 20,
  },
  swipeProfileLink: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  swipeProfileLinkText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  swipeStamp: {
    position: 'absolute',
    zIndex: 4,
    borderWidth: 4,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  swipeLikeStamp: {
    top: 32,
    left: 20,
    borderColor: themeColors.success,
    transform: [{ rotate: '-14deg' }],
  },
  swipePassStamp: {
    top: 32,
    right: 20,
    borderColor: themeColors.danger,
    transform: [{ rotate: '14deg' }],
  },
  swipeCrushStamp: {
    bottom: 150,
    alignSelf: 'center',
    borderColor: themeColors.secondary,
  },
  swipeStampText: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: 1,
  },
  swipeLikeText: {
    color: themeColors.success,
  },
  swipePassText: {
    color: themeColors.danger,
  },
  swipeCrushText: {
    color: themeColors.secondary,
  },
  swipeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingTop: 4,
  },
  swipeRoundButton: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    backgroundColor: themeColors.card,
    ...shadow,
  },
  swipePassButton: {
    borderColor: 'rgba(255,77,103,0.45)',
  },
  swipeCrushButton: {
    width: 58,
    height: 58,
    borderColor: 'rgba(123,47,247,0.5)',
  },
  swipeLikeButton: {
    width: 74,
    height: 74,
    borderColor: themeColors.primary,
    backgroundColor: themeColors.primary,
  },
  swipeHint: {
    textAlign: 'center',
    color: themeColors.textSubtle,
  },
  disabledButton: {
    opacity: 0.5,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  matchCopy: {
    flex: 1,
    gap: 4,
  },
  chatRoot: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  incomingCallBanner: {
    position: 'absolute',
    top: 82,
    right: 12,
    left: 12,
    zIndex: 60,
    minHeight: 72,
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
  incomingCallCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  incomingCallTitle: {
    color: themeColors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  incomingCallText: {
    color: themeColors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  callRoundButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  callAcceptButton: {
    backgroundColor: themeColors.success,
  },
  callDeclineButton: {
    backgroundColor: themeColors.danger,
  },
  callOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    backgroundColor: themeColors.black,
  },
  callAudioStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  callAvatarLarge: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 56,
    backgroundColor: 'rgba(233,30,99,0.72)',
  },
  callName: {
    color: themeColors.white,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  callStatus: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  callVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  callLocalVideo: {
    position: 'absolute',
    top: 94,
    right: 16,
    width: 116,
    height: 158,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.86)',
  },
  callControls: {
    position: 'absolute',
    right: 0,
    bottom: 42,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  callControlButton: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  callControlButtonActive: {
    backgroundColor: themeColors.white,
    borderColor: themeColors.white,
  },
  callEndButton: {
    backgroundColor: themeColors.danger,
    borderColor: themeColors.danger,
  },
  chatKeyboard: {
    flex: 1,
  },
  chatHeader: {
    minHeight: 62,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: themeColors.border,
    backgroundColor: themeColors.background,
  },
  chatBackButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  chatHeaderProfile: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  chatHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  chatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chatName: {
    maxWidth: '90%',
    color: themeColors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  chatSubhead: {
    color: themeColors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  chatIconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  chatMessages: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  chatMessagesContent: {
    flexGrow: 1,
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  chatEmpty: {
    flex: 1,
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  chatEmptyText: {
    color: themeColors.textMuted,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  chatBubbleWrap: {
    maxWidth: '78%',
    gap: 3,
  },
  chatBubbleWrapMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  chatBubbleWrapTheir: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  chatBubble: {
    overflow: 'hidden',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chatBubbleMine: {
    borderTopRightRadius: 6,
    backgroundColor: themeColors.primary,
  },
  chatBubbleTheir: {
    borderTopLeftRadius: 6,
    backgroundColor: themeColors.card,
  },
  chatBubbleText: {
    color: themeColors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  chatBubbleTextMine: {
    color: themeColors.white,
  },
  chatBubbleTime: {
    color: themeColors.textSubtle,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    paddingHorizontal: 3,
  },
  chatBubbleTimeMine: {
    textAlign: 'right',
  },
  chatMediaImageWrap: {
    width: 230,
    height: 260,
    overflow: 'hidden',
    borderRadius: radius.lg,
    marginTop: 4,
    backgroundColor: themeColors.cardMuted,
  },
  chatViewOnceBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    minHeight: 26,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  chatViewOnceText: {
    color: themeColors.white,
    fontSize: 11,
    fontWeight: '900',
  },
  chatMediaPlaceholder: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatMediaPlaceholderText: {
    color: themeColors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  chatVoicePlayer: {
    minHeight: 46,
    minWidth: 170,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  chatVoiceIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(233,30,99,0.12)',
  },
  chatVoiceIconMine: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  chatVoiceCopy: {
    flex: 1,
    minWidth: 0,
  },
  chatVoiceDuration: {
    color: themeColors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  chatVoiceDurationMine: {
    color: 'rgba(255,255,255,0.72)',
  },
  chatCallEvent: {
    alignSelf: 'center',
    maxWidth: '92%',
    minHeight: 34,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: themeColors.card,
  },
  chatCallEventText: {
    color: themeColors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  chatCallEventTime: {
    color: themeColors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
  },
  chatViewedOnce: {
    minHeight: 36,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radius.md,
    backgroundColor: themeColors.card,
    opacity: 0.78,
  },
  chatViewedOnceText: {
    color: themeColors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  chatTray: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: themeColors.border,
    backgroundColor: themeColors.background,
  },
  chatTrayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  chatTrayTitle: {
    color: themeColors.textMuted,
    fontSize: 13,
    fontWeight: '900',
  },
  chatViewOnceToggle: {
    minHeight: 34,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: themeColors.card,
  },
  chatViewOnceToggleActive: {
    backgroundColor: themeColors.primary,
  },
  chatViewOnceToggleText: {
    color: themeColors.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  chatViewOnceToggleTextActive: {
    color: themeColors.white,
  },
  chatTrayList: {
    gap: 10,
    paddingRight: 8,
  },
  chatTrayItem: {
    width: 86,
    height: 86,
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: themeColors.cardMuted,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  chatTrayRemove: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  chatFeedbackBanner: {
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 12,
    gap: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(233,30,99,0.28)',
    backgroundColor: 'rgba(233,30,99,0.08)',
  },
  chatFeedbackClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  chatFeedbackTitle: {
    color: themeColors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  chatFeedbackText: {
    color: themeColors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  chatFeedbackActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  chatRatingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  chatRatingButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: themeColors.primary,
  },
  chatRatingText: {
    color: themeColors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  chatFeedbackDone: {
    color: themeColors.primary,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  chatComposer: {
    minHeight: 70,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: themeColors.border,
    backgroundColor: themeColors.background,
  },
  chatComposerIcon: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  chatComposerIconRecording: {
    backgroundColor: themeColors.primary,
  },
  chatGifButton: {
    width: 34,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  chatGifText: {
    color: themeColors.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  chatInput: {
    flex: 1,
    minWidth: 118,
    minHeight: 44,
    maxHeight: 118,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: themeColors.text,
    fontSize: 16,
    lineHeight: 21,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.card,
  },
  chatInputRecording: {
    borderColor: themeColors.primary,
    backgroundColor: 'rgba(233,30,99,0.08)',
  },
  chatSendButton: {
    width: 42,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: themeColors.primary,
  },
  chatLightbox: {
    height: 520,
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: themeColors.black,
  },
  gifPickerList: {
    maxHeight: 360,
  },
  gifPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  gifPickerItem: {
    width: '31%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: themeColors.cardMuted,
  },
  gifPoweredBy: {
    color: themeColors.textSubtle,
    textAlign: 'right',
  },
  likesScreen: {
    paddingHorizontal: 0,
    paddingTop: 26,
    gap: 0,
  },
  likesIntro: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  likesTitle: {
    color: themeColors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  likesSubtitle: {
    maxWidth: 360,
    color: themeColors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  likesTabs: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  likesTab: {
    minHeight: 50,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  likesTabActive: {
    borderBottomColor: themeColors.text,
  },
  likesTabText: {
    color: themeColors.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  likesTabTextActive: {
    color: themeColors.text,
  },
  likesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 112,
  },
  likeCardWrap: {
    width: '48%',
    gap: 8,
  },
  likePhotoCard: {
    width: '100%',
    aspectRatio: 0.75,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: themeColors.cardMuted,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  likeCardScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  likeCrushBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(123,47,247,0.88)',
  },
  likeCrushText: {
    color: themeColors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  likePhotoFooter: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 34,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  likeCardName: {
    color: themeColors.white,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  likeCardMeta: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  likeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  likePassButton: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: themeColors.backgroundElevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  likeBackButton: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: themeColors.backgroundElevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  likeBackButtonActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  likesEmpty: {
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 38,
    gap: 10,
  },
  likesEmptyIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: themeColors.card,
    marginBottom: 10,
  },
  likesEmptyTitle: {
    color: themeColors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  likesEmptyText: {
    maxWidth: 280,
    color: themeColors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  likesLocked: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 112,
    gap: 18,
  },
  likesLockedPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    opacity: 0.44,
  },
  likesLockedTile: {
    width: '48%',
    aspectRatio: 0.75,
    borderRadius: 18,
    backgroundColor: themeColors.cardMuted,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  likesLockedCard: {
    alignItems: 'center',
    gap: 10,
  },
  likesLockedIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: 'rgba(233,30,99,0.12)',
  },
  likesLockedTitle: {
    color: themeColors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  likesLockedText: {
    color: themeColors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  likesBoostCard: {
    width: '48%',
    aspectRatio: 0.75,
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 18,
    backgroundColor: themeColors.backgroundElevated,
  },
  likesBoostCredit: {
    alignSelf: 'flex-end',
    minHeight: 28,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  likesBoostCreditText: {
    color: themeColors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  likesBoostBody: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  likesBoostIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: 'rgba(233,30,99,0.12)',
  },
  likesBoostText: {
    color: themeColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  likesBoostButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: themeColors.text,
  },
  likesBoostButtonText: {
    color: themeColors.background,
    fontSize: 14,
    fontWeight: '900',
  },
  matchesScreen: {
    paddingHorizontal: 0,
    paddingTop: 24,
    gap: 0,
  },
  matchesTopBar: {
    minHeight: 54,
    paddingHorizontal: 18,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: themeColors.border,
  },
  matchesTitle: {
    color: themeColors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  matchesBellButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: themeColors.card,
  },
  matchesStoriesSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  matchesSectionLabel: {
    color: themeColors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  matchesStoryRail: {
    gap: 13,
    paddingRight: 18,
  },
  matchesStoryItem: {
    position: 'relative',
    width: 70,
    alignItems: 'center',
    gap: 7,
  },
  likesStoryCircle: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 31,
    backgroundColor: 'rgba(233,30,99,0.1)',
    borderWidth: 2,
    borderColor: themeColors.primary,
  },
  storyCountBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: themeColors.primary,
  },
  storyCountText: {
    color: themeColors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  storyAvatarRing: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 31,
    borderWidth: 2,
    borderColor: themeColors.border,
    backgroundColor: themeColors.backgroundElevated,
  },
  storyAvatarRingActive: {
    borderColor: themeColors.primary,
    backgroundColor: 'rgba(233,30,99,0.08)',
  },
  storyOnlineDot: {
    position: 'absolute',
    right: 9,
    top: 47,
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: themeColors.background,
  },
  storyNewBadge: {
    position: 'absolute',
    top: -3,
    right: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: themeColors.primary,
  },
  storyNewBadgeText: {
    color: themeColors.white,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
  },
  storyUnreadBadge: {
    position: 'absolute',
    top: -4,
    right: 1,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: themeColors.primary,
  },
  storyUnreadText: {
    color: themeColors.white,
    fontSize: 9,
    fontWeight: '900',
  },
  storyLabel: {
    maxWidth: 68,
    color: themeColors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  storyLabelActive: {
    color: themeColors.text,
    fontWeight: '900',
  },
  matchesStoryEmpty: {
    minHeight: 72,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  matchesStoryEmptyText: {
    color: themeColors.textSubtle,
    fontSize: 13,
    fontWeight: '700',
  },
  matchesDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    backgroundColor: themeColors.border,
  },
  newMatchCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderColor: 'rgba(233,30,99,0.25)',
    backgroundColor: 'rgba(233,30,99,0.1)',
  },
  newMatchAvatarWrap: {
    position: 'relative',
  },
  newMatchSpark: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: themeColors.backgroundElevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  newMatchCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  newMatchNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  newMatchName: {
    maxWidth: '88%',
    color: themeColors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  newMatchMessage: {
    color: themeColors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  newMatchActions: {
    width: 98,
    alignItems: 'stretch',
    gap: 7,
  },
  startChatButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: themeColors.primary,
  },
  startChatText: {
    color: themeColors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  quickHiButton: {
    minHeight: 36,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: themeColors.card,
  },
  quickHiText: {
    color: themeColors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  messagesHeader: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sortButton: {
    minHeight: 30,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: themeColors.card,
  },
  sortText: {
    color: themeColors.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  conversationRow: {
    minHeight: 78,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  conversationAvatarWrap: {
    position: 'relative',
  },
  conversationOnlineDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: themeColors.background,
  },
  conversationCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  conversationName: {
    flex: 1,
    color: themeColors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  conversationNameUnread: {
    fontWeight: '900',
  },
  conversationMessage: {
    color: themeColors.textMuted,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  conversationMessageUnread: {
    color: themeColors.text,
    fontWeight: '800',
  },
  conversationTime: {
    color: themeColors.textSubtle,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  matchesEmpty: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 38,
    gap: 10,
  },
  settingsContent: {
    gap: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  settingsProfile: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingsProfileCopy: {
    width: '100%',
    alignItems: 'center',
    gap: 5,
  },
  settingsProfileName: {
    maxWidth: '86%',
    color: themeColors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  settingsProfileEmail: {
    maxWidth: '86%',
    color: themeColors.textMuted,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  settingsProfileBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 2,
  },
  settingsStatusBadge: {
    minHeight: 26,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: themeColors.cardMuted,
  },
  settingsPremiumBadge: {
    backgroundColor: 'rgba(233,30,99,0.1)',
  },
  settingsStatusDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  settingsStatusDotOnline: {
    backgroundColor: themeColors.success,
  },
  settingsStatusDotOffline: {
    backgroundColor: themeColors.textSubtle,
  },
  settingsStatusText: {
    color: themeColors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  settingsSection: {
    gap: 6,
  },
  settingsSectionTitle: {
    paddingHorizontal: 2,
    color: themeColors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  settingsGroup: {
    overflow: 'hidden',
  },
  settingsRow: {
    minHeight: 58,
    paddingHorizontal: 0,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: themeColors.border,
  },
  settingsRowDisabled: {
    opacity: 0.62,
  },
  settingsRowIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowIconDanger: {
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,77,103,0.08)',
  },
  settingsRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  settingsRowLabel: {
    color: themeColors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  settingsRowLabelDanger: {
    color: themeColors.danger,
  },
  settingsRowValue: {
    color: themeColors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  settingsConnectedText: {
    color: themeColors.success,
    fontSize: 12,
    fontWeight: '900',
  },
  settingsSwitch: {
    minWidth: 86,
    minHeight: 36,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: themeColors.cardMuted,
    borderWidth: 1,
    borderColor: themeColors.borderStrong,
  },
  settingsSwitchPrimary: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  settingsSwitchSuccess: {
    backgroundColor: themeColors.success,
    borderColor: themeColors.success,
  },
  settingsSwitchDanger: {
    backgroundColor: themeColors.danger,
    borderColor: themeColors.danger,
  },
  settingsSwitchLoading: {
    opacity: 0.72,
  },
  settingsSwitchText: {
    color: themeColors.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  settingsSwitchTextActive: {
    color: themeColors.white,
  },
  themeOptions: {
    gap: 10,
  },
  themeOption: {
    minHeight: 72,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.card,
  },
  themeOptionActive: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.backgroundElevated,
  },
  themeSwatch: {
    width: 42,
    height: 42,
    padding: 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeSwatchInner: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: themeColors.borderStrong,
  },
  themeOptionCopy: {
    flex: 1,
    gap: 3,
  },
  themeOptionTitle: {
    color: themeColors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  themeOptionDescription: {
    color: themeColors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  bold: {
    fontWeight: '900',
  },
  subtle: {
    color: themeColors.textSubtle,
  },
  messages: {
    gap: 10,
  },
  mediaTile: {
    width: '48%',
    gap: 6,
  },
  thread: {
    gap: 10,
    paddingBottom: 8,
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: radius.lg,
    padding: 12,
    gap: 6,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: themeColors.primary,
  },
  theirBubble: {
    alignSelf: 'flex-start',
    backgroundColor: themeColors.card,
  },
  myBubbleText: {
    color: themeColors.white,
  },
  myTime: {
    color: 'rgba(255,255,255,0.72)',
  },
  theirTime: {
    color: themeColors.textSubtle,
  },
  profilePreviewRoot: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  profilePreviewScroll: {
    padding: 16,
    paddingBottom: 30,
  },
  profilePreviewHero: {
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: themeColors.borderStrong,
    backgroundColor: themeColors.cardMuted,
  },
  profilePreviewInitial: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.cardMuted,
  },
  profilePreviewInitialText: {
    color: themeColors.textSubtle,
    fontSize: 110,
    fontWeight: '900',
  },
  profilePreviewScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  profilePreviewPhotoDots: {
    position: 'absolute',
    top: 12,
    right: 92,
    left: 92,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  profilePreviewPhotoDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  profilePreviewPhotoDotActive: {
    width: 20,
    backgroundColor: themeColors.white,
  },
  profilePreviewTopInfo: {
    position: 'absolute',
    top: 16,
    left: 14,
    right: 106,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  profilePreviewOnlineDot: {
    width: 11,
    height: 11,
    marginTop: 9,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: themeColors.white,
  },
  profilePreviewNameBlock: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  profilePreviewName: {
    color: themeColors.white,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.42)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  profilePreviewBadge: {
    alignSelf: 'flex-start',
    minHeight: 23,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  profilePreviewBadgeText: {
    color: themeColors.black,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  profilePreviewTopActions: {
    position: 'absolute',
    top: 16,
    right: 14,
    flexDirection: 'row',
    gap: 8,
  },
  profilePreviewCircle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  profilePreviewActionRow: {
    position: 'absolute',
    right: 0,
    bottom: 16,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  profilePreviewSmallAction: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  profilePreviewLikeAction: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: themeColors.white,
    ...shadow,
  },
  profilePreviewPanel: {
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: themeColors.border,
    backgroundColor: themeColors.backgroundElevated,
  },
  profilePreviewIntentRow: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: themeColors.border,
  },
  profilePreviewIntentText: {
    color: themeColors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  profilePreviewMessagePill: {
    minHeight: 58,
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 12,
    paddingLeft: 17,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.pill,
    backgroundColor: themeColors.card,
  },
  profilePreviewMessagePlaceholder: {
    flex: 1,
    color: themeColors.textSubtle,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  profilePreviewSendButton: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: themeColors.primary,
  },
  profilePreviewSection: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  profilePreviewSectionTitle: {
    color: themeColors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  profilePreviewBody: {
    color: themeColors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  profilePreviewFactGrid: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  price: {
    fontWeight: '900',
    color: themeColors.accent,
  },
  stat: {
    width: '47%',
    gap: 6,
  },
  flex: {
    flex: 1,
  },
  });
}

let styles = createStyles(colors);
registerThemeStyleSheet((themeColors) => {
  styles = createStyles(themeColors);
});
