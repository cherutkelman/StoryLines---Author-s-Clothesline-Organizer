import { useState, type RefObject } from 'react';
import type Konva from 'konva';
import { exportMindMapPng } from '../../src/mind-map-export';

export function useMindMapExport(layer: RefObject<Konva.Layer | null>, name: string) {
  const [exportError, setExportError] = useState(false);
  const exportAsImage = () => {
    try {
      exportMindMapPng(layer.current, name);
      setExportError(false);
    } catch {
      setExportError(true);
    }
  };
  return { exportAsImage, exportError };
}
