import React from 'react';
import { Circle, Line, Rect, Text } from 'react-konva';
import type { MindMapNode } from '../../types';

export function MindMapLine({ from, to }: { from: MindMapNode; to: MindMapNode }) {
  return <Line points={[from.x, from.y, to.x, to.y]} strokeWidth={2}
    stroke={getComputedStyle(document.documentElement).getPropertyValue('--theme-border').trim() || '#cbd5e1'} />;
}

export function MindMapNodeArtwork({ node, selected = false }: { node: MindMapNode; selected?: boolean }) {
  return (
    <>
    {node.type === 'circle' ? (
      <Circle
        radius={50}
        fill={node.isRoot ? (getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim() || '#1e293b') : (getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim() + 'cc' || '#334155')}
        stroke={selected ? (getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim() || '#3b82f6') : 'transparent'}
        strokeWidth={3}
        shadowBlur={5}
        shadowOpacity={0.2}
      />
    ) : (
      <Rect
        x={-50}
        y={-30}
        width={100}
        height={60}
        fill={getComputedStyle(document.documentElement).getPropertyValue('--theme-secondary').trim() || '#f1f5f9'}
        stroke={selected ? (getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim() || '#3b82f6') : (getComputedStyle(document.documentElement).getPropertyValue('--theme-border').trim() || '#cbd5e1')}
        strokeWidth={2}
        cornerRadius={8}
        shadowBlur={5}
        shadowOpacity={0.1}
      />
    )}
    <Text
      text={node.text}
      fontSize={14}
      fill={node.type === 'circle' ? (getComputedStyle(document.documentElement).getPropertyValue('--theme-card').trim() || 'white') : (getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim() || '#1e293b')}
      align="center"
      verticalAlign="middle"
      width={90}
      height={node.type === 'circle' ? 100 : 60}
      offsetX={45}
      offsetY={node.type === 'circle' ? 50 : 30}
      wrap="char"
    />
    </>
  );
}
