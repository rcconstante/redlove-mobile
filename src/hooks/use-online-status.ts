import { useCallback } from 'react';

import { usersService } from '@/services/users.service';

export function useOnlineStatus() {
  const setOnline = useCallback((isOnline: boolean) => usersService.setOnlineStatus(isOnline), []);
  const setPaused = useCallback((isPaused: boolean) => usersService.setPauseStatus(isPaused), []);
  return { setOnline, setPaused };
}
