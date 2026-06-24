import { useCallback, useState } from 'react';

export type ToastState = {
  message: string;
  tone: 'success' | 'error' | 'info';
} | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);

  const show = useCallback((message: string, tone: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return { toast, show, dismiss: () => setToast(null) };
}
