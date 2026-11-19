import React, { useLayoutEffect, useRef, useState } from 'react';
import { User } from 'lucide-react';
import type { CharacterMapConnection, QuestionnaireEntry } from '../../types';
import { canConnectCharacters, createCharacterMapConnection } from '../../src/characters/characterMapConnections';
import { getCharacterMapRootFontSize } from '../../src/characters/characterMapPlacement';
import { readCharacterMapImage } from '../../src/characters/characterMapImage';
import { isElectron } from '../../src/platform';

interface CharacterGuideProps {
  characters: QuestionnaireEntry[];
  bookCharacters: QuestionnaireEntry[];
  connections: CharacterMapConnection[];
  onShowMap: () => void;
  onEditCharacter: (id: string, updates: Partial<QuestionnaireEntry>) => void;
  onAddNewCharacter: (rootFontSize?: number) => string;
  onAddExistingCharacters: (ids: string[], rootFontSize?: number) => void;
  onRemoveCharacter: (id: string) => void;
  onUpdateConnections: (connections: CharacterMapConnection[]) => void;
}

const button = 'min-h-11 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-3 py-2 text-[var(--theme-text)] disabled:opacity-50';
const field = 'min-h-11 w-full min-w-0 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-base';
const panel = 'min-w-0 space-y-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-3';

