import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

export type IconName =
  | 'about'
  | 'bell'
  | 'bolt'
  | 'camera'
  | 'calendar'
  | 'check'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'clock'
  | 'close'
  | 'compass'
  | 'crown'
  | 'delete'
  | 'file'
  | 'gift'
  | 'gender'
  | 'globe'
  | 'heart'
  | 'image-plus'
  | 'location'
  | 'lock'
  | 'logout'
  | 'mail'
  | 'mars'
  | 'matches'
  | 'mic'
  | 'more-horizontal'
  | 'payments'
  | 'paypal'
  | 'pause'
  | 'phone'
  | 'phone-call'
  | 'photo'
  | 'profile'
  | 'nonbinary'
  | 'send'
  | 'settings'
  | 'shield'
  | 'sliders'
  | 'smile'
  | 'spark'
  | 'stop'
  | 'theme'
  | 'transgender'
  | 'up'
  | 'video'
  | 'volume'
  | 'venus'
  | 'eye'
  | 'eye-off';

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  strokeWidth?: number;
};

type IconRenderer = (color: string) => ReactNode;

const USER_ROUND_ICON = () => (
  <>
    <Circle cx={12} cy={8} r={4} />
    <Path d="M20 21a8 8 0 0 0-16 0" />
  </>
);

const ZAP_ICON = () => <Path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />;

