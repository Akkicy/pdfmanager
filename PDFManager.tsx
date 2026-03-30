TypeScript
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Folder, FileText, ChevronLeft, Upload, Plus, MoreVertical, Search, X } from 'lucide-react';

// PDF Viewer関連
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

export default function MobileOptimizedPDFManager() {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const fetchData = async () => {
    // 実際の実装では parent_id が null かどうかでルート判定
    const folderQuery = supabase.from('folders').select('*');
    const fileQuery = supabase.from('files').select('*');

    if (currentFolderId) {
      folderQuery.eq('parent_id', currentFolderId);
      fileQuery.eq('folder_id', currentFolderId);
    } else {
      folderQuery.is('parent_id', null);
      fileQuery.is('folder_id', null);
    }

    const { data: fData } = await folderQuery;
    const { data: flData } = await fileQuery;
    setFolders(fData || []);
    setFiles(flData || []);
  };

  useEffect(() => { fetchData(); }, [currentFolderId]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans">
      
      {/* --- ヘッダー（固定） --- */}
      <header className="sticky top-0 z-20 bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          {currentFolderId && (
            <button onClick={() => setCurrentFolderId(null)} className="p-1 -ml-1">
              <ChevronLeft size={24} className="text-blue-600" />
            </button>
          )}
          <h1 className="text-lg font-bold truncate">
            {currentFolderId ? "フォルダ内" : "マイストレージ"}
          </h1>
        </div>
        <Search size={20} className="text-gray-400" />
      </header>

      {/* --- メインコンテンツ（スクロール） --- */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="space-y-1">
          {/* フォルダセクション */}
          {folders.map(f => (
            <div 
              key={f.id} 
              onClick={() => setCurrentFolderId(f.id)}
              className="flex items-center p-3 bg-white border rounded-xl mb-2 active:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="bg-yellow-100 p-2 rounded-lg mr-4">
                <Folder size={24} className="text-yellow-500" fill="currentColor" />
              </div>
              <div className="flex-1 font-medium truncate">{f.name}</div>
              <MoreVertical size={18} className="text-gray-400" />
            </div>
          ))}

          {/* ファイルセクション */}
          {files.map(file => (
            <div 
              key={file.id} 
              onClick={() => setSelectedPdfUrl(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pdfs/${file.storage_path}`)}
              className="flex items-center p-3 bg-white border rounded-xl mb-2 active:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="bg-red-50 p-2 rounded-lg mr-4">
                <FileText size={24} className="text-red-500" />
              </div>
              <div className="flex-1 font-medium truncate text-sm">{file.name}</div>
              <MoreVertical size={18} className="text-gray-400" />
            </div>
          ))}

          {folders.length === 0 && files.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <p>ファイルはありません</p>
            </div>
          )}
        </div>
      </main>

      {/* --- フローティングアクションボタン (スマホ特有の操作) --- */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 items-end">
        {/* アップロードボタン */}
        <label className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg active:scale-95 transition-transform cursor-pointer">
          <Upload size={24} />
          <input type="file" accept=".pdf" hidden onChange={(e) => {/* アップロード処理 */}} />
        </label>
        
        {/* 新規フォルダボタン */}
        <button 
          onClick={() => {/* フォルダ作成処理 */}}
          className="flex items-center justify-center w-12 h-12 bg-white text-blue-600 border border-blue-100 rounded-full shadow-md active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* --- PDF全画面ビューア（スマホ対応） --- */}
      {selectedPdfUrl && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
            <span className="text-sm truncate pr-4">プレビュー</span>
            <button onClick={() => setSelectedPdfUrl(null)} className="p-1">
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 bg-white">
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
              <Viewer 
                fileUrl={selectedPdfUrl} 
                plugins={[defaultLayoutPluginInstance]}
                theme="dark" // スマホで見やすいようにダークテーマ設定も可能
              />
            </Worker>
          </div>
        </div>
      )}
    </div>
  );
}