function CharacterPortrait({ character, large = false }: { character: QuestionnaireEntry; large?: boolean }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--theme-secondary)] ${large ? 'h-24 w-24' : 'h-12 w-12'}`}>
      {character.imageUrl
        ? <img src={character.imageUrl} alt={large ? character.name : ''} className="h-full w-full object-cover" />
        : <User size={large ? 40 : 24} aria-hidden="true" />}
    </span>
  );
}

export default function CharacterGuide({
  characters, bookCharacters, connections, onShowMap, onEditCharacter, onAddNewCharacter,
  onAddExistingCharacters, onRemoveCharacter, onUpdateConnections,
}: CharacterGuideProps) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const [addingExisting, setAddingExisting] = useState(false);
  const [existingId, setExistingId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<{ id: string; message: string }>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageEditRef = useRef<typeof onEditCharacter | null>(null);
  useLayoutEffect(() => {
    imageEditRef.current = onEditCharacter;
    return () => { imageEditRef.current = null; };
  }, [onEditCharacter]);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    const viewport = window.visualViewport;
    if (!container || !viewport) return;
    const resize = () => {
      const bottom = viewport.offsetTop + viewport.height;
      container.style.maxHeight = `${Math.max(0, bottom - container.getBoundingClientRect().top)}px`;
    };
    resize();
    viewport.addEventListener('resize', resize);
    viewport.addEventListener('scroll', resize);
    return () => {
      viewport.removeEventListener('resize', resize);
      viewport.removeEventListener('scroll', resize);
    };
  }, []);

  const byId = new Map(characters.map(character => [character.id, character]));
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const linksById = new Map<string, CharacterMapConnection[]>();
  for (const link of connections) {
    for (const id of new Set([link.fromId, link.toId])) {
      const links = linksById.get(id) ?? [];
      links.push(link);
      linksById.set(id, links);
    }
  }
  const available = bookCharacters.filter(character => !byId.has(character.id));
  const search = query.trim().toLocaleLowerCase();
  const matches = characters.filter(character => character.name.toLocaleLowerCase().includes(search));
  const targets = selected ? characters.filter(character => canConnectCharacters(
    linksById.get(selected.id) ?? [], selected.id, character.id,
  )) : [];
  const openCharacter = (id?: string) => {
    setSelectedId(id);
    setTargetId('');
    setImageError(undefined);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };
  const readImage = async (id: string, input?: HTMLInputElement) => {
    setUploading(true);
    setImageError(undefined);
    try {
      const imageUrl = await readCharacterMapImage(input);
      if (imageUrl) imageEditRef.current?.(id, { imageUrl });
    } catch {
      if (imageEditRef.current) setImageError({ id, message: 'טעינת התמונה נכשלה. אפשר לנסות שוב.' });
    } finally {
      if (imageEditRef.current) setUploading(false);
    }
  };

  return (
    <div ref={scrollRef} data-character-guide dir="rtl"
      className="min-h-0 flex-1 overflow-y-auto bg-[var(--theme-bg)] p-3 pb-6 text-[var(--theme-text)]">
      {selected ? (
        <div className="space-y-4">
          <button type="button" className={button} onClick={() => openCharacter()}>חזרה למדריך</button>
          <section className={panel}>
            <h2 className="break-words text-xl font-bold">{selected.name}</h2>
            <CharacterPortrait character={selected} large />
            <div className="flex flex-wrap gap-2">
              <input key={selected.id} ref={imageInputRef} type="file" accept="image/*" hidden
                onChange={event => void readImage(selected.id, event.currentTarget)} />
              <button type="button" className={button} disabled={uploading}
                onClick={() => isElectron ? void readImage(selected.id) : imageInputRef.current?.click()}>
                {selected.imageUrl ? 'החלפת תמונה' : 'הוספת תמונה'}
              </button>
              {selected.imageUrl && (
                <button type="button" className={button} disabled={uploading}
                  onClick={() => onEditCharacter(selected.id, { imageUrl: undefined })}>הסרת תמונה</button>
              )}
            </div>
            {uploading && <p role="status">התמונה נטענת…</p>}
            {imageError?.id === selected.id && <p role="alert">{imageError.message}</p>}
            <form key={JSON.stringify([selected.id, selected.name])} className="space-y-2" onSubmit={event => {
              event.preventDefault();
              const name = String(new FormData(event.currentTarget).get('name') ?? '').trim();
              if (name && name !== selected.name) onEditCharacter(selected.id, { name });
            }}>
              <label className="block">שם הדמות
                <input name="name" required defaultValue={selected.name} className={field} />
              </label>
              <button className={button}>שמירת שם</button>
            </form>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold">קשרים במפה</h3>
            {(linksById.get(selected.id) ?? []).map(link => (
              <form key={JSON.stringify([selected.id, link.id, link.description])} className={panel} onSubmit={event => {
                event.preventDefault();
                const description = String(new FormData(event.currentTarget).get('description') ?? '');
                if (description !== link.description) onUpdateConnections(connections.map(item =>
                  item.id === link.id ? { ...item, description } : item,
                ));
              }}>
                <h4 className="break-words font-bold">{byId.get(link.fromId === selected.id ? link.toId : link.fromId)?.name ?? 'דמות שאינה זמינה'}</h4>
                <label className="block">תיאור הקשר
                  <textarea name="description" defaultValue={link.description} rows={3} className={field} />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button className={button}>שמירת תיאור</button>
                  <button type="button" className={button} onClick={() => {
                    if (window.confirm('למחוק את הקשר הזה?')) onUpdateConnections(connections.filter(item => item.id !== link.id));
                  }}>מחיקת קשר</button>
                </div>
              </form>
            ))}
            {!linksById.get(selected.id)?.length && <p>אין לדמות קשרים במפה הזאת.</p>}
            <form className={panel} onSubmit={event => {
              event.preventDefault();
              if (!targets.some(character => character.id === targetId)) return;
              onUpdateConnections([...connections, createCharacterMapConnection(selected.id, targetId)]);
              setTargetId('');
            }}>
              <label className="block">דמות לקשר חדש
                <select value={targetId} onChange={event => setTargetId(event.target.value)} className={field}>
                  <option value="">בחירת דמות</option>
                  {targets.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
                </select>
              </label>
              <button className={button} disabled={!targetId}>יצירת קשר</button>
              {!targets.length && <p>אין דמויות זמינות לקשר חדש.</p>}
            </form>
          </section>
          <button type="button" className={button} onClick={() => {
            if (!window.confirm('להסיר את הדמות ואת קשריה מהמפה הזאת? הדמות תישאר בספר.')) return;
            onRemoveCharacter(selected.id);
            openCharacter();
          }}>הסרת דמות מהמפה</button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">מדריך דמויות וקשרים</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} onClick={onShowMap}>הצג מפה</button>
            <button type="button" className={button}
              onClick={() => openCharacter(onAddNewCharacter(getCharacterMapRootFontSize(scrollRef.current)))}>דמות חדשה</button>
            <button type="button" className={button} aria-expanded={addingExisting}
              onClick={() => setAddingExisting(open => !open)}>הוספת דמות קיימת</button>
          </div>
          {addingExisting && (
            <form className={panel} onSubmit={event => {
              event.preventDefault();
              if (!available.some(character => character.id === existingId)) return;
              onAddExistingCharacters([existingId], getCharacterMapRootFontSize(scrollRef.current));
              setExistingId('');
              setAddingExisting(false);
            }}>
              <label className="block">דמות מהספר
                <select value={existingId} onChange={event => setExistingId(event.target.value)} className={field}>
                  <option value="">בחירת דמות</option>
                  {available.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
                </select>
              </label>
              <button className={button} disabled={!existingId}>הוספה למפה</button>
              {!available.length && <p>אין דמויות נוספות בספר שאפשר להוסיף למפה.</p>}
            </form>
          )}
          <label className="block">חיפוש לפי שם
            <input type="search" className={field} value={query} onChange={event => setQuery(event.target.value)} />
          </label>
          <ul className="space-y-2">
            {matches.map(character => (
                <li key={character.id}>
                  <button type="button" className={`${button} flex w-full items-center gap-3 text-start`}
                    onClick={() => openCharacter(character.id)}>
                    <CharacterPortrait character={character} />
                    <span className="min-w-0 break-words">
                      <span className="block font-bold">{character.name}</span>
                      <span className="block text-sm">{linksById.get(character.id)?.length ?? 0} קשרים</span>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
          {!characters.length && <p>אין עדיין דמויות במפה הזאת.</p>}
          {characters.length > 0 && !matches.length && <p>לא נמצאו דמויות.</p>}
        </div>
      )}
    </div>
  );
}
