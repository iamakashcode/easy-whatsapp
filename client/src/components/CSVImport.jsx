import { useState, useRef } from 'react';
import { ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function CSVImport({ onImport, onClose }) {
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await onImport(file);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Import Contacts from CSV</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {!result ? (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              CSV must have columns: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">name</code>,{' '}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">phone</code>{' '}
              (optional: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">tags</code>,{' '}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">notes</code>)
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 space-y-1">
              <p className="font-medium text-gray-600 dark:text-gray-300">Phone format</p>
              <p>Include the <strong>country code</strong> (e.g. <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">919599827881</code>). The{' '}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">+</code> is optional — we add it automatically. Spaces and dashes are fine too.</p>
              <p>Numbers already saved (or repeated in the file) are skipped automatically.</p>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer
                         hover:border-whatsapp-green hover:bg-whatsapp-green/5 transition-colors"
            >
              <ArrowUpTrayIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              {file ? (
                <p className="text-sm font-medium text-whatsapp-teal dark:text-whatsapp-green">{file.name}</p>
              ) : (
                <p className="text-sm text-gray-500">Click or drag & drop a CSV file</p>
              )}
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleImport} disabled={!file || loading} className="btn-primary flex-1">
                {loading ? 'Importing…' : 'Import'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">✓</span>
            </div>
            <p className="text-lg font-semibold">Import Complete</p>
            <p className="text-gray-500 mt-1">
              {result.imported} contact{result.imported === 1 ? '' : 's'} imported successfully
            </p>
            {result.skipped > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {result.skipped} skipped (duplicate in file or already saved)
              </p>
            )}
            <button onClick={onClose} className="btn-primary mt-4">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