const ICONS: Record<IconName, IconRenderer> = {
  about: (color) => (
    <>
      <Circle cx={12} cy={12} r={10} />
      <Line x1={12} y1={16} x2={12} y2={12} />
      <Circle cx={12} cy={8} r={0.75} fill={color} stroke="none" />
    </>
  ),
  bell: () => (
    <>
      <Path d="M10.27 21a2 2 0 0 0 3.46 0" />
      <Path d="M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.92 18 12.5 18 8a6 6 0 0 0-12 0c0 4.5-1.41 5.92-2.74 7.33Z" />
    </>
  ),
  bolt: ZAP_ICON,
  camera: () => (
    <>
      <Path d="M14.5 4 16 7h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4l1.5-3h5Z" />
      <Circle cx={12} cy={13} r={3.5} />
    </>
  ),
  calendar: () => (
    <>
      <Rect x={3} y={4} width={18} height={18} rx={2} />
      <Path d="M16 2v4" />
      <Path d="M8 2v4" />
      <Path d="M3 10h18" />
    </>
  ),
  check: () => <Path d="m20 6-11 11-5-5" />,
  'chevron-down': () => <Path d="m6 9 6 6 6-6" />,
  'chevron-left': () => <Path d="m15 18-6-6 6-6" />,
  'chevron-right': () => <Path d="m9 18 6-6-6-6" />,
  clock: () => (
    <>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 6v6l4 2" />
    </>
  ),
  close: () => (
    <>
      <Line x1={18} y1={6} x2={6} y2={18} />
      <Line x1={6} y1={6} x2={18} y2={18} />
    </>
  ),
  compass: () => (
    <>
      <Circle cx={12} cy={12} r={10} />
      <Path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12Z" />
    </>
  ),
  crown: () => (
    <>
      <Path d="M2 6 7 18h10l5-12-6 5-4-7-4 7-6-5Z" />
      <Path d="M7 22h10" />
    </>
  ),
  delete: () => (
    <>
      <Path d="M3 6h18" />
      <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <Path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <Line x1={10} y1={11} x2={10} y2={17} />
      <Line x1={14} y1={11} x2={14} y2={17} />
    </>
  ),
  file: () => (
    <>
      <Path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-5-5Z" />
      <Path d="M14 2v6h6" />
      <Line x1={8} y1={13} x2={16} y2={13} />
      <Line x1={8} y1={17} x2={14} y2={17} />
    </>
  ),
  gift: () => (
    <>
      <Rect x={3} y={8} width={18} height={4} rx={1} />
      <Path d="M12 8v14" />
      <Path d="M19 12v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8" />
      <Path d="M7.5 8A2.5 2.5 0 1 1 12 6a2.5 2.5 0 1 1 4.5 2" />
    </>
  ),
  gender: () => (
    <>
      <Circle cx={10} cy={14} r={5} />
      <Path d="M14 10 20 4" />
      <Path d="M16 4h4v4" />
      <Path d="M10 19v3" />
      <Path d="M7 22h6" />
    </>
  ),
  globe: () => (
    <>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M2 12h20" />
      <Path d="M12 2a15.3 15.3 0 0 1 0 20" />
      <Path d="M12 2a15.3 15.3 0 0 0 0 20" />
    </>
  ),
  heart: () => <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />,
  'image-plus': () => (
    <>
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Circle cx={8.5} cy={10} r={1.5} />
      <Path d="m21 15-5-5L5 21" />
      <Line x1={17} y1={7} x2={17} y2={13} />
      <Line x1={14} y1={10} x2={20} y2={10} />
    </>
  ),
  location: () => (
    <>
      <Path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <Circle cx={12} cy={10} r={3} />
    </>
  ),
  lock: () => (
    <>
      <Rect x={4} y={11} width={16} height={10} rx={2} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  logout: () => (
    <>
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Polyline points="16 17 21 12 16 7" />
      <Line x1={21} y1={12} x2={9} y2={12} />
    </>
  ),
  mail: () => (
    <>
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Path d="m3 7 9 6 9-6" />
    </>
  ),
  mars: () => (
    <>
      <Circle cx={10} cy={14} r={5} />
      <Path d="M14 10 20 4" />
      <Path d="M16 4h4v4" />
    </>
  ),
  matches: () => (
    <>
      <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9H13a8.48 8.48 0 0 1 8 8v.5Z" />
    </>
  ),
  mic: () => (
    <>
      <Path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <Line x1={12} y1={19} x2={12} y2={22} />
      <Line x1={8} y1={22} x2={16} y2={22} />
    </>
  ),
  'more-horizontal': (color) => (
    <>
      <Circle cx={5} cy={12} r={1.2} fill={color} stroke="none" />
      <Circle cx={12} cy={12} r={1.2} fill={color} stroke="none" />
      <Circle cx={19} cy={12} r={1.2} fill={color} stroke="none" />
    </>
  ),
  payments: () => (
    <>
      <Rect x={2} y={5} width={20} height={14} rx={2} />
      <Line x1={2} y1={10} x2={22} y2={10} />
      <Line x1={6} y1={15} x2={10} y2={15} />
    </>
  ),
  paypal: () => (
    <>
      <Circle cx={12} cy={12} r={10} />
      <Line x1={12} y1={6} x2={12} y2={18} />
      <Path d="M16 9.5C16 8.12 14.21 7 12 7S8 8.12 8 9.5s1.79 2.5 4 2.5 4 1.12 4 2.5S14.21 17 12 17s-4-1.12-4-2.5" />
    </>
  ),
  pause: () => (
    <>
      <Circle cx={12} cy={12} r={10} />
      <Line x1={10} y1={8} x2={10} y2={16} />
      <Line x1={14} y1={8} x2={14} y2={16} />
    </>
  ),
  phone: () => (
    <>
      <Rect x={7} y={2} width={10} height={20} rx={2} />
      <Line x1={11} y1={18} x2={13} y2={18} />
    </>
  ),
  'phone-call': () => (
    <>
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.91.33 1.8.62 2.65a2 2 0 0 1-.45 2.11L8 9.71a16 16 0 0 0 6.29 6.29l1.23-1.23a2 2 0 0 1 2.11-.45c.85.29 1.74.5 2.65.62A2 2 0 0 1 22 16.92Z" />
      <Path d="M14 2a8 8 0 0 1 8 8" />
      <Path d="M14 6a4 4 0 0 1 4 4" />
    </>
  ),
  photo: () => (
    <>
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Circle cx={8.5} cy={10} r={1.5} />
      <Path d="m21 15-5-5L5 21" />
    </>
  ),
  profile: USER_ROUND_ICON,
  nonbinary: () => (
    <>
      <Circle cx={12} cy={10} r={5} />
      <Path d="M12 15v7" />
      <Path d="M9 19h6" />
      <Path d="M12 5V2" />
      <Path d="M9 2h6" />
    </>
  ),
  send: () => (
    <>
      <Path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <Path d="M22 2 11 13" />
    </>
  ),
  settings: () => (
    <>
      <Circle cx={12} cy={12} r={10} />
      {USER_ROUND_ICON()}
    </>
  ),
  shield: () => <Path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z" />,
  sliders: () => (
    <>
      <Line x1={4} y1={21} x2={4} y2={14} />
      <Line x1={4} y1={10} x2={4} y2={3} />
      <Line x1={12} y1={21} x2={12} y2={12} />
      <Line x1={12} y1={8} x2={12} y2={3} />
      <Line x1={20} y1={21} x2={20} y2={16} />
      <Line x1={20} y1={12} x2={20} y2={3} />
      <Line x1={2} y1={14} x2={6} y2={14} />
      <Line x1={10} y1={8} x2={14} y2={8} />
      <Line x1={18} y1={16} x2={22} y2={16} />
    </>
  ),
  smile: (color) => (
    <>
      <Circle cx={12} cy={12} r={10} />
      <Circle cx={9} cy={10} r={0.7} fill={color} stroke="none" />
      <Circle cx={15} cy={10} r={0.7} fill={color} stroke="none" />
      <Path d="M8 14s1.5 2 4 2 4-2 4-2" />
    </>
  ),
  spark: () => (
    <>
      <Path d="M12 3 14.7 9.3 21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3Z" />
      <Path d="M5 3v4" />
      <Path d="M3 5h4" />
      <Path d="M19 17v4" />
      <Path d="M17 19h4" />
    </>
  ),
  stop: () => <Rect x={6} y={6} width={12} height={12} rx={2} />,
  theme: (color) => (
    <>
      <Path d="M12 22a10 10 0 1 1 10-10 3.5 3.5 0 0 1-3.5 3.5h-1.2a1.8 1.8 0 0 0-1.6 2.6l.3.6A2.2 2.2 0 0 1 14 22h-2Z" />
      <Circle cx={7.5} cy={10} r={0.85} fill={color} stroke="none" />
      <Circle cx={10.5} cy={6.8} r={0.85} fill={color} stroke="none" />
      <Circle cx={15.5} cy={7.4} r={0.85} fill={color} stroke="none" />
      <Circle cx={17.5} cy={11.2} r={0.85} fill={color} stroke="none" />
    </>
  ),
  transgender: () => (
    <>
      <Circle cx={10} cy={14} r={4.5} />
      <Path d="M13.2 10.8 20 4" />
      <Path d="M16 4h4v4" />
      <Path d="M10 18.5V22" />
      <Path d="M7.5 22h5" />
      <Path d="M6.8 10.8 4 8" />
      <Path d="M4 8h4" />
      <Path d="M4 8v4" />
    </>
  ),
  up: ZAP_ICON,
  video: () => (
    <>
      <Rect x={3} y={6} width={13} height={12} rx={2} />
      <Path d="m16 10 5-3v10l-5-3v-4Z" />
    </>
  ),
  volume: () => (
    <>
      <Path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <Path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <Path d="M19 5a10 10 0 0 1 0 14" />
    </>
  ),
  venus: () => (
    <>
      <Circle cx={12} cy={9} r={5} />
      <Path d="M12 14v8" />
      <Path d="M8 18h8" />
    </>
  ),
  eye: () => (
    <>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <Circle cx={12} cy={12} r={3} />
    </>
  ),
  'eye-off': () => (
    <>
      <Path d="M3 3l18 18" />
      <Path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
      <Path d="M9.88 4.24A10.55 10.55 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-3.04 4.34" />
      <Path d="M6.61 6.61C3.78 8.53 2 12 2 12s3.5 8 10 8a10.9 10.9 0 0 0 5.39-1.39" />
    </>
  ),
};

export function Icon({ name, size = 24, color, strokeWidth = 2.35, style }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.text;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={resolvedColor}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      style={style}
    >
      {ICONS[name](resolvedColor)}
    </Svg>
  );
}
