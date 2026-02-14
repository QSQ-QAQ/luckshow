'use client';

import Link from 'next/link';
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  EMPTY_GALLERY_CONFIG,
  flattenGalleryImages,
  GalleryConfig,
  GalleryImage,
  GalleryImageStatus,
  normalizeDateString,
  normalizeGalleryConfig,
} from '@/lib/gallery';

type EditorForm = {
  sourceImageId?: string;
  id: string;
  name: string;
  category: string;
  uploadedAt: string;
  description: string;
  coverUrl: string;
  shotsText: string;
  status: GalleryImageStatus;
};

type LibraryImageItem = {
  name: string;
  url: string;
  modifiedAt?: number;
};

type LibrarySortMode = 'newest' | 'oldest' | 'name';

function getTodayText(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}/${month}/${day}`;
}

function createEmptyForm(defaultCategory = ''): EditorForm {
  return {
    id: '',
    name: '',
    category: defaultCategory,
    uploadedAt: getTodayText(),
    description: '',
    coverUrl: '',
    shotsText: '',
    status: 'on',
  };
}

function toEditorForm(category: string, image: GalleryImage): EditorForm {
  const shots = Array.isArray(image.shots) ? image.shots : [];
  return {
    sourceImageId: image.id,
    id: image.id,
    name: image.name,
    category,
    uploadedAt: normalizeDateString(image.uploadedAt),
    description: image.description ?? '',
    coverUrl: image.coverUrl ?? image.url ?? shots[0] ?? '',
    shotsText: shots.join('\n'),
    status: image.status ?? 'on',
  };
}

function formToImage(form: EditorForm): GalleryImage {
  const shots = form.shotsText
    .split(/\r?\n/)
    .map((text) => text.trim())
    .filter(Boolean);

  return {
    id: form.id.trim(),
    name: form.name.trim(),
    uploadedAt: normalizeDateString(form.uploadedAt.trim()),
    description: form.description.trim(),
    coverUrl: form.coverUrl.trim() || shots[0] || '',
    shots,
    status: form.status,
  };
}

export default function AdminPage() {
  const [config, setConfig] = useState<GalleryConfig>(EMPTY_GALLERY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<EditorForm>(createEmptyForm());
  const [selectedImageId, setSelectedImageId] = useState('');
  const [message, setMessage] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [inlineEditingCategory, setInlineEditingCategory] = useState('');
  const [inlineCategoryName, setInlineCategoryName] = useState('');
  const [dragArmedCategory, setDragArmedCategory] = useState('');
  const [draggingCategory, setDraggingCategory] = useState('');
  const [dragOverCategory, setDragOverCategory] = useState('');
  const [imageLibraryOpen, setImageLibraryOpen] = useState(false);
  const [showAllLibraryImages, setShowAllLibraryImages] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryUploading, setLibraryUploading] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [librarySortMode, setLibrarySortMode] = useState<LibrarySortMode>('newest');
  const [libraryImages, setLibraryImages] = useState<LibraryImageItem[]>([]);
  const [selectedLibraryUrls, setSelectedLibraryUrls] = useState<string[]>([]);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [saveErrorOpen, setSaveErrorOpen] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [unusedLibraryOpen, setUnusedLibraryOpen] = useState(false);
  const [unusedLibrarySearchQuery, setUnusedLibrarySearchQuery] = useState('');
  const [deletingImageUrl, setDeletingImageUrl] = useState('');
  const libraryUploadInputRef = useRef<HTMLInputElement | null>(null);
  const categoryLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const images = useMemo(() => flattenGalleryImages(config), [config]);
  const visibleImages = useMemo(() => {
    const query = productSearchQuery.trim().toLowerCase();
    return images.filter((item) => {
      if (selectedCategory && item.category !== selectedCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    });
  }, [images, productSearchQuery, selectedCategory]);
  const categorySummaries = useMemo(
    () => config.groups.map((group) => ({ category: group.category, count: group.images.length })),
    [config]
  );
  const formCategoryOptions = useMemo(() => {
    const categorySet = new Set(categorySummaries.map((item) => item.category));
    const currentCategory = form.category.trim();
    if (currentCategory) {
      categorySet.add(currentCategory);
    }
    return Array.from(categorySet);
  }, [categorySummaries, form.category]);
  const usedImageUrlSet = useMemo(() => {
    const usedUrls = new Set<string>();
    for (const group of config.groups) {
      for (const image of group.images) {
        if (image.coverUrl) {
          usedUrls.add(image.coverUrl);
        }
        if (image.url) {
          usedUrls.add(image.url);
        }
        for (const shot of image.shots ?? []) {
          usedUrls.add(shot);
        }
      }
    }
    return usedUrls;
  }, [config.groups]);

  const visibleLibraryImages = useMemo(() => {
    const query = librarySearchQuery.trim().toLowerCase();
    const sortItems = (inputItems: LibraryImageItem[]) => {
      const sortedItems = [...inputItems];
      if (librarySortMode === 'name') {
        sortedItems.sort((leftItem, rightItem) => leftItem.name.localeCompare(rightItem.name, 'zh-CN'));
        return sortedItems;
      }

      sortedItems.sort((leftItem, rightItem) => {
        const leftValue = leftItem.modifiedAt ?? 0;
        const rightValue = rightItem.modifiedAt ?? 0;
        return librarySortMode === 'newest' ? rightValue - leftValue : leftValue - rightValue;
      });
      return sortedItems;
    };

    if (showAllLibraryImages) {
      const filteredItems = libraryImages.filter((item) => {
        if (!query) {
          return true;
        }
        return item.name.toLowerCase().includes(query) || item.url.toLowerCase().includes(query);
      });
      return sortItems(filteredItems);
    }

    const filteredItems = libraryImages.filter((item) => {
      const available = !usedImageUrlSet.has(item.url) || selectedLibraryUrls.includes(item.url);
      if (!available) {
        return false;
      }
      if (!query) {
        return true;
      }
      return item.name.toLowerCase().includes(query) || item.url.toLowerCase().includes(query);
    });
    return sortItems(filteredItems);
  }, [libraryImages, librarySearchQuery, librarySortMode, selectedLibraryUrls, showAllLibraryImages, usedImageUrlSet]);

  const visibleUnusedLibraryImages = useMemo(() => {
    const query = unusedLibrarySearchQuery.trim().toLowerCase();
    const sortedItems = [...libraryImages].sort((leftItem, rightItem) => {
      const leftValue = leftItem.modifiedAt ?? 0;
      const rightValue = rightItem.modifiedAt ?? 0;
      return rightValue - leftValue;
    });

    return sortedItems.filter((item) => {
      if (usedImageUrlSet.has(item.url)) {
        return false;
      }
      if (!query) {
        return true;
      }
      return item.name.toLowerCase().includes(query) || item.url.toLowerCase().includes(query);
    });
  }, [libraryImages, unusedLibrarySearchQuery, usedImageUrlSet]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const response = await fetch('/api/gallery-config', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as GalleryConfig;
        if (!mounted) {
          return;
        }

        setConfig(normalizeGalleryConfig(data));
      } catch {
        if (!mounted) {
          return;
        }
        setConfig(EMPTY_GALLERY_CONFIG);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const persistConfig = async (nextConfig: GalleryConfig) => {
    const normalized = normalizeGalleryConfig(nextConfig);
    setConfig(normalized);

    const response = await fetch('/api/gallery-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalized),
    });

    if (!response.ok) {
      throw new Error('保存配置失败');
    }
  };

  const clearCategoryLongPress = () => {
    if (categoryLongPressTimerRef.current) {
      clearTimeout(categoryLongPressTimerRef.current);
      categoryLongPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (selectedCategory && !config.groups.some((group) => group.category === selectedCategory)) {
      setSelectedCategory(config.groups[0]?.category ?? '');
    }
  }, [selectedCategory, config.groups]);

  const editByImageId = (imageId: string) => {
    for (const group of config.groups) {
      const found = group.images.find((image) => image.id === imageId);
      if (found) {
        setSelectedCategory(group.category);
        setSelectedImageId(imageId);
        setForm(toEditorForm(group.category, found));
        return;
      }
    }
  };

  const saveForm = async () => {
    const targetId = form.id.trim();
    const targetName = form.name.trim();
    const targetCategory = form.category.trim();
    const sourceImageId = form.sourceImageId?.trim() ?? '';

    if (!targetId || !targetName || !targetCategory) {
      const reason = '请先填写：商品编号、商品名称、分类。';
      setMessage(reason);
      setSaveErrorMessage(reason);
      setSaveErrorOpen(true);
      return;
    }

    const hasDuplicateId = config.groups.some((group) =>
      group.images.some((item) => item.id === targetId && item.id !== sourceImageId)
    );
    if (hasDuplicateId) {
      const reason = `保存失败：商品编号“${targetId}”已存在，请更换编号。`;
      setMessage(reason);
      setSaveErrorMessage(reason);
      setSaveErrorOpen(true);
      return;
    }

    const sourceImage = config.groups
      .flatMap((group) => group.images)
      .find((item) => item.id === sourceImageId);
    const image = {
      ...formToImage(form),
      heat: sourceImage?.heat ?? 0,
    };
    const nextGroups = config.groups.map((group) => ({
      ...group,
      images: group.images.filter((item) => item.id !== form.sourceImageId),
    }));

    const targetGroupIndex = nextGroups.findIndex((group) => group.category === targetCategory);
    if (targetGroupIndex >= 0) {
      nextGroups[targetGroupIndex] = {
        ...nextGroups[targetGroupIndex],
        updatedAt: getTodayText(),
        images: [image, ...nextGroups[targetGroupIndex].images.filter((item) => item.id !== image.id)],
      };
    } else {
      nextGroups.push({
        category: targetCategory,
        description: `${targetCategory}商品`,
        updatedAt: getTodayText(),
        images: [image],
      });
    }

    const nextConfig: GalleryConfig = {
      updatedAt: getTodayText(),
      groups: nextGroups,
    };

    try {
      await persistConfig(nextConfig);
      setSelectedCategory(targetCategory);
      setSelectedImageId('');
      setForm({
        ...createEmptyForm(targetCategory),
        id: `item-${Date.now()}`,
      });
      setSaveSuccessOpen(true);
      setMessage('保存成功。');
    } catch {
      const reason = '保存失败：数据写入异常，请重试。';
      setMessage(reason);
      setSaveErrorMessage(reason);
      setSaveErrorOpen(true);
    }
  };

  const switchStatus = (imageId: string, status: GalleryImageStatus) => {
    const nextGroups = config.groups.map((group) => ({
      ...group,
      images: group.images.map((image) => {
        if (image.id !== imageId) {
          return image;
        }
        return {
          ...image,
          status,
        };
      }),
    }));

    void persistConfig({
      updatedAt: getTodayText(),
      groups: nextGroups,
    });

    if (selectedImageId === imageId) {
      setForm((previous) => ({ ...previous, status }));
    }
  };

  const addCategory = () => {
    const nextName = categoryName.trim();
    if (!nextName) {
      setMessage('请输入分类名称。');
      return;
    }

    if (config.groups.some((group) => group.category === nextName)) {
      setMessage('该分类已存在，请换一个名称。');
      return;
    }

    void persistConfig({
      updatedAt: getTodayText(),
      groups: [
        {
          category: nextName,
          description: `${nextName}商品`,
          updatedAt: getTodayText(),
          images: [],
        },
        ...config.groups,
      ],
    });

    setSelectedCategory(nextName);
    setCategoryName('');
    if (!form.category) {
      setForm((previous) => ({ ...previous, category: nextName }));
    }
    setMessage('分类添加成功。');
  };

  const startCategoryLongPress = (category: string) => {
    clearCategoryLongPress();
    categoryLongPressTimerRef.current = setTimeout(() => {
      setDragArmedCategory(category);
      setMessage(`已激活拖动：${category}，现在可以拖到新位置。`);
    }, 350);
  };

  const handleCategoryDragStart = (
    event: DragEvent<HTMLDivElement>,
    category: string
  ) => {
    if (dragArmedCategory !== category) {
      event.preventDefault();
      return;
    }
    setDraggingCategory(category);
    setDragOverCategory(category);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleCategoryDragOver = (
    event: DragEvent<HTMLDivElement>,
    category: string
  ) => {
    if (!draggingCategory) {
      return;
    }
    event.preventDefault();
    setDragOverCategory(category);
  };

  const handleCategoryDrop = (
    event: DragEvent<HTMLDivElement>,
    targetCategory: string
  ) => {
    event.preventDefault();
    if (!draggingCategory || draggingCategory === targetCategory) {
      return;
    }

    const fromIndex = config.groups.findIndex((group) => group.category === draggingCategory);
    const toIndex = config.groups.findIndex((group) => group.category === targetCategory);
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    const nextGroups = [...config.groups];
    const [movingGroup] = nextGroups.splice(fromIndex, 1);
    nextGroups.splice(toIndex, 0, movingGroup);

    void persistConfig({
      updatedAt: getTodayText(),
      groups: nextGroups,
    });

    setSelectedCategory(movingGroup.category);
    setDragArmedCategory('');
    setDraggingCategory('');
    setDragOverCategory('');
    setMessage('分类顺序已更新。');
  };

  const handleCategoryDragEnd = () => {
    clearCategoryLongPress();
    setDragArmedCategory('');
    setDraggingCategory('');
    setDragOverCategory('');
  };

  const startInlineRename = (sourceName: string) => {
    setInlineEditingCategory(sourceName);
    setInlineCategoryName(sourceName);
  };

  const saveInlineRename = (sourceName: string) => {
    const targetName = inlineCategoryName.trim();

    if (!targetName) {
      setMessage('请输入新的分类名称。');
      return;
    }
    if (sourceName === targetName) {
      setMessage('新分类名称与原名称相同。');
      return;
    }
    if (config.groups.some((group) => group.category === targetName)) {
      setMessage('新分类名称已存在，请换一个。');
      return;
    }

    const nextGroups = config.groups.map((group) => {
      if (group.category !== sourceName) {
        return group;
      }

      const defaultSourceDescription = `${sourceName}商品`;
      return {
        ...group,
        category: targetName,
        description: group.description === defaultSourceDescription ? `${targetName}商品` : group.description,
        updatedAt: getTodayText(),
      };
    });

    void persistConfig({
      updatedAt: getTodayText(),
      groups: nextGroups,
    });

    if (form.category === sourceName) {
      setForm((previous) => ({ ...previous, category: targetName }));
    }

    if (selectedCategory === sourceName) {
      setSelectedCategory(targetName);
    }
    setInlineEditingCategory('');
    setInlineCategoryName('');
    setMessage('分类名称已更新。');
  };

  const deleteCategoryByName = (sourceName: string) => {
    if (!sourceName) {
      setMessage('请先选择要删除的分类。');
      return;
    }

    const targetGroup = config.groups.find((group) => group.category === sourceName);
    if (!targetGroup) {
      setMessage('未找到该分类。');
      return;
    }

    const hasItems = targetGroup.images.length > 0;
    const confirmText = hasItems
      ? `分类“${sourceName}”下有 ${targetGroup.images.length} 个商品，删除后会一起移除，确定继续吗？`
      : `确定删除分类“${sourceName}”吗？`;

    if (!window.confirm(confirmText)) {
      return;
    }

    const nextGroups = config.groups.filter((group) => group.category !== sourceName);
    void persistConfig({
      updatedAt: getTodayText(),
      groups: nextGroups,
    });

    if (form.category === sourceName) {
      setForm((previous) => ({
        ...previous,
        category: nextGroups[0]?.category ?? '',
      }));
    }

    if (selectedCategory === sourceName) {
      setSelectedCategory(nextGroups[0]?.category ?? '');
    }
    if (inlineEditingCategory === sourceName) {
      setInlineEditingCategory('');
      setInlineCategoryName('');
    }
    setMessage(hasItems ? '分类及其商品已删除。' : '分类已删除。');
  };

  const loadLibraryImages = async () => {
    setLibraryLoading(true);
    try {
      const response = await fetch('/api/images', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('load-failed');
      }

      const data = (await response.json()) as { images?: LibraryImageItem[] };
      const mapped = Array.isArray(data.images)
        ? data.images
            .filter((item) => item?.url)
            .map((item) => ({ name: item.name, url: item.url, modifiedAt: item.modifiedAt }))
        : [];
      setLibraryImages(mapped);
    } catch {
      setLibraryImages([]);
      setMessage('图片库加载失败，请稍后重试。');
    } finally {
      setLibraryLoading(false);
    }
  };

  const openImageLibrary = async () => {
    const selected = [form.coverUrl.trim(), ...form.shotsText.split(/\r?\n/).map((text) => text.trim())]
      .filter(Boolean)
      .filter((item, index, list) => list.indexOf(item) === index);

    setSelectedLibraryUrls(selected);
    setShowAllLibraryImages(false);
    setLibrarySearchQuery('');
    setLibrarySortMode('newest');
    setImageLibraryOpen(true);
    await loadLibraryImages();
  };

  const openUnusedLibraryManager = async () => {
    setUnusedLibrarySearchQuery('');
    setUnusedLibraryOpen(true);
    await loadLibraryImages();
  };

  const toggleLibraryImage = (imageUrl: string) => {
    setSelectedLibraryUrls((previous) => {
      if (previous.includes(imageUrl)) {
        return previous.filter((item) => item !== imageUrl);
      }
      return [...previous, imageUrl];
    });
  };

  const applyLibrarySelection = () => {
    const nextCoverUrl = selectedLibraryUrls[0] ?? '';
    const nextShotsText = selectedLibraryUrls.join('\n');
    setForm((previous) => ({
      ...previous,
      coverUrl: nextCoverUrl,
      shotsText: nextShotsText,
    }));
    setImageLibraryOpen(false);
    setMessage('已应用图片选择：第一张作为封面。');
  };

  const uploadLibraryImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setLibraryUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          continue;
        }

        const result = (await response.json()) as { url?: string };
        if (result.url) {
          uploadedUrls.push(result.url);
        }
      }

      if (uploadedUrls.length > 0) {
        await loadLibraryImages();
        setSelectedLibraryUrls((previous) => {
          const merged = [...previous, ...uploadedUrls];
          return merged.filter((item, index, list) => list.indexOf(item) === index);
        });
        setMessage(`上传成功：${uploadedUrls.length} 张。`);
      } else {
        setMessage('上传失败，请检查文件后重试。');
      }
    } finally {
      setLibraryUploading(false);
      event.target.value = '';
    }
  };

  const deleteUnusedImage = async (imageUrl: string) => {
    if (!window.confirm('确定删除这张未使用图片吗？删除后不可恢复。')) {
      return;
    }

    setDeletingImageUrl(imageUrl);
    try {
      const response = await fetch('/api/images', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: imageUrl }),
      });

      if (!response.ok) {
        setMessage('删除失败，请稍后重试。');
        return;
      }

      setLibraryImages((previous) => previous.filter((item) => item.url !== imageUrl));
      setSelectedLibraryUrls((previous) => previous.filter((item) => item !== imageUrl));
      setMessage('图片已删除。');
    } finally {
      setDeletingImageUrl('');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm">加载中...</div>;
  }

  return (
    <>
    <main className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">店主管理台</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openUnusedLibraryManager}>图片库</Button>
          <Button asChild>
            <Link href="/">返回前台</Link>
          </Button>
        </div>
      </div>

      {message ? <p className="mb-3 text-sm text-muted-foreground">{message}</p> : null}

      <div className="space-y-4">
        <Card className="p-4">
          <div className="mb-4 rounded-lg border p-3">
            <h2 className="mb-3 text-sm font-medium">分类管理</h2>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {categorySummaries.map((item) => {
                  const isSelected = selectedCategory === item.category;
                  const isDragOver = dragOverCategory === item.category && draggingCategory !== item.category;
                  const isArmed = dragArmedCategory === item.category;
                  const isEditing = inlineEditingCategory === item.category;

                  return (
                    <div
                      key={item.category}
                      draggable={isArmed}
                      onPointerDown={() => startCategoryLongPress(item.category)}
                      onPointerUp={clearCategoryLongPress}
                      onPointerLeave={clearCategoryLongPress}
                      onPointerCancel={clearCategoryLongPress}
                      onDragStart={(event) => handleCategoryDragStart(event, item.category)}
                      onDragOver={(event) => handleCategoryDragOver(event, item.category)}
                      onDrop={(event) => handleCategoryDrop(event, item.category)}
                      onDragEnd={handleCategoryDragEnd}
                      onClick={() => setSelectedCategory(item.category)}
                      className={`h-32 rounded-lg border p-2.5 text-left select-none flex flex-col ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border'
                      } ${isDragOver ? 'border-primary border-dashed' : ''}`}
                    >
                      {isEditing ? (
                        <div className="h-8" onClick={(event) => event.stopPropagation()}>
                          <div className="h-8 flex items-center gap-1.5 overflow-hidden">
                          <Input
                            className="h-8 flex-1 min-w-0"
                            value={inlineCategoryName}
                            onChange={(event) => setInlineCategoryName(event.target.value)}
                            placeholder="输入新分类名"
                          />
                            <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" className="h-8 px-2" onClick={() => saveInlineRename(item.category)}>
                              保存
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                              onClick={() => {
                                setInlineEditingCategory('');
                                setInlineCategoryName('');
                              }}
                            >
                              取消
                            </Button>
                          </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-8 flex items-center">
                          <p className="text-sm font-medium truncate">📁 {item.category}</p>
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {isArmed ? '已激活拖动' : '长按后拖动排序'}
                      </p>

                      <div className="mt-auto flex items-end justify-between gap-2" onClick={(event) => event.stopPropagation()}>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startInlineRename(item.category)}
                          >
                            改名
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteCategoryByName(item.category)}
                          >
                            删除
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">商品数：{item.count}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="新增分类名称"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                />
                <Button variant="outline" onClick={addCategory}>添加分类</Button>
              </div>

            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium">
                商品列表（{selectedCategory ? `${selectedCategory} / ` : ''}{visibleImages.length}）
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedCategory('');
                  setProductSearchQuery('');
                }}
              >
                显示全部
              </Button>
            </div>

            <div className="mb-3 flex gap-2">
              <Input
                placeholder="搜索当前分类商品（名称或编号）"
                value={productSearchQuery}
                onChange={(event) => setProductSearchQuery(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {visibleImages.map((item) => (
                <div key={item.id} className="h-32 rounded-lg border p-2.5 flex flex-col">
                  <div className="h-8 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">🗂 {item.name}</p>
                    <span className="text-[11px] text-muted-foreground">{item.uploadedAt}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.id}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">{item.category}</p>

                  <div className="mt-auto flex items-end justify-between gap-2">
                    <Button size="sm" variant="outline" onClick={() => editByImageId(item.id)}>
                      编辑
                    </Button>
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                      value={item.status}
                      onChange={(event) => switchStatus(item.id, event.target.value as GalleryImageStatus)}
                    >
                      <option value="on">上架</option>
                      <option value="off">下架</option>
                      <option value="sold-out">售罄</option>
                    </select>
                  </div>
                </div>
              ))}

              {visibleImages.length === 0 ? (
                <p className="col-span-full text-sm text-muted-foreground">当前分类暂无匹配商品。</p>
              ) : null}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">{selectedImageId ? '编辑商品' : '新增商品'}</h2>
            <p className="text-xs text-muted-foreground">按“基础信息 → 图片素材 → 销售信息”填写</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
            <div className="space-y-3">
              <div className="rounded-lg border p-3">
                <h3 className="mb-2 text-sm font-medium">基础信息</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    placeholder="商品编号（必填）"
                    value={form.id}
                    onChange={(event) => setForm((previous) => ({ ...previous, id: event.target.value }))}
                  />
                  <Input
                    placeholder="商品名称（必填）"
                    value={form.name}
                    onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                  />
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={form.category}
                    onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}
                  >
                    <option value="" disabled>请选择分类（必填）</option>
                    {formCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="日期，例如 2026/02/13"
                    value={form.uploadedAt}
                    onChange={(event) => setForm((previous) => ({ ...previous, uploadedAt: event.target.value }))}
                  />
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <h3 className="mb-2 text-sm font-medium">图片素材</h3>
                <div className="space-y-2">
                  <Input
                    readOnly
                    placeholder="点击选择封面与多图（从图片库勾选）"
                    value={form.coverUrl}
                    onClick={openImageLibrary}
                  />
                  <Input
                    placeholder="或手动填写封面 URL"
                    value={form.coverUrl}
                    onChange={(event) => setForm((previous) => ({ ...previous, coverUrl: event.target.value }))}
                  />
                  <Textarea
                    className="min-h-24"
                    placeholder="多图地址：一行一张（也可通过图片库勾选）"
                    value={form.shotsText}
                    onChange={(event) => setForm((previous) => ({ ...previous, shotsText: event.target.value }))}
                  />
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <h3 className="mb-2 text-sm font-medium">销售信息</h3>
                <div className="space-y-2">
                  <Textarea
                    className="min-h-24"
                    placeholder="商品描述"
                    value={form.description}
                    onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                  />
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={form.status}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        status: event.target.value as GalleryImageStatus,
                      }))
                    }
                  >
                    <option value="on">上架</option>
                    <option value="off">下架</option>
                    <option value="sold-out">售罄</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border p-3">
                <h3 className="mb-2 text-sm font-medium">实时预览</h3>
                <div className="rounded-md border overflow-hidden bg-muted/30">
                  {form.coverUrl.trim() ? (
                    <img src={form.coverUrl.trim()} alt={form.name || 'preview'} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="h-40 w-full flex items-center justify-center text-xs text-muted-foreground">
                      暂无封面图
                    </div>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium truncate">{form.name || '未填写商品名'}</p>
                  <p className="text-xs text-muted-foreground truncate">编号：{form.id || '-'}</p>
                  <p className="text-xs text-muted-foreground truncate">分类：{form.category || '-'}</p>
                  <p className="text-xs text-muted-foreground truncate">状态：{form.status === 'on' ? '上架' : form.status === 'off' ? '下架' : '售罄'}</p>
                </div>
              </div>

              <div className="rounded-lg border p-3 space-y-2">
                <Button className="w-full" onClick={saveForm}>保存商品</Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedImageId('');
                    setForm({
                      ...createEmptyForm(selectedCategory || config.groups[0]?.category || ''),
                      id: `item-${Date.now()}`,
                    });
                  }}
                >
                  清空并新建
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </main>

    <Dialog open={imageLibraryOpen} onOpenChange={setImageLibraryOpen}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>图片库（已选 {selectedLibraryUrls.length} 张，第一张为封面）</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={showAllLibraryImages ? 'outline' : 'default'}
              onClick={() => setShowAllLibraryImages(false)}
            >
              未使用
            </Button>
            <Button
              size="sm"
              variant={showAllLibraryImages ? 'default' : 'outline'}
              onClick={() => setShowAllLibraryImages(true)}
            >
              全部图片
            </Button>
            <select
              className="h-8 rounded-md border bg-background px-2 text-xs"
              value={librarySortMode}
              onChange={(event) => setLibrarySortMode(event.target.value as LibrarySortMode)}
            >
              <option value="newest">最新优先</option>
              <option value="oldest">最旧优先</option>
              <option value="name">按名称</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedLibraryUrls([])}
              disabled={selectedLibraryUrls.length === 0}
            >
              清空已选
            </Button>
            <input
              ref={libraryUploadInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={uploadLibraryImages}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => libraryUploadInputRef.current?.click()}
              disabled={libraryUploading}
            >
              {libraryUploading ? '上传中...' : '上传图片'}
            </Button>
            <Button size="sm" variant="outline" onClick={loadLibraryImages} disabled={libraryLoading}>
              刷新
            </Button>
          </div>
        </div>

        <Input
          placeholder="搜索图片（文件名或地址）"
          value={librarySearchQuery}
          onChange={(event) => setLibrarySearchQuery(event.target.value)}
        />

        <div className="max-h-[55vh] overflow-auto rounded-lg border p-2">
          {libraryLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">图片库加载中...</p>
          ) : visibleLibraryImages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">当前没有可显示图片。</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {visibleLibraryImages.map((item) => {
                const orderIndex = selectedLibraryUrls.indexOf(item.url);
                const checked = orderIndex >= 0;

                return (
                  <button
                    key={item.url}
                    type="button"
                    onClick={() => toggleLibraryImage(item.url)}
                    className={`relative overflow-hidden rounded-md border text-left ${checked ? 'border-primary' : 'border-border'}`}
                  >
                    <img src={item.url} alt={item.name} className="h-28 w-full object-cover" loading="lazy" />
                    <div className="px-2 py-1">
                      <p className="truncate text-[11px] text-muted-foreground">{item.name}</p>
                    </div>
                    {checked ? (
                      <span className="absolute top-1 right-1 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                        {orderIndex + 1}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setImageLibraryOpen(false)}>取消</Button>
          <Button onClick={applyLibrarySelection}>应用到商品</Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={unusedLibraryOpen} onOpenChange={setUnusedLibraryOpen}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>图片库（仅未使用，可删除）</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <Input
            placeholder="搜索未使用图片（文件名或地址）"
            value={unusedLibrarySearchQuery}
            onChange={(event) => setUnusedLibrarySearchQuery(event.target.value)}
          />
          <Button size="sm" variant="outline" onClick={loadLibraryImages} disabled={libraryLoading}>
            刷新
          </Button>
        </div>

        <div className="max-h-[55vh] overflow-auto rounded-lg border p-2">
          {libraryLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">图片库加载中...</p>
          ) : visibleUnusedLibraryImages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">暂无未使用图片。</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {visibleUnusedLibraryImages.map((item) => (
                <div key={item.url} className="overflow-hidden rounded-md border">
                  <img src={item.url} alt={item.name} className="h-28 w-full object-cover" loading="lazy" />
                  <div className="p-2 space-y-2">
                    <p className="truncate text-[11px] text-muted-foreground">{item.name}</p>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full"
                      disabled={deletingImageUrl === item.url}
                      onClick={() => deleteUnusedImage(item.url)}
                    >
                      {deletingImageUrl === item.url ? '删除中...' : '删除'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setUnusedLibraryOpen(false)}>关闭</Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={saveSuccessOpen} onOpenChange={setSaveSuccessOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>保存成功</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">商品已保存，表单已自动清空，可继续新增下一个商品。</p>
        <div className="flex justify-end">
          <Button onClick={() => setSaveSuccessOpen(false)}>知道了</Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={saveErrorOpen} onOpenChange={setSaveErrorOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>保存失败</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{saveErrorMessage || '保存失败，请检查后重试。'}</p>
        <div className="flex justify-end">
          <Button onClick={() => setSaveErrorOpen(false)}>我知道了</Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
