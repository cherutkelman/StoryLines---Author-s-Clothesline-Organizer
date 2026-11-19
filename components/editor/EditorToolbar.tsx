import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlignJustify, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Download, Focus, Hash, History, Info, Plus, Search, X } from 'lucide-react';
import type { EditorDisplayMode } from './editorTypes';
import EditorTextScaleControls from './EditorTextScaleControls';

interface EditorToolbarProps {
  textScale: number;
  onTextScaleChange: (scale: number) => void;
  totalWords: number;
  displayMode: EditorDisplayMode;
  isSearchOpen: boolean;
  searchQuery: string;
  searchResultCount?: number;
  activeSearchResult?: number;
  onNavigateSearch?: (step: -1 | 1) => void;
  hasActiveScene: boolean;
  onDisplayModeChange: (mode: EditorDisplayMode) => void;
  onSearchOpenChange: (isOpen: boolean) => void;
  onSearchQueryChange: (query: string) => void;
  onOpenBulkAdd: () => void;
  onNewChapter?: () => void;
  onOpenQuestionnaireBridge: () => void;
  onExport?: () => void;
  onOpenHistory: () => void;
  onOpenTips: () => void;
}

const menus = [
  { id: 'view', label: 'תצוגה' },
  { id: 'write', label: 'כתיבה' },
  { id: 'more', label: 'עוד' },
] as const;
type Menu = typeof menus[number]['id'];

interface EditorToolbarContentProps extends EditorToolbarProps {
  menuId: string;
  menuRegionRef?: React.Ref<HTMLDivElement>;
  placement?: 'toolbar' | 'drawer';
  openMenu: Menu | null;
  onMenuToggle: (menu: Menu, keyboard: boolean) => void;
  onMenuAction: (action: () => void) => void;
}

const focusClass = 'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--theme-primary)]';
const actionClass = `flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm font-bold text-[var(--theme-primary)] enabled:hover:bg-[var(--theme-secondary)] aria-pressed:bg-[var(--theme-secondary)] aria-pressed:underline disabled:cursor-not-allowed disabled:opacity-75 ${focusClass}`;
const focusableButton = 'button:not([disabled])';

export function EditorWordCount({ totalWords }: { totalWords: number }) {
  return (
    <div data-editor-word-count className="flex max-w-full shrink-0 items-center gap-1 rounded-lg bg-[var(--theme-bg)] px-2 py-1.5 text-[var(--theme-primary)] shadow-sm sm:gap-2 sm:px-3">
      <Hash size={16} aria-hidden="true" className="shrink-0 opacity-70" />
      <span className="whitespace-nowrap text-sm font-black tabular-nums">{totalWords.toLocaleString()} מילים</span>
    </div>
  );
}

