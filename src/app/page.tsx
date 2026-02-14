import { Suspense } from 'react';
import { GalleryContent } from './gallery-content';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <div className="text-gray-600">加载中...</div>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GalleryContent />
    </Suspense>
  );
}
