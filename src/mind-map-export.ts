import Konva from 'konva';

const padding = 24;
const maxSide = 4096;
const maxPixels = 4_000_000;
type Bounds = { x: number; y: number; width: number; height: number };

export function getMindMapArtworkBounds(layer: Konva.Layer | null) {
  return layer?.getClientRect({ relativeTo: layer });
}

export function planMindMapExport(bounds: Bounds) {
  const { x, y, width, height } = bounds;
  if (![x, y, width, height].every(Number.isFinite) || width < 0 || height < 0) {
    throw new Error('Invalid mind map bounds');
  }
  const paddedWidth = width + padding * 2;
  const paddedHeight = height + padding * 2;
  // Reserve one pixel per dimension for rounding up without exceeding the budget.
  const scale = Math.min(1, (maxSide - 1) / Math.max(paddedWidth, paddedHeight),
    (Math.sqrt(maxPixels) - 1) / Math.sqrt(paddedWidth * paddedHeight));
  const outputWidth = Math.ceil(paddedWidth * scale);
  const outputHeight = Math.ceil(paddedHeight * scale);
  const origin = { x: (padding - x) * scale, y: (padding - y) * scale };
  if (!scale || !outputWidth || !outputHeight || outputWidth > maxSide || outputHeight > maxSide ||
    outputWidth * outputHeight > maxPixels || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) {
    throw new Error('Mind map exceeds the PNG canvas budget');
  }
  return { width: outputWidth, height: outputHeight, scale, ...origin };
}

export function exportMindMapPng(layer: Konva.Layer | null, name: string) {
  const bounds = getMindMapArtworkBounds(layer);
  if (!layer || !bounds) throw new Error('Mind map artwork is unavailable');
  const plan = planMindMapExport(bounds);
  // Serialize only drawing nodes. The detached group has no Stage or input
  // handlers and does not inherit the live Stage's translation or scale.
  const artwork = new Konva.Group({ x: plan.x, y: plan.y, scaleX: plan.scale, scaleY: plan.scale, listening: false });
  let canvas: HTMLCanvasElement | undefined;
  try {
    for (const child of layer.getChildren()) artwork.add(Konva.Node.create(child.toObject()));
    // Konva allocates an extra buffer based on |x| and |y|. Drawing at
    // output origin keeps the buffer bounded even for distant coordinates.
    canvas = artwork.toCanvas({ x: 0, y: 0, width: plan.width, height: plan.height, pixelRatio: 1 });
    const uri = canvas.toDataURL('image/png');
    if (!uri.startsWith('data:image/png;base64,')) throw new Error('PNG encoding failed');
    const link = document.createElement('a');
    link.download = `${name || 'mind-map'}.png`;
    link.href = uri;
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
    }
  } finally {
    artwork.destroy();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
