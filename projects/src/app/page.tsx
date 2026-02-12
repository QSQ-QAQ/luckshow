'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

// 模拟图片数据
const mockImages = [
  { id: 1, name: '产品展示图1', category: '产品图', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop' },
  { id: 2, name: '团队合影', category: '团队照', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=400&fit=crop' },
  { id: 3, name: '办公环境1', category: '环境照', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop' },
  { id: 4, name: '产品展示图2', category: '产品图', url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop' },
  { id: 5, name: '办公环境2', category: '环境照', url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&h=400&fit=crop' },
  { id: 6, name: '活动照片', category: '活动照', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop' },
  { id: 7, name: '产品展示图3', category: '产品图', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop' },
  { id: 8, name: '团队照片2', category: '团队照', url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop' },
];

const categories = ['全部图片', '产品图', '团队照', '环境照', '活动照'];

export default function GalleryPage() {
  const [selectedCategory, setSelectedCategory] = useState('全部图片');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredImages, setFilteredImages] = useState(mockImages);
  const [loading, setLoading] = useState(false);

  // 根据分类和搜索过滤图片
  useEffect(() => {
    setLoading(true);

    // 模拟加载延迟
    setTimeout(() => {
      let filtered = mockImages;

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

      setFilteredImages(filtered);
      setLoading(false);
    }, 300);
  }, [selectedCategory, searchQuery]);

  const handleSearch = () => {
    // 搜索按钮点击时触发，实际逻辑已经在 useEffect 中处理
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
      </div>

      {/* 搜索区 */}
      <div className="bg-white border-b px-4 py-3 shadow-sm">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="搜索图片名称..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              <Card key={image.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="aspect-square">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {image.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{image.category}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
