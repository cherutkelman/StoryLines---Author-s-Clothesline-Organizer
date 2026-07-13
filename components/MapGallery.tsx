import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Copy, Grid3X3, ImagePlus, Maximize2, Minimize2, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { MapGallery as MapGalleryData } from '../types';

interface MapGalleryProps {
  gallery?: MapGalleryData;
  onUpdateGallery: (gallery: MapGalleryData) => void;
}

const DEFAULT_CATEGORY_ID = 'gallery-cat-default';
const MIN_COLUMNS = 1;
const MAX_COLUMNS = 8;

const createDefaultGallery = (): MapGalleryData => ({
  categories: [{ id: DEFAULT_CATEGORY_ID, name: 'כללי' }],
  images: [],
  activeCategoryId: DEFAULT_CATEGORY_ID,
  activeImageId: null,
  viewMode: 'grid',
  gridColumns: 3,
});

const normalizeGallery = (gallery?: MapGalleryData): MapGalleryData => {
  const fallback = createDefaultGallery();
  const sourceCategories = gallery?.categories?.length ? gallery.categories : fallback.categories;
  const categories = [
    { id: DEFAULT_CATEGORY_ID, name: 'כללי' },
    ...sourceCategories
      .filter(category => category.id !== DEFAULT_CATEGORY_ID)
      .map(category => ({ ...category, name: category.name || 'ללא שם' })),
  ];
  const activeCategoryId = categories.some(category => category.id === gallery?.activeCategoryId)
    ? gallery?.activeCategoryId
    : categories[0].id;

  return {
    ...fallback,
    ...gallery,
    categories,
    images: gallery?.images || [],
    activeCategoryId,
    activeImageId: gallery?.activeImageId || null,
    viewMode: gallery?.viewMode || 'grid',
    gridColumns: Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, gallery?.gridColumns || 3)),
  };
};

