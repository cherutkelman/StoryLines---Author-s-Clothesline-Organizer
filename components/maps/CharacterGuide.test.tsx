import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CharacterGuide from './CharacterGuide';
import { readCharacterMapImage } from '../../src/characters/characterMapImage';
import type { CharacterEntry } from '../../types';

const hooks = vi.hoisted(() => ({ values: [] as unknown[], refs: [] as { current: unknown }[], state: 0, ref: 0 }));
vi.mock('react', async importOriginal => ({
  ...(await importOriginal<typeof React>()),
  useState: (initial: unknown) => {
    const index = hooks.state++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [hooks.values[index], (next: unknown) => {
      hooks.values[index] = typeof next === 'function' ? next(hooks.values[index]) : next;
    }];
  },
  useRef: (initial: unknown) => hooks.refs[hooks.ref++] ??= { current: initial },
  useLayoutEffect: (effect: () => unknown) => effect(),
}));
vi.mock('../../src/characters/characterMapImage', () => ({ readCharacterMapImage: vi.fn() }));
vi.mock('../../src/platform', () => ({ isElectron: false }));

const character = (id: string, name: string, imageUrl?: string): CharacterEntry => ({
  id, name, imageUrl, data: {}, customFields: [],
});

type ActionProps = {
  children?: React.ReactNode;
  onClick?: () => void;
  onChange?: (event: unknown) => void;
  onSubmit?: (event: unknown) => void;
  type?: string;
  name?: string;
};

function find(node: React.ReactNode, predicate: (element: React.ReactElement<ActionProps>) => boolean): React.ReactElement<ActionProps> | undefined {
  for (const child of React.Children.toArray(node)) {
    if (!React.isValidElement<ActionProps>(child)) continue;
    if (predicate(child)) return child;
    const result = find(child.props.children, predicate);
    if (result) return result;
  }
}

function fixture() {
  const a = character('a', 'יעל', '/yael.png');
  const b = character('b', 'נועה');
  const c = character('c', 'מיה');
  const outsider = character('d', 'מחוץ למפה');
  const link = { id: 'linked', fromId: 'b', toId: 'a', description: 'אחיות', labelPosition: 0.7 };
  const props = {
    characters: [a, b, c], bookCharacters: [a, b, c, outsider], connections: [link],
    onShowMap: vi.fn(),
    onEditCharacter: vi.fn(),
    onAddNewCharacter: vi.fn(() => 'new'),
    onAddExistingCharacters: vi.fn(),
    onRemoveCharacter: vi.fn(),
    onUpdateConnections: vi.fn(),
  };
  const render = () => {
    hooks.state = hooks.ref = 0;
    return CharacterGuide(props);
  };
  const click = (label: string) => find(render(), element =>
    element.type === 'button' && element.props.children === label,
  )!.props.onClick!();
  const open = (name: string) => find(render(), element =>
    element.type === 'button' && renderToStaticMarkup(element).includes(name),
  )!.props.onClick!();
  const change = (type: string, value: string) => find(render(), element =>
    element.type === type || element.props.type === type,
  )!.props.onChange!({ target: { value } });
  const submit = (label: string, values = {}) => {
    vi.stubGlobal('FormData', class { get(name: string) { return (values as Record<string, string>)[name]; } });
    find(render(), element => element.type === 'form' && renderToStaticMarkup(element).includes(label))!
      .props.onSubmit!({ preventDefault: vi.fn(), currentTarget: {} });
  };
  return { props, link, render, click, open, change, submit, html: () => renderToStaticMarkup(render()) };
}

