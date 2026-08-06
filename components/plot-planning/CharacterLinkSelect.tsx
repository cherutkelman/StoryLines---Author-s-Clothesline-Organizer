import React from 'react';
import type { CharacterEntry } from '../../types';
import { resolveCharacterLink, type CharacterLinkedRow } from './characterLinkedRow';

interface CharacterLinkSelectProps {
  row: CharacterLinkedRow;
  characters: CharacterEntry[];
  onChange: (characterId: string | undefined) => void;
  ariaLabel?: string;
}

const CharacterLinkSelect: React.FC<CharacterLinkSelectProps> = ({
  row,
  characters,
  onChange,
  ariaLabel = 'בחירת דמות',
}) => {
  const resolution = resolveCharacterLink(row, characters);
  const value = resolution.status === 'linked' || resolution.status === 'legacy_match'
    ? resolution.characterId
    : resolution.status === 'deleted'
      ? resolution.characterId
      : resolution.status === 'legacy_unmatched'
        ? '__legacy_unmatched__'
        : '';

  return (
    <select
      dir="rtl"
      value={value}
      onChange={event => onChange(event.target.value && event.target.value !== '__legacy_unmatched__' ? event.target.value : undefined)}
      aria-label={ariaLabel}
      className="w-full rounded-xl border border-[var(--theme-border)]/30 bg-white/70 px-3 py-2 text-sm font-bold text-[var(--theme-primary)] outline-none focus:ring-1 focus:ring-[var(--theme-accent)]/30"
    >
      <option value="">ללא דמות משויכת</option>
      {resolution.status === 'deleted' && (
        <option value={resolution.characterId}>דמות שנמחקה</option>
      )}
      {resolution.status === 'legacy_unmatched' && (
        <option value="__legacy_unmatched__">שם ישן: {resolution.legacyName} — לא משויך</option>
      )}
      {characters.map(character => (
        <option key={character.id} value={character.id}>{character.name}</option>
      ))}
    </select>
  );
};

export default CharacterLinkSelect;
