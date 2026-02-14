'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  EMPTY_GALLERY_CONFIG,
  flattenGalleryImages,
  GALLERY_RETURN_PATH_STORAGE_KEY,
  GalleryConfig,
  GalleryImageItem,
  getGalleryCategories,
  normalizeGalleryConfig,
  toSortableDateValue,
} from '@/lib/gallery';

type SortMode = 'time-desc' | 'time-asc' | 'name-asc' | 'name-desc' | 'heat';

const DEFAULT_CATEGORY = '全部图片';
const DEFAULT_SORT_MODE: SortMode = 'time-desc';

const isSortMode = (value: string | null): value is SortMode => {
  return value === 'time-desc'
    || value === 'time-asc'
    || value === 'name-asc'
    || value === 'name-desc'
    || value === 'heat';
};

export default function GalleryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialCategoryParam = searchParams.get('category');
  const initialSearchQueryParam = searchParams.get('q') ?? '';
  const initialSortModeParam = searchParams.get('sort');

  const [selectedCategory, setSelectedCategory] = useState(
    initialCategoryParam && initialCategoryParam.trim()
      ? initialCategoryParam
      : DEFAULT_CATEGORY
  );
  const [searchQuery, setSearchQuery] = useState(initialSearchQueryParam);
  const [galleryConfig, setGalleryConfig] = useState<GalleryConfig>(EMPTY_GALLERY_CONFIG);
  const [filteredImages, setFilteredImages] = useState<GalleryImageItem[]>([]);
  const [allImages, setAllImages] = useState<GalleryImageItem[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>(
    isSortMode(initialSortModeParam) ? initialSortModeParam : DEFAULT_SORT_MODE
  );
  const [loading, setLoading] = useState(true);
  const [galleryLoaded, setGalleryLoaded] = useState(false);

  const categories = getGalleryCategories(galleryConfig);
  const effectiveSelectedCategory =
    galleryLoaded
      && selectedCategory !== DEFAULT_CATEGORY
      && !categories.includes(selectedCategory)
      ? DEFAULT_CATEGORY
      : selectedCategory;

  const buildListUrl = useCallback(
    (nextCategory: string, nextSearchQuery: string, nextSortMode: SortMode) => {
      const params = new URLSearchParams();

      if (nextCategory !== DEFAULT_CATEGORY) {
        params.set('category', nextCategory);
      }

      const trimmedQuery = nextSearchQuery.trim();
      if (trimmedQuery) {
        params.set('q', trimmedQuery);
      }

      if (nextSortMode !== DEFAULT_SORT_MODE) {
        params.set('sort', nextSortMode);
      }

      const queryString = params.toString();
      return queryString ? `${pathname}?${queryString}` : pathname;
    },
    [pathname]
  );

  const syncListStateToUrl = useCallback(
    (nextCategory: string, nextSearchQuery: string, nextSortMode: SortMode) => {
      router.replace(buildListUrl(nextCategory, nextSearchQuery, nextSortMode), {
        scroll: false,
      });
    },
    [buildListUrl, router]
  );

  const selectedGroup = galleryConfig.groups.find(
    (group) => group.category === effectiveSelectedCategory
  );

  const latestUpdatedAt =
    allImages.length > 0
      ? [...allImages]
          .sort(
            (leftImage, rightImage) =>
              toSortableDateValue(rightImage.uploadedAt) -
              toSortableDateValue(leftImage.uploadedAt)
          )[0]?.uploadedAt || galleryConfig.updatedAt
      : galleryConfig.updatedAt;

  useEffect(() => {
    let mounted = true;

    const loadGalleryConfig = async () => {
      try {
        const response = await fetch('/gallery.json', { cache: 'no-store' });
        if (!response.ok) {
          if (mounted) {
            setGalleryLoaded(true);
          }
          return;
        }
        const data = (await response.json()) as GalleryConfig;
        if (!mounted || !data?.groups) {
          return;
        }

        const normalized = normalizeGalleryConfig(data);
        setGalleryConfig(normalized);
        setAllImages(flattenGalleryImages(normalized));
        setGalleryLoaded(true);
      } catch {
        if (!mounted) {
          return;
        }
        setGalleryConfig(EMPTY_GALLERY_CONFIG);
        setAllImages([]);
        setGalleryLoaded(true);
      }
    };

    loadGalleryConfig();

    return () => {
      mounted = false;
    };
  }, []);

  // 根据分类和搜索过滤图片
  useEffect(() => {
    setTimeout(() => {
      let filtered = allImages.filter((image) => image.status !== 'off');

      // 分类筛选
      if (effectiveSelectedCategory !== DEFAULT_CATEGORY) {
        filtered = filtered.filter(img => img.category === effectiveSelectedCategory);
      }

      // 搜索过滤
      if (searchQuery.trim()) {
        filtered = filtered.filter(img =>
          img.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      const sorted = [...filtered].sort((leftImage, rightImage) => {
        if (sortMode === 'name-asc') {
          return leftImage.name.localeCompare(rightImage.name, 'zh-CN');
        }

        if (sortMode === 'name-desc') {
          return rightImage.name.localeCompare(leftImage.name, 'zh-CN');
        }

        if (sortMode === 'heat') {
          const leftHeat = leftImage.heat;
          const rightHeat = rightImage.heat;
          if (rightHeat !== leftHeat) {
            return rightHeat - leftHeat;
          }
          return leftImage.name.localeCompare(rightImage.name, 'zh-CN');
        }

        const leftTime = toSortableDateValue(leftImage.uploadedAt);
        const rightTime = toSortableDateValue(rightImage.uploadedAt);
        if (leftTime !== rightTime) {
          return sortMode === 'time-desc'
            ? rightTime - leftTime
            : leftTime - rightTime;
        }
        return leftImage.name.localeCompare(rightImage.name, 'zh-CN');
      });

      setFilteredImages(sorted);
      setLoading(false);
    }, 300);
  }, [effectiveSelectedCategory, searchQuery, allImages, sortMode]);

  useEffect(() => {
    if (selectedCategory !== effectiveSelectedCategory) {
      syncListStateToUrl(effectiveSelectedCategory, searchQuery, sortMode);
    }
  }, [effectiveSelectedCategory, searchQuery, selectedCategory, sortMode, syncListStateToUrl]);

  const handleCategoryChange = (category: string) => {
    setLoading(true);
    setSelectedCategory(category);
    syncListStateToUrl(category, searchQuery, sortMode);
  };

  const handleSearchQueryChange = (value: string) => {
    setLoading(true);
    setSearchQuery(value);
    syncListStateToUrl(effectiveSelectedCategory, value, sortMode);
  };

  const handleSortModeChange = (value: SortMode) => {
    setLoading(true);
    setSortMode(value);
    syncListStateToUrl(effectiveSelectedCategory, searchQuery, value);
  };

  const detailReturnPath = buildListUrl(effectiveSelectedCategory, searchQuery, sortMode);

  useEffect(() => {
    sessionStorage.setItem(GALLERY_RETURN_PATH_STORAGE_KEY, detailReturnPath);
  }, [detailReturnPath]);

  const handleSearch = () => {
    syncListStateToUrl(effectiveSelectedCategory, searchQuery, sortMode);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 分类筛选区 */}
      <div className="bg-white border-b px-4 py-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-700">选择分类</span>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin">店主管理台</Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={effectiveSelectedCategory === category ? 'default' : 'outline'}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                effectiveSelectedCategory === category
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => handleCategoryChange(category)}
            >
              {category}
            </Button>
          ))}
        </div>
        {selectedGroup ? (
          <div className="mt-2 text-xs text-gray-500">
            <p>{selectedGroup.description}</p>
            <p>分组更新：{selectedGroup.updatedAt}</p>
          </div>
        ) : (
          <div className="mt-2 text-xs text-gray-500">
            最近更新时间：{latestUpdatedAt}
          </div>
        )}
      </div>

      {/* 搜索区 */}
      <div className="bg-white border-b px-4 py-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <Input
            type="text"
            placeholder="搜索图片名称..."
            className="min-w-48 flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={searchQuery}
            onChange={(e) => handleSearchQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
          <Button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            onClick={handleSearch}
          >
            搜索
          </Button>
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            value={sortMode}
            onChange={(e) => handleSortModeChange(e.target.value as SortMode)}
          >
            <option value="time-desc">时间（大到小）</option>
            <option value="time-asc">时间（小到大）</option>
            <option value="name-asc">名字（A-Z）</option>
            <option value="name-desc">名字（Z-A）</option>
            <option value="heat">热度</option>
          </select>
        </div>
      </div>

      {/* 图片展示区 */}
      <main className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-gray-600">加载中...</div>
            </div>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center text-gray-500">
              没有找到符合条件的图片
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredImages.map((image) => {
              const detailHref = `/gallery/${encodeURIComponent(image.id)}?from=${encodeURIComponent(detailReturnPath)}`;
              return (
              <Link key={image.id} href={detailHref}>
                <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
                  <div className="aspect-[3/4]">
                    <img
                      src={image.coverUrl}
                      alt={image.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3 min-h-22">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {image.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{image.uploadedAt}</p>
                    {image.status === 'sold-out' ? (
                      <p className="text-xs text-gray-400 mt-1">已售罄</p>
                    ) : null}
                    <p className="text-xs text-gray-400 mt-1">热度：{image.heat}</p>
                  </div>
                </Card>
              </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
