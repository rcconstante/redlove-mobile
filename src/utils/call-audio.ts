import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const CALL_RINGTONE = require('../../assets/audio/You_have_a_call_from_a_Red_Love_user_1779784503549.mp3') as number;

export type CallRingtoneRef = { current: AudioPlayer | null };

export function startCallRingtone(playerRef: CallRingtoneRef) {
  stopCallRingtone(playerRef);
  try {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldPlayInBackground: false,
      allowsRecording: false,
    }).catch(() => undefined);
    const player = createAudioPlayer(CALL_RINGTONE, {
      downloadFirst: true,
      keepAudioSessionActive: true,
      updateInterval: 1000,
    });
    player.loop = true;
    player.volume = 1;
    playerRef.current = player;
    player.play();
  } catch {
    // Calls must continue even if audio playback is unavailable.
  }
}

export function stopCallRingtone(playerRef: CallRingtoneRef) {
  const player = playerRef.current;
  if (!player) return;
  playerRef.current = null;
  try {
    player.pause();
    player.remove();
  } catch {
    // Ignore cleanup failures from an already released player.
  }
}
