import {
  Bird,
  Building2,
  Castle,
  Cat,
  Construction,
  Dog,
  Fish,
  Home,
  Leaf,
  Mountain,
  Navigation,
  Spline,
  TrainFront,
  Trees,
  Truck,
  Waves,
} from 'lucide-react';

export const MAP_TEXT_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI", Arial, sans-serif';

export type WorldMapTool =
  | 'select' | 'pan' | 'pencil' | 'road' | 'river' | 'pool' | 'railroad' | 'highway'
  | 'border' | 'text' | 'icon' | 'place' | 'brush' | 'area' | 'circle' | 'rect'
  | 'triangle' | 'line' | 'eraser' | 'fill';

export const ICON_COMPONENTS: Record<string, any> = {
  house: Home, houses: Home, tree: Trees, trees: Trees, mountain: Mountain, valley: Mountain,
  buildings: Building2, palace: Castle, bridge: Spline, fish: Fish, horse: Dog, snake: Spline,
  cattle: Dog, sheep: Dog, eagle: Bird, wildcat: Cat, flower: Leaf, wave: Waves, village: Home,
  camp: Home, temple: Castle, hotel: Building2, hospital: Building2, factory: Building2, park: Trees,
  city: Building2, car: Truck, bus: Truck, ambulance: Truck, fire_truck: Truck, truck: Truck,
  tractor: Truck, train: TrainFront, plane: Navigation, ship: Waves, desert: Mountain, beach: Waves,
  rainbow: Waves, fire: Waves, field: Leaf, traffic_light: Construction, barrier: Construction,
  cat: Cat, bird: Bird, market: Construction,
};

export const getDefaultMapIconSize = (iconType?: string) => {
  if (iconType === 'mountain') return 40;
  if (iconType === 'flower' || iconType === 'market') return 25;
  return 30;
};

export const getMapIconBrushSpacing = (iconSize: number, density: number) => {
  const normalizedDensity = Math.min(100, Math.max(1, density));
  const spacingMultiplier = 2.5 - ((normalizedDensity - 1) / 99) * 2.1;
  return Math.max(1, iconSize * spacingMultiplier);
};
