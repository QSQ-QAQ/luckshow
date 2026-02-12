'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  EMPTY_GALLERY_CONFIG,
  flattenGalleryImages,
  GalleryConfig,
  GalleryImageItem,
  getGalleryCategories,
  toSortableDateValue,
} from '@/lib/gallery';

type SortMode = 'time-desc' | 'time-asc' | 'name-asc' | 'name-desc' | 'heat';

const CLICK_STORAGE_KEY = 'gallery-click-counts';

export default function GalleryPage() {
  const [selectedCategory, setSelectedCategory] = useState('全部图片');
  const [searchQuery, setSearchQuery] = useState('');
  const [galleryConfig, setGalleryConfig] = useState<GalleryConfig>(EMPTY_GALLERY_CONFIG);
  const [filteredImages, setFilteredImages] = useState<GalleryImageItem[]>([]);
  const [allImages, setAllImages] = useState<GalleryImageItem[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('time-desc');
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const categories = getGalleryCategories(galleryConfig);

  const selectedGroup = galleryConfig.groups.find(
    (group) => group.category === selectedCategory
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
        const response = await fetch('/images/gallery.json', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as GalleryConfig;
        if (!mounted || !data?.groups) {
          return;
        }
        setGalleryConfig(data);
        setAllImages(flattenGalleryImages(data));
      } catch {
        if (!mounted) {
          return;
        }
        setGalleryConfig(EMPTY_GALLERY_CONFIG);
        setAllImages([]);
      }
    };

    loadGalleryConfig();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const rawValue = localStorage.getItem(CLICK_STORAGE_KEY);
    if (!rawValue) {
      return;
    }

    try {
      const parsed = JSON.parse(rawValue) as Record<string, number>;
      const mapped: Record<string, number> = {};
      for (const [id, count] of Object.entries(parsed)) {
        if (Number.isFinite(count)) {
          mapped[id] = count;
        }
      }
      setClickCounts(mapped);
    } catch {
      // 忽略本地存储异常
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CLICK_STORAGE_KEY, JSON.stringify(clickCounts));
  }, [clickCounts]);

  // 根据分类和搜索过滤图片
  useEffect(() => {
    setLoading(true);

    setTimeout(() => {
      let filtered = allImages;

      // 分类筛选
      if (selectedCategory !== '全部图片') {
        filtered = filtered.filter(img => img.category === selectedCategory);
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
          const leftHeat = clickCounts[leftImage.id] ?? 0;
          const rightHeat = clickCounts[rightImage.id] ?? 0;
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
  }, [selectedCategory, searchQuery, allImages, sortMode, clickCounts]);

  useEffect(() => {
    if (selectedCategory !== '全部图片' && !categories.includes(selectedCategory)) {
      setSelectedCategory('全部图片');
    }
  }, [categories, selectedCategory]);

  const handleSearch = () => {
    // 搜索按钮点击时触发，实际逻辑已经在 useEffect 中处理
  };

  const handleImageClick = (imageId: string) => {
    setClickCounts((previous) => ({
      ...previous,
      [imageId]: (previous[imageId] ?? 0) + 1,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 分类筛选区 */}
      <div className="bg-white border-b px-4 py-3 shadow-sm">
        <div className="mb-2">
          <span className="text-sm font-medium text-gray-700">选择分类</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => setSelectedCategory(category)}
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
            onChange={(e) => setSearchQuery(e.target.value)}
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
            onChange={(e) => setSortMode(e.target.value as SortMode)}
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
            {filteredImages.map((image) => (
              <Link
                key={image.id}
                href={`/gallery/${encodeURIComponent(image.id)}`}
                onClick={() => handleImageClick(image.id)}
              >
                <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="aspect-square">
                    <img
                      src={image.coverUrl}
                      alt={image.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {image.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{image.uploadedAt}</p>
                    {(clickCounts[image.id] ?? 0) >= 10 ? (
                      <p className="text-xs text-gray-400 mt-1">热度：{clickCounts[image.id] ?? 0}</p>
                    ) : null}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
