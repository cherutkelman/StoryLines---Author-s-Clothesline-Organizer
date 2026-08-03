import React from 'react';
import { ChevronDown, ChevronLeft, LayoutList, X } from 'lucide-react';

interface MobileCategorySelectProps {
  categories: string[];
  currentCategoryIndex: number;
  activeCategory: string | null;
  mode: 'edit' | 'view';
  onSelect: (index: number) => void;
  onShowAll: () => void;
}

export const MobileCategorySelect: React.FC<MobileCategorySelectProps> = ({
  categories,
  currentCategoryIndex,
  activeCategory,
  mode,
  onSelect,
  onShowAll,
}) => (
  <label className="relative flex w-full items-center lg:hidden">
    <LayoutList size={18} className="pointer-events-none absolute right-4 text-[var(--theme-primary)]/60" />
    <select
      value={mode === 'edit' ? String(currentCategoryIndex) : (activeCategory ? String(categories.indexOf(activeCategory)) : '')}
      onChange={(event) => {
        if (event.target.value === '') {
          onShowAll();
          return;
        }
        onSelect(Number(event.target.value));
      }}
      className="w-full appearance-none rounded-2xl border border-[var(--theme-border)]/50 bg-[var(--theme-card)] py-3.5 pr-12 pl-10 text-sm font-bold text-[var(--theme-primary)] shadow-sm outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/15"
      aria-label="קטגוריות"
    >
      <option value={currentCategoryIndex}>קטגוריות</option>
      {categories.map((category, index) => (
        <option key={category} value={index}>{category}</option>
      ))}
    </select>
    <ChevronDown size={18} className="pointer-events-none absolute left-4 text-[var(--theme-primary)]/50" />
  </label>
);

interface CategorySidebarProps {
  categories: string[];
  currentCategoryIndex: number;
  activeCategory: string | null;
  onClose: () => void;
  onSelect: (index: number) => void;
  onShowAll: () => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  currentCategoryIndex,
  activeCategory,
  onClose,
  onSelect,
  onShowAll,
}) => (
  <div className="hidden w-56 flex-col gap-2 flex-shrink-0 animate-in slide-in-from-right-4 duration-300 lg:flex">
    <div className="p-2 text-[10px] font-black text-[var(--theme-accent)]/40 uppercase tracking-widest mb-2 px-4 flex items-center justify-between">
      <span>קטגוריות שאלון</span>
      <button onClick={onClose} className="text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)]"><X size={14} /></button>
    </div>
    <button
      onClick={onShowAll}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition-all ${activeCategory === null ? 'bg-[var(--theme-secondary)] text-[var(--theme-accent)] shadow-sm' : 'text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)]'}`}
    >
      <LayoutList size={14} />
      <span>הכל</span>
    </button>
    {categories.map((category, index) => (
      <button
        key={category}
        onClick={() => onSelect(index)}
        className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-xs text-right transition-all ${currentCategoryIndex === index ? 'bg-[var(--theme-secondary)] text-[var(--theme-accent)] shadow-sm' : 'text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)]'}`}
      >
        <span>{category}</span>
      </button>
    ))}
  </div>
);

interface CategoryActionsProps {
  currentCategoryIndex: number;
  categoryCount: number;
  onSelect: (index: number) => void;
}

export const CategoryActions: React.FC<CategoryActionsProps> = ({ currentCategoryIndex, categoryCount, onSelect }) => (
  <div className="flex items-center justify-between pt-10 border-t border-[var(--theme-border)]/50 mt-10">
    <button
      disabled={currentCategoryIndex === 0}
      onClick={() => onSelect(currentCategoryIndex - 1)}
      className="flex items-center gap-2 px-6 py-3 bg-[var(--theme-card)] border border-[var(--theme-border)]/50 rounded-xl text-[var(--theme-primary)] font-bold hover:bg-[var(--theme-secondary)] transition-all disabled:opacity-30 shadow-sm"
    >
      <ChevronLeft size={18} className="rotate-180" />
      <span>קטגוריה קודמת</span>
    </button>
    <button
      disabled={currentCategoryIndex === categoryCount - 1}
      onClick={() => onSelect(currentCategoryIndex + 1)}
      className="flex items-center gap-2 px-6 py-3 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-30 shadow-md"
    >
      <span>קטגוריה הבאה</span>
      <ChevronLeft size={18} />
    </button>
  </div>
);
