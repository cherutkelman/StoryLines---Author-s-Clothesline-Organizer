import React from "react";
import { Book } from "../types";

interface ExternalReviewProps {
  book: Book;
}

const ExternalReview: React.FC<ExternalReviewProps> = ({ book }) => {
  const scenes = book.scenes || [];

  return (
    <div className="h-full flex flex-col bg-[var(--theme-bg)] text-[var(--theme-primary)]">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--theme-border)]">
        <div className="text-sm font-bold">מצב עורך חיצוני</div>

        <div className="flex items-center gap-2">
          <input
            placeholder="חיפוש..."
            className="px-2 py-1 text-xs rounded bg-[var(--theme-secondary)]"
          />

          <button className="px-3 py-1 text-xs bg-[var(--theme-secondary)] rounded">
            ייצוא
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {scenes.map((scene, index) => (
          <div key={scene.id} className="space-y-2">

            {/* Scene title */}
            <div className="text-xs opacity-60">
              סצנה {index + 1}
            </div>

            {/* Scene text */}
            <div className="whitespace-pre-wrap leading-relaxed text-sm">
              {scene.content}
            </div>

          </div>
        ))}

      </div>
    </div>
  );
};

export default ExternalReview;