import { v4 as uuidv4 } from "uuid";
import type { Book } from "./types";
const STORAGE_KEY = 'storylines_library_v2';
const USER_ID_KEY = "storylines_user_id";

export const getOrCreateUserId = (): string => {
  const existing = localStorage.getItem(USER_ID_KEY);

  if (existing) {
    return existing;
  }

  const newUserId = uuidv4();
  localStorage.setItem(USER_ID_KEY, newUserId);
  return newUserId;
};

export const loadBooks = (): Book[] => {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((b: any) => {
        if (b.characterMapNodes) {
          const nodes = b.characterMapNodes;
          const newCharacters = (b.characters || []).map((char: any) => {
            const node = nodes.find((n: any) => n.id === char.id || n.name === char.name);
            return {
              ...char,
              x: node?.x ?? char.x,
              y: node?.y ?? char.y,
              imageUrl: node?.imageUrl ?? char.imageUrl
            };
          });
          delete b.characterMapNodes;
          b.characters = newCharacters;
        }
        return b;
      });
    } catch (error) {
      console.error("Failed to load library", error);
    }
  }

  return [];
};

export const saveBooks = (books: Book[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch (error) {
    console.error("Failed to save books:", error);
  }
};
