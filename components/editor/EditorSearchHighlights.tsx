import React from 'react';
import { normalizeSearchText, type SearchRange } from './editorSearch';
import './editorSearchHighlights.css';

export default function EditorSearchHighlights({ ref, content, ranges, activeStart, className, fontSize }: {
  ref?: React.Ref<HTMLDivElement>;
  content: string;
  ranges: readonly SearchRange[];
  activeStart?: number;
  className?: string;
  fontSize: string;
}) {
  const text = normalizeSearchText(content);
  let end = 0;
  return (
    <div ref={ref} aria-hidden="true" className={`${className ?? ''} storylines-editor-search-mirror`} style={{ fontSize }}>
      {ranges.map(range => {
        const preceding = text.slice(end, range.start);
        end = range.end;
        return (
          <React.Fragment key={range.start}>
            {preceding}
            <mark data-editor-active-match={range.start === activeStart || undefined}>{text.slice(range.start, range.end)}</mark>
          </React.Fragment>
        );
      })}
      {text.slice(end)}
    </div>
  );
}
