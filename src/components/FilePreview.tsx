import { FileText, Image, Video, Music, Archive, File } from "lucide-react";

interface FilePreviewProps {
  file: File;
  className?: string;
}

export const FilePreview = ({ file, className = "" }: FilePreviewProps) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    const type = file.type.toLowerCase();
    
    if (type.startsWith('image/')) return <Image className="w-8 h-8 text-primary" />;
    if (type.startsWith('video/')) return <Video className="w-8 h-8 text-primary" />;
    if (type.startsWith('audio/')) return <Music className="w-8 h-8 text-primary" />;
    if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return <Archive className="w-8 h-8 text-primary" />;
    if (type.includes('text') || type.includes('document')) return <FileText className="w-8 h-8 text-primary" />;
    
    return <File className="w-8 h-8 text-primary" />;
  };

  return (
    <div className={`flex items-center gap-4 p-4 bg-muted rounded-lg border-2 border-dashed border-card-border ${className}`}>
      {getFileIcon()}
      <div className="flex-1">
        <p className="font-medium text-card-foreground truncate">{file.name}</p>
        <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
        <p className="text-xs text-muted-foreground">{file.type || 'Unknown type'}</p>
      </div>
    </div>
  );
};