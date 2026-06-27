import { X } from 'lucide-react';
import { getFileIcon, formatFileSize, isImageFile } from '../../utils/uploadChatFile';

export interface PendingFile {
  file: File;
  preview?: string;
}

interface Props {
  pendingFiles: PendingFile[];
  onRemove: (index: number) => void;
}

export function FileAttachmentPreview({ pendingFiles, onRemove }: Props) {
  if (pendingFiles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {pendingFiles.map((pf, i) => (
        <div key={i} className="relative group">
          {isImageFile(pf.file.type) && pf.preview ? (
            <div className="relative w-16 h-16">
              <img
                src={pf.preview}
                className="w-16 h-16 object-cover rounded-md border border-gray-200"
                alt={pf.file.name}
              />
              <button
                onClick={() => onRemove(i)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <div className="relative flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 max-w-[160px]">
              <span className="text-lg shrink-0">{getFileIcon(pf.file.type)}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{pf.file.name}</p>
                <p className="text-[10px] text-gray-400">{formatFileSize(pf.file.size)}</p>
              </div>
              <button
                onClick={() => onRemove(i)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
