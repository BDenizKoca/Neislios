import React, { useState } from 'react';
import { ArrowDownTrayIcon, DocumentTextIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import { Watchlist } from '../../types/watchlist';
import { WatchlistItemWithDetails } from '../../hooks/useWatchlistItems';
import { exportToCsv, exportToJson, formatAsPlainText } from '../../utils/exportWatchlist';

interface ExportListModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: Watchlist;
  items: WatchlistItemWithDetails[];
}

export const ExportListModal: React.FC<ExportListModalProps> = ({
  isOpen,
  onClose,
  watchlist,
  items,
}) => {
  const [copiedText, setCopiedText] = useState(false);

  const handleCopyText = async () => {
    try {
      const text = formatAsPlainText(watchlist, items);
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      toast.success('Watchlist text copied to clipboard!');
      setTimeout(() => setCopiedText(false), 2500);
    } catch (err) {
      console.error('Failed to copy text:', err);
      toast.error('Failed to copy text');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-md"
      title="Export Watchlist"
      subtitle={`Export "${watchlist.title}" (${items.length} items)`}
      footer={
        <button onClick={onClose} className="btn-secondary w-full">
          Close
        </button>
      }
    >
      <div className="space-y-3">
        {/* Copy as Plain Text */}
        <button
          onClick={handleCopyText}
          className="w-full flex items-center justify-between p-4 glass-panel rounded-2xl hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-200/50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 shrink-0">
              {copiedText ? <CheckIcon className="w-5 h-5 text-emerald-500" /> : <ClipboardDocumentIcon className="w-5 h-5 text-red-500" />}
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-red-600 transition-colors">
                Copy as Plain Text
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formatted text list for Discord, WhatsApp, or Notes
              </p>
            </div>
          </div>
        </button>

        {/* Export CSV */}
        <button
          onClick={() => {
            exportToCsv(watchlist, items);
            toast.success('Downloaded CSV file!');
          }}
          className="w-full flex items-center justify-between p-4 glass-panel rounded-2xl hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-200/50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 shrink-0">
              <DocumentTextIcon className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-red-600 transition-colors">
                Export to CSV (.csv)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Spreadsheet format for Excel, Google Sheets, or Notion
              </p>
            </div>
          </div>
          <ArrowDownTrayIcon className="w-4 h-4 text-slate-400 shrink-0" />
        </button>

        {/* Export JSON */}
        <button
          onClick={() => {
            exportToJson(watchlist, items);
            toast.success('Downloaded JSON file!');
          }}
          className="w-full flex items-center justify-between p-4 glass-panel rounded-2xl hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-200/50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 shrink-0">
              <DocumentTextIcon className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-red-600 transition-colors">
                Export to JSON (.json)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Structured data file for developer backups
              </p>
            </div>
          </div>
          <ArrowDownTrayIcon className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      </div>
    </Modal>
  );
};

export default ExportListModal;
