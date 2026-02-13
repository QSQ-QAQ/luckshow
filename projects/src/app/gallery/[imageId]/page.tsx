'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  EMPTY_GALLERY_CONFIG,
  findGalleryImageById,
  GALLERY_ADMIN_STORAGE_KEY,
  GALLERY_CLICK_STORAGE_KEY,
  GalleryConfig,
  normalizeGalleryConfig,
} from '@/lib/gallery';

export default function GalleryDetailPage() {
  const params = useParams<{ imageId: string }>();
  const router = useRouter();
  const [galleryConfig, setGalleryConfig] = useState<GalleryConfig>(EMPTY_GALLERY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [activeUrl, setActiveUrl] = useState('');

  const imageId = decodeURIComponent(params.imageId ?? '');

  const currentImage = useMemo(
    () => findGalleryImageById(galleryConfig, imageId),
    [galleryConfig, imageId]
  );

  useEffect(() => {
    if (!imageId) {
      return;
    }

    try {
      const rawValue = localStorage.getItem(GALLERY_CLICK_STORAGE_KEY);
      const parsed = rawValue ? (JSON.parse(rawValue) as Record<string, number>) : {};
      const mapped: Record<string, number> = {};
      for (const [id, count] of Object.entries(parsed)) {
        if (Number.isFinite(count)) {
          mapped[id] = count;
        }
      }

      mapped[imageId] = (mapped[imageId] ?? 0) + 1;
      localStorage.setItem(GALLERY_CLICK_STORAGE_KEY, JSON.stringify(mapped));
    } catch {
      // 忽略本地存储异常
    }
  }, [imageId]);

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

        const normalized = normalizeGalleryConfig(data);
        const rawOverride = localStorage.getItem(GALLERY_ADMIN_STORAGE_KEY);
        let effectiveConfig = normalized;
        if (rawOverride) {
          try {
            effectiveConfig = normalizeGalleryConfig(JSON.parse(rawOverride) as GalleryConfig);
          } catch {
            effectiveConfig = normalized;
          }
        }

        setGalleryConfig(effectiveConfig);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadGalleryConfig();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentImage) {
      return;
    }
    setActiveUrl(currentImage.shots[0] || currentImage.coverUrl);
  }, [currentImage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        加载中...
      </div>
    );
  }

  if (!currentImage) {
    return (
      <div className="min-h-screen bg-black text-white px-4 py-6">
        <Button
          variant="outline"
          className="bg-white text-black hover:text-gray-500"
          onClick={() => router.back()}
        >
          返回
        </Button>
        <p className="mt-6 text-sm text-white/80">未找到该图片详情。</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="bg-white text-black hover:text-gray-500"
            onClick={() => router.back()}
          >
            返回
          </Button>
          <div className="text-right">
            <p className="text-sm font-medium">{currentImage.name}</p>
            <p className="text-xs text-white/70">上传日期：{currentImage.uploadedAt}</p>
            {currentImage.status === 'sold-out' ? (
              <p className="text-xs text-white/70">状态：已售罄</p>
            ) : null}
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        <div className="h-[72vh] w-full rounded-lg bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden">
          <img
            src={activeUrl || currentImage.coverUrl}
            alt={currentImage.name}
            className="max-h-full max-w-full object-contain"
          />
        </div>

        <section className="mt-4">
          {currentImage.shots.length <= 1 ? (
            <p className="mt-2 text-xs text-white/70">当前图片暂无其他方向照片。</p>
          ) : (
            <div className="mt-2 grid grid-cols-10 md:grid-cols-14 gap-1">
              {currentImage.shots.map((shotUrl, index) => (
                <button
                  key={`${shotUrl}-${index}`}
                  type="button"
                  onClick={() => setActiveUrl(shotUrl)}
                  className={`overflow-hidden rounded-md border aspect-[3/4] transition ${
                    activeUrl === shotUrl
                      ? 'border-2 border-white ring-2 ring-white/40'
                      : 'border-white/20 hover:border-white/50'
                  }`}
                >
                  <img
                    src={shotUrl}
                    alt={`${currentImage.name}-${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
