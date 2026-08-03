import React, { type ReactNode } from 'react';
import { ChevronDown, ChevronLeft } from 'lucide-react';

interface QuestionnaireAccordionProps {
  enabled: boolean;
  idPrefix: string;
  categories: string[];
  activeCategoryIndex: number;
  onSelectCategory: (index: number) => void;
  registerCategoryAnchor: (category: string, element: HTMLButtonElement | null) => void;
  children: ReactNode;
}

const QuestionnaireAccordion: React.FC<QuestionnaireAccordionProps> = ({
  enabled,
  idPrefix,
  categories,
  activeCategoryIndex,
  onSelectCategory,
  registerCategoryAnchor,
  children,
}) => {
  if (!enabled) return <>{children}</>;

  return (
    <div className="space-y-3" data-questionnaire={`${idPrefix}-accordion`}>
      {categories.map((category, index) => {
        const isExpanded = index === activeCategoryIndex;
        const triggerId = `${idPrefix}-questionnaire-category-${index}`;
        const panelId = `${triggerId}-panel`;

        return (
          <section
            key={category}
            className={`overflow-hidden rounded-2xl border transition-colors ${
              isExpanded
                ? 'border-[var(--theme-primary)]/30 bg-[var(--theme-secondary)]/10'
                : 'border-[var(--theme-border)]/50 bg-[var(--theme-card)]'
            }`}
          >
            <h3>
              <button
                ref={(element) => registerCategoryAnchor(category, element)}
                id={triggerId}
                type="button"
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={() => onSelectCategory(index)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right font-bold text-[var(--theme-accent)] transition-colors hover:bg-[var(--theme-secondary)]/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[var(--theme-primary)]/25 scroll-mt-24"
              >
                <span>{category}</span>
                {isExpanded ? (
                  <ChevronDown size={18} aria-hidden="true" />
                ) : (
                  <ChevronLeft size={18} aria-hidden="true" />
                )}
              </button>
            </h3>

            {isExpanded && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className="border-t border-[var(--theme-border)]/30 p-5 sm:p-7"
              >
                {children}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default QuestionnaireAccordion;
