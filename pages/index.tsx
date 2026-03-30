TypeScript
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Folder, FileText, ChevronLeft, Upload, Plus, X, Loader2 } from 'lucide-react';

// PDF Viewer (Netlifyのビルドエラーを防ぐためダイナミックインポートが推奨されますが、まずは標準構成で)
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// Supabaseクライアント初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function NetlifyPDFManager() {
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      let folderQuery = supabase.from('folders').select('*');
      let fileQuery = supabase.from('files').select('*');

      if (currentFolderId) {
        folderQuery = folderQuery.eq('parent_id', currentFolderId);
        fileQuery = fileQuery.eq('folder_id', currentFolderId);
      } else {
        folderQuery = folderQuery.is('parent_id', null);
        fileQuery = fileQuery.is('folder_id', null);
      }

      const { data: fData } = await folderQuery.order('created_at', { ascending: false });
      const { data: flData } = await fileQuery.order('created_at', { ascending: false });

      setFolders(fData || []);
      setFiles(flData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [currentFolderId]);

  // アップロード処理 (Netlify Storageは使わず、Supabase Storageへ飛ばす)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileName = `${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(fileName, file);

    if (!uploadError) {
      await supabase.from('files').insert([{
        name: file.name,
        storage_path: fileName,
        folder_id: currentFolderId
      }]);
      fetchData();
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* ヘッダー */}
      <header className="bg-white border-b p-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentFolderId && (
            <button onClick={() => setCurrentFolderId(null)} className="p-1"><ChevronLeft /></button>
          )}
          <h1 className="font-bold text-lg">PDF Manager</h1>
        </div>
        {loading && <Loader2 className="animate-spin text-blue-500" size={20} />}
      </header>

      {/* リスト表示 */}
      <main className="p-4 space-y-3 flex-1 overflow-y-auto">
        {folders.map(f => (
          <div key={f.id} onClick={() => setCurrentFolderId(f.id)} 
            className="flex items-center p-4 bg-white rounded-xl shadow-sm border active:scale-[0.98] transition-transform">
            <Folder className="text-yellow-500 mr-3" fill="currentColor" />
            <span className="font-medium">{f.name}</span>
          </div>
        ))}

        {files.map(file => (
          <div key={file.id} 
            onClick={() => setSelectedPdfUrl(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pdfs/${file.storage_path}`)}
            className="flex items-center p-4 bg-white rounded-xl shadow-sm border active:scale-[0.98] transition-transform">
            <FileText className="text-red-500 mr-3" />
            <span className="text-sm truncate pr-2">{file.name}</span>
          </div>
        ))}
      </main>

      {/* モバイル用アクションボタン */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <button onClick={() => {
          const n = prompt("フォルダ名");
          if(n) supabase.from('folders').insert([{name: n, parent_id: currentFolderId}]).then(fetchData);
        }} className="w-12 h-12 bg-white border shadow-lg rounded-full flex items-center justify-center text-blue-600">
          <Plus />
        </button>
        <label className="w-14 h-14 bg-blue-600 shadow-xl rounded-full flex items-center justify-center text-white cursor-pointer">
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          <input type="file" hidden accept=".pdf" onChange={handleUpload} />
        </label>
      </div>

      {/* 閲覧モーダル */}
      {selectedPdfUrl && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="p-4 flex justify-end bg-gray-900"><button onClick={() => setSelectedPdfUrl(null)}><X className="text-white"/></button></div>
          <div className="flex-1 bg-white overflow-hidden">
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
              <Viewer fileUrl={selectedPdfUrl} plugins={[defaultLayoutPluginInstance]} />
            </Worker>
          </div>
        </div>
      )}
    </div>
  );
}
