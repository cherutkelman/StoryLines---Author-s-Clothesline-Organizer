import type { SceneVersion, SceneVersionReason } from '../../types';

export const getVersionReasonLabel = (reason: SceneVersionReason): string => {
  const labels: Record<SceneVersionReason, string> = {
    typing_pause: 'הפסקה בכתיבה',
    scene_change: 'מעבר לסצנה אחרת',
    page_navigation: 'מעבר למסך אחר',
    before_delete: 'לפני מחיקה',
    manual: 'שמירה ידנית',
    restore: 'לפני שחזור',
  };
  return labels[reason];
};

export const getVersionTypeLabel = (version: SceneVersion): string => {
  if (version.versionType === 'manual') return 'ידנית';
  if (version.versionType === 'before_delete') return 'לפני מחיקה';
  if (version.versionType === 'restored') return 'שוחזרה';
  return 'אוטומטית';
};

export const formatVersionDate = (createdAt: number) => new Date(createdAt).toLocaleDateString('he-IL');
export const formatVersionTime = (createdAt: number) => new Date(createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

