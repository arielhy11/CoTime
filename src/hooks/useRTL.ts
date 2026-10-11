import { useTranslation } from 'react-i18next';

/** Reactive RTL flag for copy alignment and directional icons. */
export function useRTL(): boolean {
  const { i18n } = useTranslation();
  return i18n.language === 'he';
}