export function EditorToolbarContent({
  textScale, onTextScaleChange, totalWords, displayMode, isSearchOpen, searchQuery, hasActiveScene,
  searchResultCount = 0, activeSearchResult = 0, onNavigateSearch,
  onDisplayModeChange, onSearchOpenChange, onSearchQueryChange, onOpenBulkAdd, onNewChapter,
  onOpenQuestionnaireBridge, onExport, onOpenHistory, onOpenTips, menuId, menuRegionRef,
  openMenu, onMenuToggle, onMenuAction, placement = 'toolbar',
}: EditorToolbarContentProps) {
  const inDrawer = placement === 'drawer';
  const navigate = (step: -1 | 1) => {
    if (!searchResultCount || !onNavigateSearch) return;
    if (inDrawer) onMenuAction(() => onNavigateSearch(step));
    else onNavigateSearch(step);
  };
  return (
    <div data-editor-toolbar={!inDrawer || undefined} data-editor-drawer-menus={inDrawer || undefined} dir="rtl"
      className={inDrawer ? 'min-w-0 lg:hidden' : 'sticky top-4 z-40 mb-12 hidden min-w-0 justify-center lg:flex'}>
      <div className={inDrawer ? 'min-w-0' : 'relative flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-[var(--theme-primary)]/50 bg-[var(--theme-primary)]/90 p-2 text-[var(--theme-bg)] shadow-xl backdrop-blur-md sm:gap-x-3'}>
        {!inDrawer && <EditorWordCount totalWords={totalWords} />}

        <div ref={menuRegionRef} className="flex max-w-full flex-wrap items-center justify-center gap-1">
          {menus.map(({ id, label }) => (
            <button
              key={id}
              id={`${menuId}-${id}`}
              type="button"
              aria-expanded={openMenu === id}
              aria-controls={openMenu === id ? menuId : undefined}
              onMouseDown={event => { if (!inDrawer && id === 'view' && event.button === 0) event.preventDefault(); }}
              onClick={event => onMenuToggle(id, event.detail === 0)}
              className={`flex min-h-11 items-center gap-1 rounded-lg border border-[var(--theme-primary)]/50 bg-[var(--theme-bg)] px-2 text-sm font-bold text-[var(--theme-primary)] shadow-sm hover:bg-[var(--theme-secondary)] aria-expanded:bg-[var(--theme-secondary)] aria-expanded:underline sm:px-3 ${focusClass}`}
            >
              {label}<ChevronDown size={14} aria-hidden="true" className="shrink-0" />
            </button>
          ))}

          {openMenu && (
            <div
              id={menuId}
              role="group"
              aria-labelledby={`${menuId}-${openMenu}`}
              className={`rounded-xl border border-[var(--theme-primary)]/50 bg-[var(--theme-bg)] p-1.5 text-[var(--theme-primary)] ${inDrawer
                ? 'mt-1 w-full'
                : 'absolute left-1/2 top-full z-10 mt-2 max-h-[55dvh] w-64 max-w-full -translate-x-1/2 overflow-y-auto shadow-xl'}`}
            >
              {openMenu === 'view' && (
                <>
                  <button type="button" className={actionClass} aria-pressed={displayMode === 'focus'}
                    onClick={() => onMenuAction(() => onDisplayModeChange('focus'))}>
                    <Focus size={14} aria-hidden="true" /><span>סגור הכל</span>
                  </button>
                  <button type="button" className={actionClass} aria-pressed={displayMode === 'full'}
                    onClick={() => onMenuAction(() => onDisplayModeChange('full'))}>
                    <AlignJustify size={14} aria-hidden="true" /><span>הצג הכל</span>
                  </button>
                  <EditorTextScaleControls textScale={textScale} onTextScaleChange={onTextScaleChange} />
                </>
              )}
              {openMenu === 'write' && (
                <>
                  <button type="button" className={actionClass} onClick={() => onMenuAction(onOpenBulkAdd)}>
                    <Plus size={14} aria-hidden="true" /><span>סצנה חדשה</span>
                  </button>
                  {onNewChapter && (
                    <button type="button" className={actionClass} aria-label="פרק חדש" onClick={() => onMenuAction(onNewChapter)}>
                      <Plus size={14} aria-hidden="true" /><span>פרק חדש</span>
                    </button>
                  )}
                  <button type="button" className={actionClass} onClick={() => onMenuAction(onOpenQuestionnaireBridge)}>
                    <BookOpen size={14} aria-hidden="true" /><span>שלוף משאלון</span>
                  </button>
                  {isSearchOpen ? (
                    <div className="rounded-md bg-[var(--theme-secondary)] px-2">
                      <div className="flex min-h-11 items-center gap-2">
                        <Search size={14} aria-hidden="true" className="shrink-0 opacity-70" />
                        <input autoFocus aria-label="חפש מילים" value={searchQuery} onChange={event => onSearchQueryChange(event.target.value)}
                          onKeyDown={event => {
                            if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
                            event.preventDefault();
                            navigate(event.shiftKey ? -1 : 1);
                          }}
                          placeholder="חפש מילים..." className={`min-w-0 flex-1 rounded-md border-none bg-transparent text-sm placeholder:text-[var(--theme-primary)]/75 focus:ring-0 ${focusClass}`} />
                        <button type="button" aria-label="סגור חיפוש" className={`flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-[var(--theme-bg)] ${focusClass}`}
                          onClick={() => { onSearchOpenChange(false); onSearchQueryChange(''); }}>
                          <X size={14} aria-hidden="true" />
                        </button>
                      </div>
                      {searchQuery.trim() && (
                        <div className="flex min-h-11 flex-wrap items-center justify-between gap-1">
                          <span role="status" className="px-1 text-xs font-bold tabular-nums">
                            {searchResultCount ? `${activeSearchResult} מתוך ${searchResultCount}` : 'לא נמצאו תוצאות'}
                          </span>
                          <div className="flex">
                            <button type="button" aria-label="התוצאה הקודמת" disabled={!searchResultCount}
                              className={`flex min-h-11 min-w-11 items-center justify-center rounded-md enabled:hover:bg-[var(--theme-bg)] disabled:opacity-75 ${focusClass}`}
                              onClick={() => navigate(-1)}><ChevronRight size={16} aria-hidden="true" /></button>
                            <button type="button" aria-label="התוצאה הבאה" disabled={!searchResultCount}
                              className={`flex min-h-11 min-w-11 items-center justify-center rounded-md enabled:hover:bg-[var(--theme-bg)] disabled:opacity-75 ${focusClass}`}
                              onClick={() => navigate(1)}><ChevronLeft size={16} aria-hidden="true" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button type="button" className={actionClass} onClick={() => onSearchOpenChange(true)}>
                      <Search size={14} aria-hidden="true" /><span>חיפוש</span>
                    </button>
                  )}
                </>
              )}
              {openMenu === 'more' && (
                <>
                  <button type="button" className={actionClass} disabled={!onExport} onClick={() => onExport && onMenuAction(onExport)}>
                    <Download size={14} aria-hidden="true" /><span>ייצוא</span>
                  </button>
                  <button type="button" className={actionClass} disabled={!hasActiveScene} onClick={() => onMenuAction(onOpenHistory)}>
                    <History size={14} aria-hidden="true" /><span>היסטוריית גרסאות</span>
                  </button>
                  <button type="button" className={actionClass} onClick={() => onMenuAction(onOpenTips)}>
                    <Info size={14} aria-hidden="true" /><span>טיפים</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditorToolbarSurface({ placement, onCloseDrawer, ...props }: EditorToolbarProps & {
  placement: 'toolbar' | 'drawer';
  onCloseDrawer?: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<Menu | null>(null);
  const menuId = useId();
  const menuRegionRef = useRef<HTMLDivElement>(null);
  const focusPanelOnOpen = useRef(false);

  const focusTrigger = (menu: Menu) => document.getElementById(`${menuId}-${menu}`)?.focus();

  useEffect(() => {
    if (!openMenu) return;
    if (focusPanelOnOpen.current) {
      const panel = document.getElementById(menuId);
      const firstControl = openMenu === 'write' && props.isSearchOpen
        ? panel?.querySelector<HTMLInputElement>('input')
        : panel?.querySelector<HTMLButtonElement>(focusableButton);
      firstControl?.focus();
      focusPanelOnOpen.current = false;
    }

    const dismissEvent = placement === 'drawer' ? 'click' : 'pointerdown';
    const handleOutside = (event: Event) => {
      if (event.target instanceof Node && !menuRegionRef.current?.contains(event.target)) setOpenMenu(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !menuRegionRef.current?.getClientRects().length) return;
      event.preventDefault();
      event.stopPropagation();
      setOpenMenu(null);
      document.getElementById(`${menuId}-${openMenu}`)?.focus();
    };
    document.addEventListener(dismissEvent, handleOutside, true);
    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener(dismissEvent, handleOutside, true);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [menuId, openMenu, placement, props.isSearchOpen]);

  return (
    <EditorToolbarContent
      {...props}
      menuId={menuId}
      placement={placement}
      menuRegionRef={menuRegionRef}
      openMenu={openMenu}
      onMenuToggle={(menu, keyboard) => {
        focusPanelOnOpen.current = keyboard && menu !== openMenu;
        setOpenMenu(menu === openMenu ? null : menu);
      }}
      onMenuAction={action => {
        setOpenMenu(null);
        if (placement === 'drawer') onCloseDrawer?.();
        else if (openMenu) focusTrigger(openMenu);
        action();
      }}
    />
  );
}

export default function EditorToolbar({
  mobileMenuHost, mobileWordCountHost, onCloseMobileMenu, ...props
}: EditorToolbarProps & {
  mobileMenuHost?: HTMLElement | null;
  mobileWordCountHost?: HTMLElement | null;
  onCloseMobileMenu?: () => void;
}) {
  return (
    <>
      <EditorToolbarSurface {...props} placement="toolbar" />
      {mobileMenuHost && createPortal(
        <EditorToolbarSurface {...props} placement="drawer" onCloseDrawer={onCloseMobileMenu} />,
        mobileMenuHost,
      )}
      {mobileWordCountHost && createPortal(<EditorWordCount totalWords={props.totalWords} />, mobileWordCountHost)}
    </>
  );
}
