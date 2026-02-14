export interface GalleryImage {
  id: string;
  name: string;
  uploadedAt: string;
  heat?: number;
  coverUrl?: string;
  shots?: string[];
  description?: string;
  url?: string;
  status?: GalleryImageStatus;
}

export type GalleryImageStatus = 'on' | 'off' | 'sold-out';

export const GALLERY_ADMIN_STORAGE_KEY = 'gallery-admin-config-v1';
export const GALLERY_RETURN_PATH_STORAGE_KEY = 'gallery-return-path';

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
  heat: number;
  coverUrl: string;
  shots: string[];
  description?: string;
  groupDescription: string;
  groupUpdatedAt: string;
  status: GalleryImageStatus;
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

export function normalizeImageStatus(status?: string): GalleryImageStatus {
  if (status === 'off' || status === 'sold-out') {
    return status;
  }
  return 'on';
}

export function normalizeImageHeat(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

export function normalizeGalleryConfig(config: GalleryConfig): GalleryConfig {
  return {
    updatedAt: normalizeDateString(config.updatedAt),
    groups: config.groups.map((group) => ({
      ...group,
      updatedAt: normalizeDateString(group.updatedAt),
      images: group.images.map((image) => ({
        ...image,
        uploadedAt: normalizeDateString(image.uploadedAt || group.updatedAt || config.updatedAt),
        heat: normalizeImageHeat(image.heat),
        status: normalizeImageStatus(image.status),
      })),
    })),
  };
}

export function flattenGalleryImages(config: GalleryConfig, heatMap?: Map<string, number>): GalleryImageItem[] {
  return config.groups.flatMap((group) =>
    group.images.map((image) => {
      const shots = normalizeShots(image);
      const imageId = String(image.id);
      const dbHeat = heatMap ? heatMap.get(imageId) : undefined;
      return {
        id: imageId,
        name: image.name,
        category: group.category,
        uploadedAt: normalizeDateString(image.uploadedAt || group.updatedAt || config.updatedAt),
        heat: dbHeat !== undefined ? dbHeat : normalizeImageHeat(image.heat),
        coverUrl: image.coverUrl || image.url || shots[0] || '',
        shots,
        description: image.description,
        groupDescription: group.description,
        groupUpdatedAt: normalizeDateString(group.updatedAt),
        status: normalizeImageStatus(image.status),
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