const MapGallery: React.FC<MapGalleryProps> = ({ gallery, onUpdateGallery }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const normalized = useMemo(() => normalizeGallery(gallery), [gallery]);
  const activeCategoryId = normalized.activeCategoryId || normalized.categories[0].id;
  const activeCategory = normalized.categories.find(category => category.id === activeCategoryId) || normalized.categories[0];
  const isGeneralCategory = activeCategory.id === DEFAULT_CATEGORY_ID;
  const assignableCategories = normalized.categories.filter(category => category.id !== DEFAULT_CATEGORY_ID);
  const uploadCategory = isGeneralCategory ? (assignableCategories[0] || activeCategory) : activeCategory;
  const categoryImages = isGeneralCategory
    ? normalized.images
    : normalized.images.filter(image => image.categoryId === activeCategory.id);
  const activeImageIndex = Math.max(0, categoryImages.findIndex(image => image.id === normalized.activeImageId));
  const activeImage = categoryImages[activeImageIndex] || categoryImages[0];

  const updateGallery = (updates: Partial<MapGalleryData>) => {
    onUpdateGallery({ ...normalized, ...updates });
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;

    const uploadedImages = await Promise.all(
      Array.from(files).map(file => new Promise<MapGalleryData['images'][number] | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : '';
          resolve(dataUrl ? {
            id: `gallery-image-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            categoryId: uploadCategory.id,
            name: file.name.replace(/\.[^.]+$/, '') || 'תמונה חדשה',
            dataUrl,
            createdAt: Date.now(),
          } : null);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      }))
    );

    const validImages = uploadedImages.filter((image): image is MapGalleryData['images'][number] => Boolean(image));
    if (validImages.length > 0) {
      updateGallery({
        images: [...normalized.images, ...validImages],
        activeCategoryId: activeCategory.id,
        activeImageId: validImages[validImages.length - 1].id,
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addCategory = () => {
    const newCategory = {
      id: `gallery-cat-${Date.now()}`,
      name: `קטגוריה ${normalized.categories.length + 1}`,
    };
    updateGallery({
      categories: [...normalized.categories, newCategory],
      activeCategoryId: newCategory.id,
      activeImageId: null,
    });
  };

  const renameCategory = (name: string) => {
    if (activeCategory.id === DEFAULT_CATEGORY_ID) return;
    updateGallery({
      categories: normalized.categories.map(category =>
        category.id === activeCategory.id ? { ...category, name } : category
      ),
    });
  };

  const deleteCategory = () => {
    if (activeCategory.id === DEFAULT_CATEGORY_ID || normalized.categories.length <= 1) return;
    if (!confirm('למחוק את הקטגוריה ואת התמונות שבתוכה?')) return;

    const categories = normalized.categories.filter(category => category.id !== activeCategory.id);
    updateGallery({
      categories,
      images: normalized.images.filter(image => image.categoryId !== activeCategory.id),
      activeCategoryId: categories[0].id,
      activeImageId: null,
    });
  };

  const deleteImage = (imageId: string) => {
    const images = normalized.images.filter(image => image.id !== imageId);
    const nextCategoryImages = isGeneralCategory ? images : images.filter(image => image.categoryId === activeCategory.id);
    updateGallery({
      images,
      activeImageId: nextCategoryImages[0]?.id || null,
    });
  };

  const getImageTargetCategories = (imageCategoryId: string) =>
    assignableCategories.filter(category => category.id !== imageCategoryId);

  const getTargetCategoryId = (imageCategoryId: string) => {
    const targets = getImageTargetCategories(imageCategoryId);
    if (targets.some(category => category.id === targetCategoryId)) return targetCategoryId;
    return targets[0]?.id || '';
  };

  const moveImage = (imageId: string, destinationCategoryId: string) => {
    if (!destinationCategoryId) return;
    updateGallery({
      images: normalized.images.map(image =>
        image.id === imageId ? { ...image, categoryId: destinationCategoryId } : image
      ),
    });
  };

  const copyImage = (imageId: string, destinationCategoryId: string) => {
    if (!destinationCategoryId) return;
    const image = normalized.images.find(item => item.id === imageId);
    if (!image) return;

    updateGallery({
      images: [
        ...normalized.images,
        {
          ...image,
          id: `gallery-image-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          categoryId: destinationCategoryId,
          createdAt: Date.now(),
        },
      ],
    });
  };

  const renderImageCategoryActions = (image: MapGalleryData['images'][number], compact = false) => {
    const targetId = getTargetCategoryId(image.categoryId);
    const targets = getImageTargetCategories(image.categoryId);
    if (targets.length === 0) return null;

    return (
      <div className={`flex items-center gap-1 ${compact ? 'w-full justify-center' : ''}`}>
        <select
          value={targetId}
          onChange={(event) => setTargetCategoryId(event.target.value)}
          className="max-w-32 bg-[var(--theme-card)]/95 border border-[var(--theme-border)] rounded-lg px-2 py-1 text-[11px] font-bold text-[var(--theme-primary)] outline-none"
          title="קטגוריית יעד"
        >
          {targets.map(category => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <button
          onClick={() => moveImage(image.id, targetId)}
          className="p-1.5 rounded-lg bg-[var(--theme-card)]/95 text-[var(--theme-primary)] shadow-sm hover:bg-[var(--theme-secondary)] transition-all"
          title="העבר לקטגוריה"
        >
          <ArrowLeftRight size={14} />
        </button>
        <button
          onClick={() => copyImage(image.id, targetId)}
          className="p-1.5 rounded-lg bg-[var(--theme-card)]/95 text-[var(--theme-primary)] shadow-sm hover:bg-[var(--theme-secondary)] transition-all"
          title="העתק לקטגוריה"
        >
          <Copy size={14} />
        </button>
      </div>
    );
  };

  const moveSlider = (direction: -1 | 1) => {
    if (categoryImages.length === 0) return;
    const nextIndex = (activeImageIndex + direction + categoryImages.length) % categoryImages.length;
    updateGallery({ activeImageId: categoryImages[nextIndex].id });
  };

  return (
    <div className="h-full flex flex-col bg-[var(--theme-bg)] overflow-hidden" dir="rtl">
      <div className="flex-shrink-0 border-b border-[var(--theme-border)] bg-[var(--theme-card)]/95 px-4 sm:px-8 py-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--theme-accent)] handwritten">גלריה</h2>
            <span className="text-xs font-bold text-[var(--theme-primary)]/50">{categoryImages.length} תמונות</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-secondary)]/40 p-1">
              <button
                onClick={() => updateGallery({ viewMode: 'grid' })}
                className={`p-2 rounded-lg transition-all ${normalized.viewMode === 'grid' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'text-[var(--theme-primary)]/60 hover:bg-[var(--theme-card)]'}`}
                title="תצוגת תמונות זו לצד זו"
              >
                <Grid3X3 size={18} />
              </button>
              <button
                onClick={() => updateGallery({ viewMode: 'slider', activeImageId: activeImage?.id || null })}
                className={`p-2 rounded-lg transition-all ${normalized.viewMode === 'slider' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'text-[var(--theme-primary)]/60 hover:bg-[var(--theme-card)]'}`}
                title="תצוגת סליידר"
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>

            {normalized.viewMode === 'grid' && (
              <div className="flex items-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-secondary)]/40 p-1">
                <button
                  onClick={() => updateGallery({ gridColumns: Math.max(MIN_COLUMNS, normalized.gridColumns! - 1) })}
                  className="p-2 rounded-lg text-[var(--theme-primary)]/70 hover:bg-[var(--theme-card)] transition-all disabled:opacity-30"
                  disabled={normalized.gridColumns === MIN_COLUMNS}
                  title="זום אין"
                >
                  <Maximize2 size={17} />
                </button>
                <span className="w-8 text-center text-xs font-black text-[var(--theme-primary)]/60">{normalized.gridColumns}</span>
                <button
                  onClick={() => updateGallery({ gridColumns: Math.min(MAX_COLUMNS, normalized.gridColumns! + 1) })}
                  className="p-2 rounded-lg text-[var(--theme-primary)]/70 hover:bg-[var(--theme-card)] transition-all disabled:opacity-30"
                  disabled={normalized.gridColumns === MAX_COLUMNS}
                  title="זום אאוט"
                >
                  <Minimize2 size={17} />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => handleUpload(event.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--theme-primary)] text-[var(--theme-card)] text-sm font-bold shadow-md hover:opacity-90 transition-all"
            >
              <ImagePlus size={18} />
              <span>העלה תמונות</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {normalized.categories.map(category => (
              <button
                key={category.id}
                onClick={() => updateGallery({ activeCategoryId: category.id, activeImageId: null })}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  category.id === activeCategory.id
                    ? 'bg-[var(--theme-secondary)] text-[var(--theme-primary)] border-[var(--theme-border)] shadow-sm'
                    : 'bg-transparent text-[var(--theme-primary)]/55 border-transparent hover:bg-[var(--theme-secondary)]/60'
                }`}
              >
                {category.name || 'ללא שם'}
              </button>
            ))}
            <button
              onClick={addCategory}
              className="flex-shrink-0 p-2 rounded-xl text-[var(--theme-primary)]/70 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] transition-all"
              title="קטגוריה חדשה"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:mr-auto">
            <Pencil size={15} className="text-[var(--theme-primary)]/35" />
            <input
              value={activeCategory.name}
              onChange={(event) => renameCategory(event.target.value)}
              disabled={activeCategory.id === DEFAULT_CATEGORY_ID}
              className="min-w-0 w-44 bg-[var(--theme-secondary)]/50 border border-[var(--theme-border)] rounded-xl px-3 py-2 text-sm font-bold text-[var(--theme-primary)] outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/15 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="שם קטגוריה"
            />
            <button
              onClick={deleteCategory}
              disabled={activeCategory.id === DEFAULT_CATEGORY_ID || normalized.categories.length <= 1}
              className="p-2 rounded-xl text-red-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
              title="מחק קטגוריה"
            >
              <Trash2 size={17} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {categoryImages.length === 0 ? (
          <div className="h-full min-h-[360px] flex items-center justify-center">
            <div className="max-w-sm text-center border-2 border-dashed border-[var(--theme-border)] rounded-[2rem] bg-[var(--theme-card)]/45 p-10">
              <div className="w-16 h-16 rounded-2xl bg-[var(--theme-secondary)] text-[var(--theme-primary)] flex items-center justify-center mx-auto mb-4">
                <ImagePlus size={32} />
              </div>
              <h3 className="text-lg font-bold text-[var(--theme-accent)] mb-2">אין עדיין תמונות בקטגוריה הזו</h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-5 py-3 rounded-xl bg-[var(--theme-primary)] text-[var(--theme-card)] text-sm font-bold shadow-md hover:opacity-90 transition-all"
              >
                העלה תמונות
              </button>
            </div>
          </div>
        ) : normalized.viewMode === 'slider' ? (
          <div className="h-full min-h-[420px] flex flex-col gap-4">
            <div className="flex-1 min-h-0 relative rounded-2xl bg-[var(--theme-card)] border border-[var(--theme-border)] overflow-hidden shadow-sm">
              <img src={activeImage.dataUrl} alt={activeImage.name} className="w-full h-full object-contain bg-black/5" />
              <button
                onClick={() => moveSlider(1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-[var(--theme-card)]/90 text-[var(--theme-primary)] shadow-md hover:bg-[var(--theme-secondary)] transition-all"
                title="התמונה הבאה"
              >
                <ChevronRight size={22} />
              </button>
              <button
                onClick={() => moveSlider(-1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-[var(--theme-card)]/90 text-[var(--theme-primary)] shadow-md hover:bg-[var(--theme-secondary)] transition-all"
                title="התמונה הקודמת"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={() => deleteImage(activeImage.id)}
                className="absolute left-3 bottom-3 p-2 rounded-xl bg-[var(--theme-card)]/90 text-red-400 shadow-md hover:text-red-600 hover:bg-red-50 transition-all"
                title="מחק תמונה"
              >
                <Trash2 size={18} />
              </button>
              <div className="absolute right-3 bottom-3">
                {renderImageCategoryActions(activeImage)}
              </div>
            </div>
            <div className="text-center text-sm font-bold text-[var(--theme-primary)]/70 truncate">
              {activeImage.name} · {activeImageIndex + 1} / {categoryImages.length}
            </div>
          </div>
        ) : (
          <div
            className="grid gap-2 sm:gap-3"
            style={{ gridTemplateColumns: `repeat(${normalized.gridColumns}, minmax(0, 1fr))` }}
          >
            {categoryImages.map(image => (
              <div key={image.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-[var(--theme-card)] border border-[var(--theme-border)] shadow-sm">
                <img src={image.dataUrl} alt={image.name} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-bold truncate">{image.name}</p>
                </div>
                <button
                  onClick={() => deleteImage(image.id)}
                  className="absolute left-2 bottom-2 p-2 rounded-xl bg-[var(--theme-card)]/90 text-red-400 shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all"
                  title="מחק תמונה"
                >
                  <Trash2 size={16} />
                </button>
                <div className="absolute right-2 top-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {renderImageCategoryActions(image)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapGallery;