beforeEach(() => {
  hooks.values = [];
  hooks.refs = [];
  vi.stubGlobal('window', { confirm: vi.fn(() => true) });
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe('mobile character guide', () => {
  it('opens the map only from the explicit view action and calls no edit handlers', () => {
    const guide = fixture();
    expect(guide.html()).toContain('מדריך דמויות וקשרים');
    expect(guide.props.onShowMap).not.toHaveBeenCalled();
    guide.click('הצג מפה');
    expect(guide.props.onShowMap).toHaveBeenCalledOnce();
    expect(guide.props.onEditCharacter).not.toHaveBeenCalled();
    expect(guide.props.onUpdateConnections).not.toHaveBeenCalled();
  });
  it('lists only map members with images and connection counts, filters by name and returns from a card', () => {
    const guide = fixture();
    expect(guide.html()).toContain('/yael.png');
    expect(guide.html()).toContain('1 קשרים');
    expect(guide.html()).not.toContain('מחוץ למפה');
    guide.change('search', 'יעל');
    expect(guide.html()).not.toContain('נועה');
    guide.open('יעל');
    expect(guide.html()).toContain('אחיות');
    expect(guide.html()).not.toContain('autofocus');
    guide.click('חזרה למדריך');
    expect(guide.html()).toContain('חיפוש לפי שם');
    expect(guide.props.onUpdateConnections).not.toHaveBeenCalled();
  });

  it('creates a character or offers only book characters outside this map', () => {
    const guide = fixture();
    guide.click('דמות חדשה');
    expect(guide.props.onAddNewCharacter).toHaveBeenCalledOnce();
    guide.click('הוספת דמות קיימת');
    expect(guide.html()).toContain('<option value="d">מחוץ למפה</option>');
    expect(guide.html()).not.toContain('<option value="a">');
    guide.change('select', 'd');
    guide.submit('הוספה למפה');
    expect(guide.props.onAddExistingCharacters).toHaveBeenCalledWith(['d'], undefined);
  });

  it('saves names and shares the same image field for adding, replacing and removing photos', async () => {
    const guide = fixture();
    const upload = async () => {
      const file = find(guide.render(), element => element.props.type === 'file')!;
      file.props.onChange!({ currentTarget: {} });
      await Promise.resolve();
    };
    guide.open('יעל');
    guide.submit('שמירת שם', { name: ' יעל חדשה ' });
    expect(guide.props.onEditCharacter).toHaveBeenCalledWith('a', { name: 'יעל חדשה' });
    expect(guide.html()).toContain('החלפת תמונה');
    vi.mocked(readCharacterMapImage).mockResolvedValue('data:image/png;base64,new');
    await upload();
    expect(guide.props.onEditCharacter).toHaveBeenCalledWith('a', { imageUrl: 'data:image/png;base64,new' });
    guide.click('הסרת תמונה');
    expect(guide.props.onEditCharacter).toHaveBeenCalledWith('a', { imageUrl: undefined });
    guide.click('חזרה למדריך');
    guide.open('נועה');
    expect(guide.html()).toContain('הוספת תמונה');
    await upload();
    expect(guide.props.onEditCharacter).toHaveBeenCalledWith('b', { imageUrl: 'data:image/png;base64,new' });
  });

  it('creates links explicitly, excludes the reverse duplicate, and changes or deletes only the chosen link', () => {
    const guide = fixture();
    guide.open('יעל');
    expect(guide.html()).toContain('<option value="c">מיה</option>');
    expect(guide.html()).not.toContain('<option value="b">');
    guide.change('select', 'c');
    guide.submit('יצירת קשר');
    expect(guide.props.onUpdateConnections).toHaveBeenLastCalledWith([
      guide.link, expect.objectContaining({ fromId: 'a', toId: 'c' }),
    ]);
    guide.submit('שמירת תיאור', { description: 'קשר חדש' });
    expect(guide.props.onUpdateConnections).toHaveBeenLastCalledWith([{ ...guide.link, description: 'קשר חדש' }]);
    guide.click('מחיקת קשר');
    expect(guide.props.onUpdateConnections).toHaveBeenLastCalledWith([]);
    expect(guide.props.onEditCharacter).not.toHaveBeenCalled();
  });

  it('removes a member only after confirmation and returns to the map list of characters', () => {
    const guide = fixture();
    guide.open('יעל');
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    guide.click('הסרת דמות מהמפה');
    expect(guide.props.onRemoveCharacter).not.toHaveBeenCalled();
    guide.click('הסרת דמות מהמפה');
    expect(guide.props.onRemoveCharacter).toHaveBeenCalledOnce();
    expect(guide.props.onRemoveCharacter).toHaveBeenCalledWith('a');
    expect(guide.props.onEditCharacter).not.toHaveBeenCalled();
    expect(guide.html()).toContain('חיפוש לפי שם');
  });
});
