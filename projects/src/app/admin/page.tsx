'use client';

import Link from 'next/link';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  EMPTY_GALLERY_CONFIG,
  flattenGalleryImages,
  GalleryConfig,
  GalleryImage,
  GalleryImageStatus,
  GALLERY_ADMIN_STORAGE_KEY,
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

const EMPTY_FORM: EditorForm = {
  id: '',
  name: '',
  category: '',
  uploadedAt: '',
  description: '',
  coverUrl: '',
  shotsText: '',
  status: 'on',
};

function getTodayText(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}/${month}/${day}`;
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
  const [baseConfig, setBaseConfig] = useState<GalleryConfig>(EMPTY_GALLERY_CONFIG);
  const [config, setConfig] = useState<GalleryConfig>(EMPTY_GALLERY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [form, setForm] = useState<EditorForm>(EMPTY_FORM);
  const [selectedImageId, setSelectedImageId] = useState('');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const images = useMemo(() => flattenGalleryImages(config), [config]);

  const loadConfig = async () => {
    const response = await fetch('/images/gallery.json', { cache: 'no-store' });
    if (!response.ok) {
      setBaseConfig(EMPTY_GALLERY_CONFIG);
      setConfig(EMPTY_GALLERY_CONFIG);
      return;
    }

    const data = (await response.json()) as GalleryConfig;
    const normalizedBase = normalizeGalleryConfig(data);
    setBaseConfig(normalizedBase);

    const raw = localStorage.getItem(GALLERY_ADMIN_STORAGE_KEY);
    if (!raw) {
      setConfig(normalizedBase);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as GalleryConfig;
      setConfig(normalizeGalleryConfig(parsed));
    } catch {
      setConfig(normalizedBase);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const authResponse = await fetch('/api/admin-auth', { cache: 'no-store' });
        if (!authResponse.ok) {
          setAuthenticated(false);
          setAuthChecked(true);
          return;
        }

        const authData = (await authResponse.json()) as { authenticated?: boolean };
        if (!mounted) {
          return;
        }

        const canManage = Boolean(authData.authenticated);
        setAuthenticated(canManage);
        setAuthChecked(true);
        if (!canManage) {
          return;
        }

        await loadConfig();
      } catch {
        if (!mounted) {
          return;
        }
        setAuthenticated(false);
        setAuthChecked(true);
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

  const handleLogin = async () => {
    if (!passcode.trim()) {
      setAuthMessage('请输入口令。');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passcode }),
      });

      if (!response.ok) {
        setAuthMessage('口令错误，请重试。');
        return;
      }

      setAuthenticated(true);
      setAuthMessage('');
      setPasscode('');
      await loadConfig();
    } catch {
      setAuthMessage('网络异常，请稍后重试。');
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin-auth', { method: 'DELETE' }).catch(() => undefined);
    setAuthenticated(false);
    setSelectedImageId('');
    setForm(EMPTY_FORM);
    setMessage('');
    setAuthMessage('已退出登录。');
  };

  const persistConfig = (nextConfig: GalleryConfig) => {
    const normalized = normalizeGalleryConfig(nextConfig);
    setConfig(normalized);
    localStorage.setItem(GALLERY_ADMIN_STORAGE_KEY, JSON.stringify(normalized, null, 2));
  };

  const editByImageId = (imageId: string) => {
    for (const group of config.groups) {
      const found = group.images.find((image) => image.id === imageId);
      if (found) {
        setSelectedImageId(imageId);
        setForm(toEditorForm(group.category, found));
        return;
      }
    }
  };

  const startNew = () => {
    setSelectedImageId('');
    setForm({
      ...EMPTY_FORM,
      id: `item-${Date.now()}`,
      uploadedAt: getTodayText(),
      category: config.groups[0]?.category ?? '',
    });
  };

  const saveForm = () => {
    if (!form.id.trim() || !form.name.trim() || !form.category.trim()) {
      setMessage('请先填写：商品编号、商品名称、分类。');
      return;
    }

    const image = formToImage(form);
    const nextGroups = config.groups
      .map((group) => ({
        ...group,
        images: group.images.filter((item) => item.id !== form.sourceImageId),
      }))
      .filter((group) => group.images.length > 0);

    const targetCategory = form.category.trim();
    const targetGroupIndex = nextGroups.findIndex((group) => group.category === targetCategory);
    if (targetGroupIndex >= 0) {
      nextGroups[targetGroupIndex] = {
        ...nextGroups[targetGroupIndex],
        updatedAt: getTodayText(),
        images: [image, ...nextGroups[targetGroupIndex].images.filter((item) => item.id !== image.id)],
      };
    } else {
      nextGroups.unshift({
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

    persistConfig(nextConfig);
    setSelectedImageId(image.id);
    setForm((previous) => ({ ...previous, sourceImageId: image.id }));
    setMessage('保存成功。');
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

    persistConfig({
      updatedAt: getTodayText(),
      groups: nextGroups,
    });

    if (selectedImageId === imageId) {
      setForm((previous) => ({ ...previous, status }));
    }
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `gallery-backup-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('已导出备份文件。');
  };

  const importConfig = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as GalleryConfig;
      const normalized = normalizeGalleryConfig(parsed);
      persistConfig(normalized);
      setMessage('导入成功。');
      setSelectedImageId('');
      setForm(EMPTY_FORM);
    } catch {
      setMessage('导入失败：文件格式不正确。');
    } finally {
      event.target.value = '';
    }
  };

  const resetToDefault = () => {
    localStorage.removeItem(GALLERY_ADMIN_STORAGE_KEY);
    setConfig(baseConfig);
    setSelectedImageId('');
    setForm(EMPTY_FORM);
    setMessage('已恢复默认数据。');
  };

  if (!authChecked || loading) {
    return <div className="p-6 text-sm">加载中...</div>;
  }

  if (!authenticated) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center p-4">
        <Card className="w-full p-4">
          <h1 className="text-lg font-semibold">店主管理台登录</h1>
          <p className="mt-2 text-sm text-muted-foreground">请输入口令后进入后台。</p>
          <div className="mt-4 space-y-3">
            <Input
              type="password"
              placeholder="请输入口令"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleLogin();
                }
              }}
            />
            <Button className="w-full" onClick={() => void handleLogin()}>进入管理台</Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">返回前台</Link>
            </Button>
            {authMessage ? <p className="text-sm text-destructive">{authMessage}</p> : null}
            <p className="text-xs text-muted-foreground">默认口令为 5201314，可通过环境变量 ADMIN_PASSCODE 修改。</p>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">店主管理台</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={startNew}>新增商品</Button>
          <Button variant="outline" onClick={exportConfig}>导出备份</Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>导入备份</Button>
          <Button variant="destructive" onClick={resetToDefault}>恢复默认</Button>
          <Button variant="outline" onClick={() => void handleLogout()}>退出登录</Button>
          <Button asChild>
            <Link href="/">返回前台</Link>
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={importConfig}
      />

      {message ? <p className="mb-3 text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.3fr,1fr]">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">商品列表（{images.length}）</h2>
          </div>
          <div className="max-h-[70vh] space-y-2 overflow-auto pr-1">
            {images.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => editByImageId(item.id)}
                  >
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.category} / {item.id}</p>
                  </button>
                  <span className="text-xs text-muted-foreground">{item.uploadedAt}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={item.status === 'on' ? 'default' : 'outline'} onClick={() => switchStatus(item.id, 'on')}>
                    上架
                  </Button>
                  <Button size="sm" variant={item.status === 'off' ? 'default' : 'outline'} onClick={() => switchStatus(item.id, 'off')}>
                    下架
                  </Button>
                  <Button size="sm" variant={item.status === 'sold-out' ? 'default' : 'outline'} onClick={() => switchStatus(item.id, 'sold-out')}>
                    售罄
                  </Button>
                </div>
              </div>
            ))}
            {images.length === 0 ? <p className="text-sm text-muted-foreground">暂无商品，请点击“新增商品”。</p> : null}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-medium">{selectedImageId ? '编辑商品' : '新增商品'}</h2>
          <div className="space-y-3">
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
            <Input
              placeholder="分类（必填）"
              value={form.category}
              onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}
            />
            <Input
              placeholder="日期，例如 2026/02/13"
              value={form.uploadedAt}
              onChange={(event) => setForm((previous) => ({ ...previous, uploadedAt: event.target.value }))}
            />
            <Input
              placeholder="封面图片 URL"
              value={form.coverUrl}
              onChange={(event) => setForm((previous) => ({ ...previous, coverUrl: event.target.value }))}
            />
            <Textarea
              placeholder="多图地址：一行一张"
              value={form.shotsText}
              onChange={(event) => setForm((previous) => ({ ...previous, shotsText: event.target.value }))}
            />
            <Textarea
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
            <Button className="w-full" onClick={saveForm}>保存商品</Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
