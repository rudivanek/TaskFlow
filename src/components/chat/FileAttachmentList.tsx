import { Download } from 'lucide-react';
import { getFileIcon, formatFileSize, isImageFile } from '../../utils/uploadChatFile';
import { FileAttachment } from '../../types';

interface Props {
  attachments: FileAttachment[];
}

export function FileAttachmentList({ attachments }: Props) {
  if (!attachments || attachments.length === 0) return null;

  const imageAttachments = attachments.filter(a => isImageFile(a.type));
  const fileAttachments = attachments.filter(a => !isImageFile(a.type));

  return (
    <div className="mt-2 flex flex-col gap-2">
      {imageAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imageAttachments.map((att, i) => (
            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
              <img
                src={att.url}
                alt={att.name}
                className="w-24 h-24 object-cover rounded-md border border-gray-200 hover:opacity-90 cursor-zoom-in transition-opacity"
              />
            </a>
          ))}
        </div>
      )}

      {fileAttachments.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {fileAttachments.map((att, i) => (
            <a
              key={i}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              download={att.name}
              className="flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 transition-colors group max-w-xs"
            >
              <span className="text-xl shrink-0">{getFileIcon(att.type)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 truncate">{att.name}</p>
                <p className="text-[10px] text-gray-400">{att.size > 0 ? formatFileSize(att.size) : ''}</p>
              </div>
              <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 shrink-0 transition-colors" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
