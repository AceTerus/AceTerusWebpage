import { useState, useEffect } from 'react';
import { SignInGate } from '@/components/SignInGate';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { FileUpload } from '@/components/FileUpload';
import { fetchMutualFollowIds } from '@/hooks/useMutualFollow';
import { useToast } from '@/hooks/use-toast';
import {
  FileText, Download, Trash2, User, Eye, File,
  FileSpreadsheet, Image as ImageIcon, Monitor, School,
} from 'lucide-react';
import { UploadLikeButton } from '@/components/UploadLikeButton';
import { UploadCommentSection } from '@/components/UploadCommentSection';

/* ── brand ── */
const C = {
  cyan: '#3BD6F5', blue: '#2F7CFF', indigo: '#2E2BE5',
  ink: '#0F172A', skySoft: '#DDF3FF', indigoSoft: '#D6D4FF',
};
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const CARD = 'border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white overflow-hidden';

interface Upload {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  download_count: number;
  rating: number;
  created_at: string;
  user_id: string;
  likes_count: number;
  comments_count: number;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

// ── File type helpers ─────────────────────────────────────────────────────────

type FileInfo = {
  label: string;
  color: string;
  bg: string;
  Icon: React.ElementType;
  canPreview: boolean;
  previewType: 'image' | 'pdf' | 'none';
};

const getFileInfo = (mimeType: string): FileInfo => {
  if (!mimeType) return { label: 'File', color: '#6b7280', bg: '#f3f4f6', Icon: File, canPreview: false, previewType: 'none' };

  if (mimeType === 'application/pdf')
    return { label: 'PDF', color: '#ef4444', bg: '#fef2f2', Icon: FileText, canPreview: true, previewType: 'pdf' };

  if (mimeType.includes('word') || mimeType === 'application/msword')
    return { label: 'Word', color: '#2563eb', bg: '#eff6ff', Icon: FileText, canPreview: false, previewType: 'none' };

  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return { label: 'PowerPoint', color: '#f97316', bg: '#fff7ed', Icon: Monitor, canPreview: false, previewType: 'none' };

  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return { label: 'Excel', color: '#16a34a', bg: '#f0fdf4', Icon: FileSpreadsheet, canPreview: false, previewType: 'none' };

  if (mimeType.startsWith('image/'))
    return { label: mimeType.split('/')[1].toUpperCase(), color: '#7c3aed', bg: '#f5f3ff', Icon: ImageIcon, canPreview: true, previewType: 'image' };

  if (mimeType === 'text/plain')
    return { label: 'Text', color: '#6b7280', bg: '#f9fafb', Icon: FileText, canPreview: false, previewType: 'none' };

  const ext = mimeType.split('/')[1]?.toUpperCase() ?? 'File';
  return { label: ext, color: '#6b7280', bg: '#f3f4f6', Icon: File, canPreview: false, previewType: 'none' };
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// ── File type badge ────────────────────────────────────────────────────────────

const FileTypeBadge = ({ mimeType }: { mimeType: string }) => {
  const { label, color, bg, Icon } = getFileInfo(mimeType);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border border-[#0F172A]/10"
      style={{ color, backgroundColor: bg }}
    >
      <Icon style={{ color }} className="h-3 w-3" />
      {label}
    </span>
  );
};

// ── Preview thumbnail inside the card ─────────────────────────────────────────

const InlinePreview = ({ upload, onPreview }: { upload: Upload; onPreview: () => void }) => {
  const { previewType, color, bg, Icon, label } = getFileInfo(upload.file_type);
  const [pdfFailed, setPdfFailed] = useState(false);

  if (previewType === 'image') {
    return (
      <div className="overflow-hidden border-b-[2.5px] border-[#0F172A]">
        <img
          src={upload.file_url}
          alt={upload.title}
          className="w-full max-h-44 object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  if (previewType === 'pdf') {
    if (!pdfFailed) {
      return (
        <button
          onClick={onPreview}
          className="relative w-full overflow-hidden border-b-[2.5px] border-[#0F172A] bg-white hover:opacity-95 transition-opacity group"
          style={{ height: '200px' }}
          aria-label="Preview PDF"
        >
          <iframe
            src={`${upload.file_url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            title={`Preview of ${upload.title}`}
            loading="lazy"
            className="absolute top-0 left-0 border-0 pointer-events-none"
            style={{
              width: '150%',
              height: '150%',
              transform: 'scale(0.667)',
              transformOrigin: 'top left',
            }}
            onError={() => setPdfFailed(true)}
          />
          <div className="absolute inset-0" />
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-[#0F172A] text-white text-[11px] px-2.5 py-1 rounded-full font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="w-3 h-3" /> Open preview
          </div>
          <div
            className="absolute top-2 left-2 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border border-[#0F172A]/10"
            style={{ color, backgroundColor: bg }}
          >
            <Icon className="h-3 w-3" style={{ color }} />
            PDF
          </div>
        </button>
      );
    }

    return (
      <button
        onClick={onPreview}
        className="w-full flex flex-col items-center justify-center gap-2 py-7 border-b-[2.5px] border-[#0F172A] hover:opacity-80 transition-opacity cursor-pointer"
        style={{ backgroundColor: `${bg}88` }}
      >
        <div
          className="flex items-center justify-center rounded-[14px] w-14 h-14 border-[2.5px] border-[#0F172A]/20 shadow-[2px_2px_0_0_#0F172A20]"
          style={{ backgroundColor: bg }}
        >
          <Icon className="h-7 w-7" style={{ color }} />
        </div>
        <span className="text-xs font-semibold" style={{ color }}>PDF · click to preview</span>
      </button>
    );
  }

  return (
    <div
      className="w-full flex flex-col items-center justify-center gap-3 py-8 border-b-[2.5px] border-[#0F172A]"
      style={{ backgroundColor: `${bg}88` }}
    >
      <div
        className="flex items-center justify-center rounded-[18px] w-16 h-16 border-[2.5px] border-[#0F172A]/20 shadow-[2px_2px_0_0_#0F172A20]"
        style={{ backgroundColor: bg }}
      >
        <Icon className="h-8 w-8" style={{ color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{label} document</span>
    </div>
  );
};

// ── Full-screen preview dialog ─────────────────────────────────────────────────

const PreviewDialog = ({
  upload,
  open,
  onClose,
}: {
  upload: Upload;
  open: boolean;
  onClose: () => void;
}) => {
  const { previewType, label } = getFileInfo(upload.file_type);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0 border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[5px_5px_0_0_#0F172A]">
        <DialogHeader className="px-6 py-4 border-b-[2.5px] border-[#0F172A] flex-shrink-0">
          <DialogTitle className={`${DISPLAY} font-extrabold text-base truncate`}>{upload.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {previewType === 'pdf' && (
            <iframe
              src={upload.file_url}
              title={upload.title}
              className="w-full h-full border-0"
            />
          )}
          {previewType === 'image' && (
            <div className="flex items-center justify-center h-full bg-slate-50 p-4">
              <img
                src={upload.file_url}
                alt={upload.title}
                className="max-w-full max-h-full object-contain rounded-xl shadow"
              />
            </div>
          )}
          {previewType === 'none' && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <File className="h-12 w-12 opacity-40" />
              <p className="text-sm font-semibold">No preview available for {label} files</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


// ── Main component ─────────────────────────────────────────────────────────────

export const Materials = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [previewUpload, setPreviewUpload] = useState<Upload | null>(null);

  useEffect(() => {
    document.title = "Classroom – AceTerus";
    return () => { document.title = "AceTerus – AI Tutor & Quiz Platform for Malaysian Students"; };
  }, []);
  useEffect(() => {
    fetchUploads();
  }, [user, showOnlyMine]);

  const fetchUploads = async () => {
    try {
      setIsLoading(true);

      let allowedIds: string[] = user ? [user.id] : [];
      if (user && !showOnlyMine) {
        const mutualIds = await fetchMutualFollowIds(user.id);
        allowedIds = [user.id, ...mutualIds];
      }

      let query = supabase
        .from('uploads')
        .select('*')
        .order('created_at', { ascending: false });

      if (showOnlyMine && user) {
        query = query.eq('user_id', user.id);
      } else if (allowedIds.length > 0) {
        query = query.in('user_id', allowedIds);
      }

      const { data: uploadsData, error } = await query;

      if (error) {
        console.error('Error fetching uploads:', error);
        setIsLoading(false);
        return;
      }

      if (!uploadsData || uploadsData.length === 0) {
        setUploads([]);
        setIsLoading(false);
        return;
      }

      const userIds = [...new Set(uploadsData.map(u => u.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      setUploads(uploadsData.map(upload => ({
        ...upload,
        profiles: profilesMap.get(upload.user_id) || null,
      })));
    } catch (error) {
      console.error('Error fetching uploads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUpload = async (uploadId: string) => {
    try {
      const { error } = await supabase.from('uploads').delete().eq('id', uploadId);
      if (error) throw error;
      setUploads(prev => prev.filter(u => u.id !== uploadId));
      toast({ title: 'Material deleted' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete material', variant: 'destructive' });
    }
  };

  const handleLikeChange = (uploadId: string, newCount: number) => {
    setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, likes_count: newCount } : u));
  };

  const handleCommentChange = (uploadId: string, newCount: number) => {
    setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, comments_count: newCount } : u));
  };

  const extractStoragePath = (fileUrl: string) => {
    try {
      const url = new URL(fileUrl);
      const prefix = '/storage/v1/object/public/user-uploads/';
      const idx = url.pathname.indexOf(prefix);
      if (idx === -1) return null;
      return decodeURIComponent(url.pathname.substring(idx + prefix.length));
    } catch {
      return null;
    }
  };

  const handleDownload = async (upload: Upload) => {
    try {
      const storagePath = extractStoragePath(upload.file_url);
      let blob: Blob | null = null;

      if (storagePath) {
        const { data, error } = await supabase.storage.from('user-uploads').download(storagePath);
        if (error || !data) throw error || new Error('Unable to download file');
        blob = data;
      } else {
        const response = await fetch(upload.file_url);
        if (!response.ok) throw new Error('Download failed');
        blob = await response.blob();
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const originalFileName = storagePath?.split('/').pop() || upload.file_url.split('/').pop() || upload.title;
      const fileName = originalFileName?.includes('_')
        ? originalFileName.substring(originalFileName.indexOf('_') + 1)
        : originalFileName;
      const extension = upload.file_type?.split('/')[1] || 'file';
      link.download = fileName || `${upload.title}.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      await supabase
        .from('uploads')
        .update({ download_count: (upload.download_count || 0) + 1 })
        .eq('id', upload.id);

      setUploads(prev =>
        prev.map(u => u.id === upload.id ? { ...u, download_count: (u.download_count || 0) + 1 } : u)
      );

      toast({ title: 'Download started', description: `Downloading ${upload.title}` });
    } catch {
      toast({ title: 'Download failed', description: 'Unable to download the file. Please try again.', variant: 'destructive' });
    }
  };

  if (!user) return <SignInGate message="Please sign in to view materials." />;

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 pt-8 pb-24 lg:pb-8 max-w-5xl">

        {/* ── Header ── */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-11 h-11 rounded-[14px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center shrink-0"
              style={{ background: C.blue }}
            >
              <School className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`${DISPLAY} font-extrabold text-3xl leading-tight`}>Classroom</h1>
              <p className="text-sm font-semibold text-slate-400">Class notes, materials, and more</p>
            </div>
          </div>
        </div>


        <div className="space-y-5">
          <div className="border-t-[2.5px] border-[#0F172A]/10 pt-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-[10px] border-[2px] border-[#0F172A] flex items-center justify-center bg-white">
                <FileText className="w-3.5 h-3.5 text-[#0F172A]" />
              </div>
              <p className={`${DISPLAY} font-extrabold text-lg text-[#0F172A]`}>Study Materials</p>
            </div>
          </div>
          <FileUpload onUploadCreated={fetchUploads} />

          {/* ── Filter toggle ── */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOnlyMine(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border-[2.5px] border-[#0F172A] transition-all shadow-[2px_2px_0_0_#0F172A] hover:shadow-[3px_3px_0_0_#0F172A] ${
                !showOnlyMine
                  ? 'text-white'
                  : 'bg-white text-[#0F172A]'
              }`}
              style={!showOnlyMine ? { background: C.indigo } : {}}
            >
              All Materials
            </button>
            <button
              onClick={() => setShowOnlyMine(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border-[2.5px] border-[#0F172A] transition-all shadow-[2px_2px_0_0_#0F172A] hover:shadow-[3px_3px_0_0_#0F172A] ${
                showOnlyMine
                  ? 'text-white'
                  : 'bg-white text-[#0F172A]'
              }`}
              style={showOnlyMine ? { background: C.indigo } : {}}
            >
              <User className="h-3.5 w-3.5" />
              Your Materials
            </button>
          </div>

          {/* ── Section header ── */}
          <div className="flex items-center justify-between">
            <p className={`${DISPLAY} font-extrabold text-lg`}>
              {showOnlyMine ? 'Your Materials' : 'All Materials'}
            </p>
            {!isLoading && (
              <span
                className="text-xs font-bold px-3 py-1 rounded-full border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]"
                style={{ background: C.skySoft, color: C.indigo }}
              >
                {uploads.length} {uploads.length === 1 ? 'file' : 'files'}
              </span>
            )}
          </div>

          {/* ── Grid ── */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={CARD}>
                  <Skeleton className="h-[120px] w-full rounded-none" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-2.5 w-28" />
                    <Skeleton className="h-2.5 w-full mt-2" />
                    <Skeleton className="h-7 w-24 mt-3 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : uploads.length === 0 ? (
            <div className={`${CARD} py-16 flex flex-col items-center gap-3 text-center px-6`}>
              <div
                className="w-14 h-14 rounded-[18px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center"
                style={{ background: C.skySoft }}
              >
                <FileText className="w-6 h-6" style={{ color: C.indigo }} />
              </div>
              <p className={`${DISPLAY} font-extrabold text-lg`}>No materials yet</p>
              <p className="text-sm font-semibold text-slate-400 max-w-xs">
                {showOnlyMine
                  ? 'Upload your first file using the panel above!'
                  : 'Materials are only visible from people who follow you back.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uploads.map((upload) => {
                const fileInfo = getFileInfo(upload.file_type);
                const sizeLabel = formatFileSize(upload.file_size);
                const isOwner = user && upload.user_id === user.id;

                return (
                  <div
                    key={upload.id}
                    className={`${CARD} flex flex-col`}
                  >
                    {/* Inline preview */}
                    <InlinePreview upload={upload} onPreview={() => setPreviewUpload(upload)} />

                    <div className="flex flex-col flex-1 p-4">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className={`${DISPLAY} font-extrabold text-[15px] leading-snug truncate mb-0.5`}>
                            {upload.title}
                          </h3>
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs font-semibold text-slate-400">
                            <span>
                              by{' '}
                              <Link
                                to={`/profile/${upload.user_id}`}
                                className="hover:underline font-bold text-[#0F172A]"
                              >
                                {upload.profiles?.username || 'Anonymous'}
                              </Link>
                            </span>
                            <span>·</span>
                            <span>{formatDistanceToNow(new Date(upload.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>

                        {isOwner && (
                          <button
                            className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-full border-[2px] border-[#0F172A] bg-white shadow-[1px_1px_0_0_#0F172A] hover:bg-red-50 hover:border-red-400 transition-colors"
                            onClick={() => deleteUpload(upload.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                          </button>
                        )}
                      </div>

                      {/* File type + size */}
                      <div className="flex items-center gap-2 mb-3">
                        <FileTypeBadge mimeType={upload.file_type} />
                        {sizeLabel && (
                          <span className="text-[11px] font-semibold text-slate-400">{sizeLabel}</span>
                        )}
                      </div>

                      {/* Description */}
                      {upload.description && (
                        <p className="text-xs text-slate-500 font-medium mb-3 line-clamp-2">
                          {upload.description}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-auto pt-3 border-t-[2px] border-[#0F172A]/10">
                        <div className="flex items-center gap-1">
                          <UploadLikeButton
                            uploadId={upload.id}
                            likesCount={upload.likes_count || 0}
                            onLikeChange={(n) => handleLikeChange(upload.id, n)}
                          />
                          <UploadCommentSection
                            uploadId={upload.id}
                            commentsCount={upload.comments_count || 0}
                            onCommentChange={(n) => handleCommentChange(upload.id, n)}
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          {fileInfo.canPreview && (
                            <button
                              className="flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-bold border-[2px] border-[#0F172A] bg-white shadow-[1px_1px_0_0_#0F172A] hover:shadow-[2px_2px_0_0_#0F172A] transition-shadow"
                              onClick={() => setPreviewUpload(upload)}
                            >
                              <Eye className="h-3 w-3" />
                              Preview
                            </button>
                          )}
                          <button
                            className="flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-bold text-white border-[2px] border-[#0F172A] shadow-[1px_1px_0_0_#0F172A] hover:shadow-[2px_2px_0_0_#0F172A] transition-shadow"
                            style={{ background: C.indigo }}
                            onClick={() => handleDownload(upload)}
                          >
                            <Download className="h-3 w-3" />
                            {upload.download_count > 0
                              ? `Download (${upload.download_count})`
                              : 'Download'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Full-screen preview dialog */}
      {previewUpload && (
        <PreviewDialog
          upload={previewUpload}
          open={!!previewUpload}
          onClose={() => setPreviewUpload(null)}
        />
      )}
    </div>
  );
};

export default Materials;
