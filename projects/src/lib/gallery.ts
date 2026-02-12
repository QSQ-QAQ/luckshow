export interface GalleryImage {
  id: string;
  name: string;
  uploadedAt: string;
  coverUrl?: string;
  shots?: string[];
  description?: string;
  url?: string;
}

export interface GalleryGroup {
  category: string;
  description: string;
  updatedAt: string;
  images: GalleryImage[];
}

export interface GalleryConfig {
  updatedAt: string;
  groups: GalleryGroup[];
}

export interface GalleryImageItem {
  id: string;
  name: string;
  category: string;
  uploadedAt: string;
  coverUrl: string;
  shots: string[];
  description?: string;
  groupDescription: string;
  groupUpdatedAt: string;
}

export const EMPTY_GALLERY_CONFIG: GalleryConfig = {
  updatedAt: '',
  groups: [],
};

export function normalizeDateString(value: string): string {
  const dateText = String(value ?? '').trim();
  const matched = dateText.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (!matched) {
    return dateText;
  }

  const year = matched[1];
  const month = matched[2].padStart(2, '0');
  const day = matched[3].padStart(2, '0');
  return `${year}/${month}/${day}`;
}

export function toSortableDateValue(value: string): number {
  const normalized = normalizeDateString(value);
  const matched = normalized.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!matched) {
    return 0;
  }

  const year = Number(matched[1]);
  const month = Number(matched[2]) - 1;
  const day = Number(matched[3]);
  return new Date(year, month, day).getTime();
}

function normalizeShots(image: GalleryImage): string[] {
  const rawShots = Array.isArray(image.shots) ? image.shots : [];
  const merged = [image.coverUrl || image.url || '', ...rawShots]
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(merged));
}

export function flattenGalleryImages(config: GalleryConfig): GalleryImageItem[] {
  return config.groups.flatMap((group) =>
    group.images.map((image) => {
      const shots = normalizeShots(image);
      return {
        id: String(image.id),
        name: image.name,
        category: group.category,
        uploadedAt: normalizeDateString(image.uploadedAt || group.updatedAt || config.updatedAt),
        coverUrl: image.coverUrl || image.url || shots[0] || '',
        shots,
        description: image.description,
        groupDescription: group.description,
        groupUpdatedAt: normalizeDateString(group.updatedAt),
      };
    })
  );
}

export function getGalleryCategories(config: GalleryConfig): string[] {
  return ['全部图片', ...Array.from(new Set(config.groups.map((group) => group.category)))];
}

export function findGalleryImageById(config: GalleryConfig, imageId: string): GalleryImageItem | undefined {
  return flattenGalleryImages(config).find((image) => image.id === imageId);
}
