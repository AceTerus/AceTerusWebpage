import { useState, useEffect } from 'react';
import { SignInGate } from '@/components/SignInGate';
import { createPortal } from 'react-dom';
import { ImageCropper } from '@/components/ImageCropper';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStreak } from '@/hooks/useStreak';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PostUpload } from '@/components/PostUpload';
import { PostImageCarousel } from '@/components/PostImageCarousel';
import { CommentSection } from '@/components/CommentSection';
import { LikeButton } from '@/components/LikeButton';
import { CommentPreview } from '@/components/CommentPreview';
import { UsersList } from '@/components/UsersList';
import { FollowButton } from '@/components/FollowButton';
import { useToast } from '@/hooks/use-toast';
import {
  Camera, Flame, Trash2, Users, Search, Lock,
  Settings, CheckCircle, XCircle, SkipForward, BarChart2,
  Zap, Target, PenLine, GraduationCap, MapPin, Plus,
  BookOpen, BookMarked, Compass, Award, Building2, Microscope, ShieldCheck,
} from 'lucide-react';
import { NotificationsBell } from '@/components/NotificationsBell';
import { SchoolPicker } from '@/components/SchoolPicker';
import type { SchoolResult } from '@/components/SchoolPicker';
import { useMutualFollow } from '@/hooks/useMutualFollow';
import { StreakLeaderboard } from '@/components/StreakLeaderboard';

/* ── brand ── */
const C = {
  cyan: '#3BD6F5', blue: '#2F7CFF', indigo: '#2E2BE5',
  ink: '#0F172A', skySoft: '#DDF3FF', indigoSoft: '#D6D4FF',
  pop: '#FF7A59', sun: '#FFD65C',
  mintSoft: '#D1FAE5', lavender: '#EDE9FE', peach: '#FFE4D6', lemon: '#FEF9C3', rose: '#FFE4E6',
};

const SCHOOL_TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  'SMK':                  { bg: '#DDF3FF',  color: '#2F7CFF' },
  'SMJK':                 { bg: '#E0F2FE',  color: '#0369a1' },
  'SBP':                  { bg: '#D6D4FF',  color: '#2E2BE5' },
  'MRSM':                 { bg: '#FEF3C7',  color: '#92400e' },
  'SAM':                  { bg: '#D1FAE5',  color: '#065f46' },
  'SABK':                 { bg: '#D1FAE5',  color: '#065f46' },
  'SK':                   { bg: '#F0FDF4',  color: '#16a34a' },
  'SJK(C)':               { bg: '#FFF7ED',  color: '#c2410c' },
  'SJK(T)':               { bg: '#FDF4FF',  color: '#7e22ce' },
  'Sekolah Swasta':       { bg: '#FFE4E6',  color: '#FF7A59' },
  'Sekolah Antarabangsa': { bg: '#FFE4D6',  color: '#FF7A59' },
  'Universiti Awam':      { bg: '#DBEAFE',  color: '#1D4ED8' },
  'Universiti Swasta':    { bg: '#EDE9FE',  color: '#6D28D9' },
  'Politeknik':           { bg: '#D1FAE5',  color: '#065f46' },
  'Kolej Komuniti':       { bg: '#FEF3C7',  color: '#92400e' },
  'Kolej Matrikulasi':    { bg: '#D6D4FF',  color: '#2E2BE5' },
};
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const CARD = 'border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white overflow-hidden';
const INPUT = 'w-full px-4 py-2.5 text-sm font-semibold border-[2px] border-[#0F172A] rounded-full shadow-[1px_1px_0_0_#0F172A] bg-white outline-none focus:shadow-[2px_2px_0_0_#0F172A] transition-shadow placeholder:text-slate-400';
const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 font-extrabold font-[\'Baloo_2\'] text-sm border-[2.5px] border-[#0F172A] rounded-full px-5 py-2.5 shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all text-white cursor-pointer disabled:opacity-50 disabled:pointer-events-none';
const BTN_OUTLINE = 'inline-flex items-center justify-center gap-2 font-extrabold font-[\'Baloo_2\'] text-sm border-[2.5px] border-[#0F172A] rounded-full px-5 py-2.5 shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all bg-white text-[#0F172A] cursor-pointer disabled:opacity-50 disabled:pointer-events-none';

/* ── school grade picker constants ── */
type EducationLevel = 'primary' | 'secondary' | 'preuni' | 'diploma' | 'degree' | 'postgrad';

interface LevelConfig {
  value: EducationLevel;
  label: string;
  sub: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: any;
  idleBg: string;
  idleColor: string;
  activeBg: string;
  activeShadow: string;
}

const EDUCATION_LEVELS: LevelConfig[] = [
  { value: 'primary',   label: 'Primary',    sub: 'Std 1 – 6',   Icon: BookOpen,      idleBg: '#F0FDF4', idleColor: '#16a34a', activeBg: '#16a34a', activeShadow: '#14532d' },
  { value: 'secondary', label: 'Secondary',  sub: 'Form 1 – 5',  Icon: BookMarked,    idleBg: '#DDF3FF', idleColor: '#2F7CFF', activeBg: '#2F7CFF', activeShadow: '#1D4ED8' },
  { value: 'preuni',    label: 'Pre-U',      sub: 'Form 6 / Found.', Icon: Compass,   idleBg: '#D6D4FF', idleColor: '#2E2BE5', activeBg: '#2E2BE5', activeShadow: '#1e1b8e' },
  { value: 'diploma',   label: 'Diploma',    sub: 'Year 1 – 3',  Icon: Award,         idleBg: '#FEF3C7', idleColor: '#d97706', activeBg: '#d97706', activeShadow: '#92400e' },
  { value: 'degree',    label: 'Degree',     sub: 'Year 1 – 5',  Icon: Building2,     idleBg: '#E0F2FE', idleColor: '#0369a1', activeBg: '#0369a1', activeShadow: '#075985' },
  { value: 'postgrad',  label: 'Postgrad',   sub: "Master's / PhD", Icon: Microscope, idleBg: '#EDE9FE', idleColor: '#6D28D9', activeBg: '#6D28D9', activeShadow: '#4C1D95' },
];

const LEVEL_ORDER: Record<string, number> = {
  primary: 1, secondary: 2, preuni: 3, diploma: 4, degree: 5, postgrad: 6,
};

const YEAR_OPTIONS: Record<EducationLevel, string[]> = {
  primary:   ['Standard 1','Standard 2','Standard 3','Standard 4','Standard 5','Standard 6'],
  secondary: ['Form 1','Form 2','Form 3','Form 4','Form 5'],
  preuni:    ['Form 6 (Lower)','Form 6 (Upper)','Foundation','Matrikulasi'],
  diploma:   ['Diploma Year 1','Diploma Year 2','Diploma Year 3'],
  degree:    ['Degree Year 1','Degree Year 2','Degree Year 3','Degree Year 4','Degree Year 5'],
  postgrad:  ["Master's",'PhD'],
};

const YEAR_PILL_LABEL: Record<EducationLevel, (g: string) => string> = {
  primary:   g => g.replace('Standard ', 'Std '),
  secondary: g => g,
  preuni:    g => g.replace('Form 6 (Lower)', 'Form 6 Lower').replace('Form 6 (Upper)', 'Form 6 Upper'),
  diploma:   g => g.replace('Diploma ', ''),
  degree:    g => g.replace('Degree ', ''),
  postgrad:  g => g,
};

function deriveLevelFromGrade(grade: string): EducationLevel | '' {
  if (!grade) return '';
  if (grade.startsWith('Standard')) return 'primary';
  if (/^Form [1-5]$/.test(grade)) return 'secondary';
  if (grade.startsWith('Form 6') || grade === 'Foundation' || grade === 'Matrikulasi') return 'preuni';
  if (grade.startsWith('Diploma')) return 'diploma';
  if (grade.startsWith('Degree')) return 'degree';
  if (grade === "Master's" || grade === 'PhD') return 'postgrad';
  return '';
}

function schoolDBLevel(grade: string) {
  if (!grade) return undefined;
  if (grade.startsWith('Standard')) return 'primary';
  if (grade.startsWith('Form')) return 'secondary';
  return 'tertiary';
}

function schoolTypeFilter(grade: string): string[] | undefined {
  if (!grade) return undefined;
  if (grade.startsWith('Standard'))
    return ['SK','SJK(C)','SJK(T)','Sekolah Swasta','Sekolah Antarabangsa'];
  if (grade === 'Form 6 (Lower)' || grade === 'Form 6 (Upper)')
    return ['SMK','SBP','MRSM','Sekolah Swasta','Lain-lain'];
  if (grade.startsWith('Form'))
    return ['SMK','SMJK','SBP','MRSM','SAM','SABK','Sekolah Swasta','Sekolah Antarabangsa','Lain-lain'];
  if (grade === 'Foundation' || grade === 'Matrikulasi')
    return ['Universiti Awam','Universiti Swasta','Kolej Matrikulasi'];
  return ['Universiti Awam','Universiti Swasta','Politeknik','Kolej Komuniti','Kolej Swasta'];
}

function streamOptions(grade: string): string[] {
  if (!grade) return [];
  if (grade.startsWith('Standard') || ['Form 1','Form 2','Form 3'].includes(grade)) return [];
  if (grade === 'Form 4' || grade === 'Form 5')
    return ['Science','Arts','Commerce','Technical','Vocational','Agama (Religious)'];
  if (grade.startsWith('Form 6'))
    return ['Science (Sains)','Arts (Sastera)','Accounting (Perakaunan)'];
  if (grade === 'Foundation' || grade === 'Matrikulasi')
    return ['Sciences','Social Science','Engineering','Business'];
  return ['Engineering','Computer Science','Business','Medicine','Dentistry','Pharmacy','Law','Education','Architecture','Science','Arts & Humanities','Nursing','Social Science'];
}

interface Post {
  id: string;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  tags: string[];
  images?: { id: string; file_url: string }[];
}

interface StudentSchool {
  id: string;
  school_id: string | null;
  school_name: string | null;
  grade: string | null;
  curricular: string | null;
  school_type: string | null;
  school_location: string | null;
  class_name: string | null;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean;
  schools?: SchoolResult | null;
}

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
}

export const Profile = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { streak } = useStreak();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [avatarBlob, setAvatarBlob]       = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverBlob, setCoverBlob]         = useState<Blob | null>(null);
  const [coverPreview, setCoverPreview]   = useState<string | null>(null);
  const [cropSrc, setCropSrc]             = useState<string | null>(null);
  const [cropTarget, setCropTarget]       = useState<'avatar' | 'cover-edit' | 'cover-live' | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lightboxPostId, setLightboxPostId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isQuizHistoryOpen, setIsQuizHistoryOpen] = useState(false);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [quizHistoryLoading, setQuizHistoryLoading] = useState(false);
  const [isFollowersOpen, setIsFollowersOpen] = useState(false);
  const [isFollowingOpen, setIsFollowingOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [schoolEntries, setSchoolEntries] = useState<StudentSchool[]>([]);
  const [isSchoolDialogOpen, setIsSchoolDialogOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [schoolForm, setSchoolForm] = useState({ educationLevel: '' as EducationLevel | '', grade: '', curricular: '', class_name: '', start_year: '', end_year: '', is_current: false });
  const [selectedSchool, setSelectedSchool] = useState<SchoolResult | null>(null);
  const [isSavingSchool, setIsSavingSchool] = useState(false);

  const profileUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const { isMutual, isLoading: isMutualLoading } = useMutualFollow(
    isOwnProfile ? undefined : profileUserId
  );

  useEffect(() => {
    if (profileUserId) {
      fetchProfile();
      fetchPosts();
      fetchFollowers();
      fetchFollowing();
      fetchSchoolInfo();
    }
  }, [profileUserId]);

  useEffect(() => {
    const name = profile?.username;
    document.title = name ? `${name} – AceTerus` : "Profile – AceTerus";
    return () => { document.title = "AceTerus – AI Tutor & Quiz Platform for Malaysian Students"; };
  }, [profile?.username]);

  const fetchProfile = async () => {
    if (!profileUserId) return;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', profileUserId).single();
      if (error && error.code !== 'PGRST116') { console.error(error); return; }
      if (!data) {
        if (!user || profileUserId !== user.id) return;
        const { data: newProfile, error: createError } = await supabase.from('profiles')
          .insert({ user_id: profileUserId, username: user.email?.split('@')[0] || 'Anonymous' })
          .select().single();
        if (createError) { console.error(createError); return; }
        setProfile(newProfile as unknown as Profile);
      } else {
        setProfile(data as unknown as Profile);
        setEditUsername(data.username || '');
        setEditBio(data.bio || '');
      }
    } catch (e) { console.error(e); }
  };

  const handleUpdateProfile = async () => {
    if (!user || !profile) return;
    setIsUpdating(true);
    try {
      let avatarUrl = profile.avatar_url;
      if (avatarBlob) {
        const filePath = `${user.id}/avatar_${Date.now()}.jpg`;
        const { error } = await supabase.storage.from('profile-images').upload(filePath, avatarBlob, { upsert: true, contentType: 'image/jpeg' });
        if (error) throw error;
        avatarUrl = supabase.storage.from('profile-images').getPublicUrl(filePath).data.publicUrl;
      }
      let coverUrl = profile.cover_url;
      if (coverBlob) {
        const filePath = `${user.id}/cover_${Date.now()}.jpg`;
        const { error } = await supabase.storage.from('profile-images').upload(filePath, coverBlob, { upsert: true, contentType: 'image/jpeg' });
        if (error) throw error;
        coverUrl = supabase.storage.from('profile-images').getPublicUrl(filePath).data.publicUrl;
      }
      const { error } = await (supabase.from('profiles') as any).update({ username: editUsername, bio: editBio, avatar_url: avatarUrl, cover_url: coverUrl }).eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Profile updated!' });
      setIsEditDialogOpen(false);
      setAvatarBlob(null); setAvatarPreview(null);
      setCoverBlob(null);  setCoverPreview(null);
      fetchProfile();
    } catch {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' });
    } finally { setIsUpdating(false); }
  };

  const handleCropConfirm = async (blob: Blob, previewUrl: string) => {
    if (cropTarget === 'avatar') {
      setAvatarBlob(blob); setAvatarPreview(previewUrl);
      setCropSrc(null); setCropTarget(null);
      setIsEditDialogOpen(true);
      toast({ title: 'Photo ready', description: 'Click Save Changes to apply it to your profile.' });
    } else if (cropTarget === 'cover-edit') {
      setCoverBlob(blob); setCoverPreview(previewUrl);
      setCropSrc(null); setCropTarget(null);
      setIsEditDialogOpen(true);
      toast({ title: 'Cover ready', description: 'Click Save Changes to apply it to your profile.' });
    } else if (cropTarget === 'cover-live' && user) {
      const filePath = `${user.id}/cover_${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('profile-images').upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });
      if (error) {
        toast({ title: 'Upload failed', description: 'Could not save cover photo. Please try again.', variant: 'destructive' });
      } else {
        const publicUrl = supabase.storage.from('profile-images').getPublicUrl(filePath).data.publicUrl;
        await (supabase.from('profiles') as any).update({ cover_url: publicUrl }).eq('user_id', user.id);
        setProfile(prev => prev ? { ...prev, cover_url: publicUrl } : prev);
        toast({ title: 'Cover photo updated!', description: 'Your new cover photo is live.' });
      }
      setCropSrc(null); setCropTarget(null);
    }
  };

  const fetchFollowers = async () => {
    if (!profileUserId) return;
    const { data } = await supabase.from('follows').select('follower_id').eq('followed_id', profileUserId);
    setFollowers(data?.map(f => f.follower_id) || []);
  };

  const fetchFollowing = async () => {
    if (!profileUserId) return;
    const { data } = await supabase.from('follows').select('followed_id').eq('follower_id', profileUserId);
    setFollowing(data?.map(f => f.followed_id) || []);
  };

  const fetchPosts = async () => {
    if (!profileUserId) return;
    try {
      const { data: postsData, error } = await supabase.from('posts').select('*').eq('user_id', profileUserId).order('created_at', { ascending: false });
      if (error) { console.error(error); return; }
      const basePosts = postsData || [];
      const postIds = basePosts.map((p) => p.id);
      const imagesByPost = new Map<string, { id: string; file_url: string }[]>();
      if (postIds.length > 0) {
        const { data: imagesData } = await supabase.from('post_images').select('id, post_id, file_url, position').in('post_id', postIds).order('position', { ascending: true });
        (imagesData || []).forEach((img: any) => {
          const arr = imagesByPost.get(img.post_id) || [];
          arr.push({ id: img.id, file_url: img.file_url });
          imagesByPost.set(img.post_id, arr);
        });
      }
      setPosts(basePosts.map((post: any) => ({ ...post, images: imagesByPost.get(post.id) || [] })));
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const { data } = await supabase.from('profiles').select('*').ilike('username', `%${query}%`).neq('user_id', user?.id || '').limit(10);
      setSearchResults((data || []) as unknown as Profile[]);
    } catch (e) { console.error(e); }
    finally { setIsSearching(false); }
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) { toast({ title: 'Error', description: 'Failed to delete post', variant: 'destructive' }); return; }
    setPosts(posts.filter(p => p.id !== postId));
    toast({ title: 'Post deleted' });
  };

  const openLightbox = (postId: string, index: number) => { setLightboxPostId(postId); setLightboxIndex(index); };
  const closeLightbox = () => setLightboxPostId(null);

  const showPrev = () => {
    const post = posts.find((p) => p.id === lightboxPostId);
    if (!post?.images?.length) return;
    setLightboxIndex((prev) => prev === 0 ? post.images!.length - 1 : prev - 1);
  };
  const showNext = () => {
    const post = posts.find((p) => p.id === lightboxPostId);
    if (!post?.images?.length) return;
    setLightboxIndex((prev) => prev === post.images!.length - 1 ? 0 : prev + 1);
  };
  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (diff > 50) showPrev(); else if (diff < -50) showNext();
    setTouchStartX(null);
  };

  const fetchSchoolInfo = async () => {
    if (!profileUserId) return;
    const { data } = await (supabase.from('student_schools') as any)
      .select('*, schools(id, name, type, level, state, district, city)')
      .eq('user_id', profileUserId)
      .order('created_at', { ascending: true });
    setSchoolEntries((data as StudentSchool[]) ?? []);
  };

  const openAddEntry = () => {
    setEditingEntryId(null);
    setSchoolForm({ educationLevel: '', grade: '', curricular: '', class_name: '', start_year: '', end_year: '', is_current: false });
    setSelectedSchool(null);
    setIsSchoolDialogOpen(true);
  };

  const openEditEntry = (entry: StudentSchool) => {
    setEditingEntryId(entry.id);
    setSchoolForm({
      educationLevel: deriveLevelFromGrade(entry.grade ?? ''),
      grade: entry.grade ?? '',
      curricular: entry.curricular ?? '',
      class_name: entry.class_name ?? '',
      start_year: entry.start_year ? String(entry.start_year) : '',
      end_year: entry.end_year ? String(entry.end_year) : '',
      is_current: entry.is_current ?? false,
    });
    setSelectedSchool(entry.schools ?? null);
    setIsSchoolDialogOpen(true);
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const { error } = await (supabase.from('student_schools') as any).delete().eq('id', id);
      if (error) throw error;
      setSchoolEntries(prev => prev.filter(e => e.id !== id));
      toast({ title: 'Education entry removed.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleSaveSchool = async () => {
    if (!user) return;
    if (!selectedSchool) { toast({ title: 'Please select a school', variant: 'destructive' }); return; }
    if (schoolForm.is_current && !schoolForm.grade) { toast({ title: 'Please select your year / grade', variant: 'destructive' }); return; }
    setIsSavingSchool(true);
    try {
      const payload = {
        user_id: user.id,
        school_id: selectedSchool.id,
        school_name: selectedSchool.name,
        school_type: selectedSchool.type,
        school_location: selectedSchool.city ? `${selectedSchool.city}, ${selectedSchool.state}` : selectedSchool.state,
        grade: schoolForm.grade || null,
        curricular: schoolForm.curricular || null,
        class_name: schoolForm.class_name || null,
        start_year: schoolForm.start_year ? Number(schoolForm.start_year) : null,
        end_year: schoolForm.is_current ? null : (schoolForm.end_year ? Number(schoolForm.end_year) : null),
        is_current: schoolForm.is_current,
      };
      // If marking as current, clear is_current on all other entries first
      if (schoolForm.is_current) {
        const clearQuery = (supabase.from('student_schools') as any).update({ is_current: false }).eq('user_id', user.id);
        const { error: clearErr } = editingEntryId ? await clearQuery.neq('id', editingEntryId) : await clearQuery;
        if (clearErr) throw clearErr;
      }
      if (editingEntryId) {
        const { error } = await (supabase.from('student_schools') as any).update(payload).eq('id', editingEntryId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('student_schools') as any).insert(payload);
        if (error) throw error;
      }
      toast({ title: editingEntryId ? 'Education updated!' : 'Education added!' });
      setIsSchoolDialogOpen(false);
      fetchSchoolInfo();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to save', variant: 'destructive' });
    } finally { setIsSavingSchool(false); }
  };

  const fetchQuizHistory = async () => {
    if (!user) return;
    setQuizHistoryLoading(true);
    const { data, error } = await supabase.from('quiz_performance_results' as any).select('*').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(50);
    if (!error) setQuizHistory(data ?? []);
    setQuizHistoryLoading(false);
  };

  if (!user) return <SignInGate message="Please sign in to view your profile." />;

  // ── school dialog derived values ──
  const activeEduLevel = schoolForm.educationLevel as EducationLevel | '';
  const curLevelFromEdu = activeEduLevel === 'primary' ? 'primary'
    : activeEduLevel === 'secondary' || activeEduLevel === 'preuni' ? 'secondary'
    : activeEduLevel ? 'tertiary'
    : undefined;
  const curLevel      = schoolForm.grade ? schoolDBLevel(schoolForm.grade) : curLevelFromEdu;
  const isTertiary    = curLevel === 'tertiary';
  const curStreams     = streamOptions(schoolForm.grade);
  const curTypes      = schoolTypeFilter(schoolForm.grade);

  const handleLevelChange = (level: EducationLevel) => {
    const oldDBLevel = schoolDBLevel(schoolForm.grade);
    const newDBLevel = level === 'primary' ? 'primary' : level === 'secondary' || level === 'preuni' ? 'secondary' : 'tertiary';
    if (newDBLevel !== oldDBLevel) setSelectedSchool(null);
    setSchoolForm(f => ({ ...f, educationLevel: level, grade: '', curricular: '' }));
  };

  const handleYearChange = (grade: string) => {
    setSchoolForm(f => ({ ...f, grade, curricular: '' }));
  };

  // active level config for colored year pills
  const activeLevelCfg = activeEduLevel ? EDUCATION_LEVELS.find(l => l.value === activeEduLevel) : null;

  const schoolDialog = (
    <DialogContent className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[5px_5px_0_0_#0F172A] max-w-md max-h-[85vh] flex flex-col">
      <DialogHeader>
        <DialogTitle className={`${DISPLAY} font-extrabold text-lg`}>
          {editingEntryId ? 'Edit Education' : 'Add Education'}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">

        {/* Step 1 — Education level cards */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Education Level</Label>
          <div className="grid grid-cols-3 gap-2">
            {EDUCATION_LEVELS.map(l => {
              const active = activeEduLevel === l.value;
              return (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => handleLevelChange(l.value)}
                  className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-[14px] border-[2px] border-[#0F172A] font-['Baloo_2'] transition-all cursor-pointer select-none"
                  style={active
                    ? { background: l.activeBg, color: '#fff', boxShadow: `3px 3px 0 0 ${l.activeShadow}`, transform: 'translateY(-1px)' }
                    : { background: l.idleBg,   color: l.idleColor, boxShadow: '2px 2px 0 0 #0F172A' }
                  }
                >
                  <l.Icon className="w-5 h-5 shrink-0" style={{ color: active ? '#fff' : l.idleColor }} />
                  <span className="text-[11px] font-extrabold leading-none">{l.label}</span>
                  <span className="text-[9px] font-semibold opacity-70 leading-none text-center">{l.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2 — Currently enrolled */}
        {activeEduLevel && (
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => setSchoolForm(f => ({ ...f, is_current: !f.is_current, grade: '', curricular: '', start_year: '', end_year: '' }))}
              className="w-5 h-5 rounded-[6px] border-[2px] border-[#0F172A] flex items-center justify-center shrink-0 transition-colors"
              style={{ background: schoolForm.is_current ? C.blue : '#fff', boxShadow: schoolForm.is_current ? `1px 1px 0 0 #1D4ED8` : '1px 1px 0 0 #0F172A' }}
            >
              {schoolForm.is_current && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                </svg>
              )}
            </div>
            <span className="text-sm font-bold font-['Baloo_2'] text-slate-700">I am currently studying here</span>
          </label>
        )}

        {/* Step 3 — Grade/Form pills (current only) */}
        {schoolForm.is_current && activeEduLevel && activeLevelCfg && (
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {activeEduLevel === 'primary' ? 'Standard' : activeEduLevel === 'secondary' ? 'Form' : 'Year / Programme'}
            </Label>
            <div className="flex flex-wrap gap-2">
              {YEAR_OPTIONS[activeEduLevel].map(y => {
                const active = schoolForm.grade === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => handleYearChange(y)}
                    className="px-3 py-1.5 rounded-full border-[2px] border-[#0F172A] text-xs font-extrabold font-['Baloo_2'] transition-all cursor-pointer select-none"
                    style={active
                      ? { background: activeLevelCfg.activeBg, color: '#fff', boxShadow: `2px 2px 0 0 ${activeLevelCfg.activeShadow}`, transform: 'translateY(-1px)' }
                      : { background: '#fff', color: activeLevelCfg.idleColor, boxShadow: `1px 1px 0 0 ${activeLevelCfg.idleColor}`, borderColor: activeLevelCfg.idleColor }
                    }
                  >
                    {YEAR_PILL_LABEL[activeEduLevel](y)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4 — School picker */}
        {activeEduLevel && (schoolForm.is_current ? !!schoolForm.grade : true) && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {isTertiary ? 'University / College' : 'School'}
            </Label>
            <SchoolPicker
              value={selectedSchool}
              onChange={setSelectedSchool}
              filterLevel={curLevel}
              filterTypes={curTypes}
              placeholder={isTertiary ? 'Search universities…' : 'Search for your school…'}
            />
            {selectedSchool ? (
              <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                Location auto-filled: {selectedSchool.city ? `${selectedSchool.city}, ` : ''}{selectedSchool.state}
              </p>
            ) : (
              <p className="text-[11px] font-semibold text-slate-400">
                Showing {curTypes ? `${curTypes.slice(0,3).join(', ')}${curTypes.length > 3 ? '…' : ''}` : 'all'} — location auto-fills on selection
              </p>
            )}
          </div>
        )}

        {/* Step 5a — Stream / Field (current only, hidden for lower secondary & primary) */}
        {schoolForm.is_current && schoolForm.grade && curStreams.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {isTertiary ? 'Field of Study' : 'Stream'}
            </Label>
            <select className={INPUT} value={schoolForm.curricular} onChange={(e) => setSchoolForm(f => ({ ...f, curricular: e.target.value }))}>
              <option value="">Select {isTertiary ? 'field' : 'stream'}</option>
              {curStreams.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Step 5b — Programme / Major (tertiary only) */}
        {isTertiary && selectedSchool && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Programme / Major <span className="normal-case font-semibold text-slate-400">(optional)</span></Label>
            <input
              className={INPUT}
              value={schoolForm.class_name}
              onChange={(e) => setSchoolForm(f => ({ ...f, class_name: e.target.value }))}
              placeholder="e.g. Computer Science"
            />
          </div>
        )}

        {/* Step 6 — Year range */}
        {activeEduLevel && (schoolForm.is_current ? !!schoolForm.grade : true) && (
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Years Attended <span className="normal-case font-semibold text-slate-400">(optional)</span></Label>
            <div className="flex items-center gap-2">
              <select
                className={`${INPUT} flex-1`}
                value={schoolForm.start_year}
                onChange={(e) => setSchoolForm(f => ({ ...f, start_year: e.target.value }))}
              >
                <option value="">From</option>
                {Array.from({ length: new Date().getFullYear() - 1969 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <span className="text-sm font-bold text-slate-400 shrink-0">–</span>
              {schoolForm.is_current ? (
                <div className={`${INPUT} flex-1 flex items-center text-blue-500 font-extrabold font-['Baloo_2'] pointer-events-none select-none`}>
                  Present
                </div>
              ) : (
                <select
                  className={`${INPUT} flex-1`}
                  value={schoolForm.end_year}
                  onChange={(e) => setSchoolForm(f => ({ ...f, end_year: e.target.value }))}
                >
                  <option value="">To</option>
                  {Array.from({ length: new Date().getFullYear() - 1969 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        <button
          className={`${BTN_PRIMARY} w-full`}
          style={{ background: C.blue }}
          onClick={handleSaveSchool}
          disabled={isSavingSchool || !activeEduLevel || !selectedSchool || (schoolForm.is_current && !schoolForm.grade)}
        >
          {isSavingSchool ? 'Saving…' : 'Save Info'}
        </button>
      </div>
    </DialogContent>
  );

  const displayName = profile?.username || user?.email?.split('@')[0] || 'Anonymous';

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 pt-8 pb-20 lg:pb-8 max-w-4xl">

        {/* Mobile notifications bell */}
        <div className="flex justify-end mb-4 lg:hidden">
          <NotificationsBell />
        </div>

        {/* ── Profile Header ── */}
        <div className={`${CARD} mb-6`}>
          {/* Cover — avatar is absolutely centred on its bottom edge */}
          <div className="relative h-[200px] w-full">
            {profile?.cover_url ? (
              <img src={profile.cover_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover cursor-zoom-in" onClick={() => setLightboxImage(profile.cover_url!)} />
            ) : (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${C.indigo}, ${C.blue}, ${C.cyan})` }} />
            )}
            <div className="absolute inset-0 bg-black/25 pointer-events-none" />

            {/* Streak badge */}
            {streak > 0 && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[2px] border-white/60 font-extrabold text-xs text-white" style={{ background: C.pop }}>
                <Flame className="w-3.5 h-3.5" /> {streak} day streak
              </div>
            )}

            {/* Cover upload button */}
            {isOwnProfile && (
              <label className="absolute bottom-3 right-3 w-8 h-8 rounded-full border-[2px] border-white bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors">
                <Camera className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  setCropSrc(URL.createObjectURL(file));
                  setCropTarget('cover-live');
                  e.target.value = '';
                }} />
              </label>
            )}

            {/* Avatar — sits on the bottom edge, half inside cover half below */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
              <div className="relative">
                <Avatar
                  className="h-36 w-36 border-[4px] border-white cursor-zoom-in"
                  onClick={() => { if (profile?.avatar_url) setLightboxImage(profile.avatar_url); }}
                >
                  <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className={`${DISPLAY} font-extrabold text-4xl`} style={{ background: C.cyan, color: C.ink }}>
                    {displayName[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full border-[2px] border-[#0F172A] text-[11px] font-extrabold font-['Baloo_2'] text-white shadow-[1px_1px_0_0_#0F172A]"
                  style={{ background: C.indigo }}
                >
                  Student
                </div>
              </div>
            </div>
          </div>

          {/* Info — padding-top makes room for the half-avatar that hangs below cover */}
          <div className="px-6 pb-6 pt-24">
            <div className="flex flex-col items-center">
              <div className="text-center w-full max-w-md">
                <h1 className={`${DISPLAY} font-extrabold text-3xl leading-tight mb-1`}>{displayName}</h1>
                <p className="text-sm font-semibold text-slate-400 mb-5">
                  {profile?.bio || 'No bio yet.'}
                </p>

                {isOwnProfile ? (
                  <div className="flex flex-col items-center gap-3 w-full">
                    {/* Edit Profile */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <button className={`${BTN_OUTLINE} w-full max-w-xs`}>
                          <PenLine className="w-4 h-4" /> Edit Profile
                        </button>
                      </DialogTrigger>
                      <DialogContent
                        className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[5px_5px_0_0_#0F172A]"
                        onInteractOutside={(e) => e.preventDefault()}
                        onPointerDownOutside={(e) => e.preventDefault()}
                        onFocusOutside={(e) => e.preventDefault()}
                      >
                        <DialogHeader>
                          <DialogTitle className={`${DISPLAY} font-extrabold text-lg`}>Edit Profile</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Username</Label>
                            <input className={INPUT} value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Enter username" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Bio</Label>
                            <Textarea
                              value={editBio}
                              onChange={(e) => setEditBio(e.target.value)}
                              placeholder="Tell us about yourself"
                              rows={3}
                              className="border-[2px] border-[#0F172A] rounded-[14px] shadow-[1px_1px_0_0_#0F172A] text-sm font-semibold focus-visible:ring-0 focus:shadow-[2px_2px_0_0_#0F172A] transition-shadow resize-none"
                            />
                          </div>
                          {/* Avatar crop */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Profile Picture</Label>
                            <label className="flex items-center gap-3 w-full px-3 py-2 border-[2px] border-[#0F172A] rounded-[14px] bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                              {avatarPreview
                                ? <img src={avatarPreview} className="w-8 h-8 rounded-full object-cover border-[1.5px] border-[#0F172A] shrink-0" />
                                : <div className="w-8 h-8 rounded-full bg-slate-100 border-[1.5px] border-[#0F172A] flex items-center justify-center shrink-0"><Camera className="w-4 h-4 text-slate-400" /></div>
                              }
                              <span className="text-sm font-semibold text-slate-500">{avatarPreview ? 'Change photo' : 'Choose photo'}</span>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                const f = e.target.files?.[0]; if (!f) return;
                                setIsEditDialogOpen(false);
                                setCropSrc(URL.createObjectURL(f)); setCropTarget('avatar'); e.target.value = '';
                              }} />
                            </label>
                          </div>
                          {/* Cover crop */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Cover Photo</Label>
                            <label className="flex items-center gap-3 w-full px-3 py-2 border-[2px] border-[#0F172A] rounded-[14px] bg-white cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden">
                              {coverPreview
                                ? <img src={coverPreview} className="w-12 h-8 rounded-[6px] object-cover border-[1.5px] border-[#0F172A] shrink-0" />
                                : <div className="w-12 h-8 rounded-[6px] bg-slate-100 border-[1.5px] border-[#0F172A] flex items-center justify-center shrink-0"><Camera className="w-4 h-4 text-slate-400" /></div>
                              }
                              <span className="text-sm font-semibold text-slate-500">{coverPreview ? 'Change cover' : 'Choose cover'}</span>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                const f = e.target.files?.[0]; if (!f) return;
                                setIsEditDialogOpen(false);
                                setCropSrc(URL.createObjectURL(f)); setCropTarget('cover-edit'); e.target.value = '';
                              }} />
                            </label>
                          </div>
                          <button className={`${BTN_PRIMARY} w-full`} style={{ background: C.indigo }} onClick={handleUpdateProfile} disabled={isUpdating}>
                            {isUpdating ? 'Saving…' : 'Save Changes'}
                          </button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Admin Tools */}
                    {isAdmin && (
                      <button
                        onClick={async () => {
                          const { data: { session } } = await supabase.auth.getSession();
                          const base = "https://admin.aceterus.com";
                          if (session) {
                            const hash = `#access_token=${session.access_token}&refresh_token=${session.refresh_token}&token_type=bearer&type=magiclink`;
                            window.open(`${base}/${hash}`, "_blank");
                          } else {
                            window.open(base, "_blank");
                          }
                        }}
                        className={`${BTN_OUTLINE} w-full max-w-xs flex items-center justify-center gap-2`}
                        style={{ borderColor: '#2E2BE5', color: '#2E2BE5' }}
                      >
                        <ShieldCheck className="w-4 h-4" /> Admin Tools
                      </button>
                    )}

                    {/* Quiz History */}
                    <Dialog open={isQuizHistoryOpen} onOpenChange={(open) => { setIsQuizHistoryOpen(open); if (open) fetchQuizHistory(); }}>
                      <DialogTrigger asChild>
                        <button className={`${BTN_OUTLINE} w-full max-w-xs`}>
                          <BarChart2 className="w-4 h-4" /> Quiz History
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[5px_5px_0_0_#0F172A]">
                        <DialogHeader>
                          <DialogTitle className={`${DISPLAY} font-extrabold text-lg flex items-center gap-2`}>
                            <BarChart2 className="h-5 w-5" style={{ color: C.indigo }} /> Quiz Analysis History
                          </DialogTitle>
                        </DialogHeader>
                        {quizHistoryLoading ? (
                          <div className="space-y-3 py-4">
                            {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-[14px]" />)}
                          </div>
                        ) : quizHistory.length === 0 ? (
                          <p className="text-sm font-semibold text-slate-400 py-8 text-center">No quiz history yet. Complete a quiz to see your results here.</p>
                        ) : (
                          <div className="space-y-3 py-2">
                            {quizHistory.map((result: any) => {
                              const ai = result.ai_analysis;
                              const score = Number(result.score);
                              return (
                                <div key={result.id} className="border-[2px] border-[#0F172A] rounded-[16px] shadow-[2px_2px_0_0_#0F172A] p-4 space-y-3 bg-white">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className={`${DISPLAY} font-extrabold text-sm`}>{result.deck_name}</p>
                                      <p className="text-xs font-semibold text-slate-400">{result.category} · {new Date(result.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                    <span className={`${DISPLAY} font-extrabold text-xl ${score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-orange-400' : 'text-red-500'}`}>
                                      {score.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="flex gap-4 text-xs font-semibold">
                                    <span className="flex items-center gap-1 text-emerald-500"><CheckCircle className="h-3 w-3" /> {result.correct_count} correct</span>
                                    <span className="flex items-center gap-1 text-red-400"><XCircle className="h-3 w-3" /> {result.wrong_count} wrong</span>
                                    <span className="flex items-center gap-1 text-slate-400"><SkipForward className="h-3 w-3" /> {result.skipped_count} skipped</span>
                                    <span className="text-slate-400 ml-auto">{result.total_count} total</span>
                                  </div>
                                  {ai && (
                                    <div className="rounded-[12px] border-[2px] border-[#0F172A]/10 p-3 space-y-2 text-xs" style={{ background: C.skySoft }}>
                                      <p className={`${DISPLAY} font-extrabold text-sm flex items-center gap-1`} style={{ color: C.indigo }}>
                                        <BarChart2 className="h-3.5 w-3.5" /> AI Analysis
                                        {ai.overall_trend && (
                                          <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#0F172A]/10 ${
                                            ai.overall_trend === 'improving' ? 'bg-emerald-100 text-emerald-700' :
                                            ai.overall_trend === 'declining' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                          }`}>
                                            {ai.overall_trend.replace('_', ' ')}
                                          </span>
                                        )}
                                      </p>
                                      {ai.performance_summary && <p className="text-slate-600 font-medium">{ai.performance_summary}</p>}
                                      {ai.weak_areas?.length > 0 && (
                                        <div>
                                          <p className="font-bold text-red-500 mb-1">Weak areas</p>
                                          <div className="flex flex-wrap gap-1">{ai.weak_areas.map((a: string, i: number) => <span key={i} className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">{a}</span>)}</div>
                                        </div>
                                      )}
                                      {ai.strong_areas?.length > 0 && (
                                        <div>
                                          <p className="font-bold text-emerald-600 mb-1">Strong areas</p>
                                          <div className="flex flex-wrap gap-1">{ai.strong_areas.map((a: string, i: number) => <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-semibold">{a}</span>)}</div>
                                        </div>
                                      )}
                                      {ai.improvement_tips?.length > 0 && (
                                        <div>
                                          <p className="font-bold mb-1">Tips</p>
                                          <ul className="list-disc list-inside space-y-0.5 text-slate-600 font-medium">{ai.improvement_tips.map((tip: string, i: number) => <li key={i}>{tip}</li>)}</ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  profileUserId && <FollowButton targetUserId={profileUserId} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Education (LinkedIn-style multi-entry) ── */}
        {(isOwnProfile || schoolEntries.length > 0) && (() => {
          const schoolDBLevelOrder = (e: StudentSchool) => {
            const fromGrade = LEVEL_ORDER[deriveLevelFromGrade(e.grade ?? '')];
            if (fromGrade !== undefined) return fromGrade;
            const dbLevel = (e as any).schools?.level;
            if (dbLevel === 'primary') return 1;
            if (dbLevel === 'secondary') return 2;
            if (dbLevel === 'tertiary') return 4;
            return 99;
          };
          const sortedEntries = [...schoolEntries].sort((a, b) => {
            const la = schoolDBLevelOrder(a);
            const lb = schoolDBLevelOrder(b);
            if (lb !== la) return lb - la;
            return (b.start_year ?? 0) - (a.start_year ?? 0);
          });
          return (
            <>
              {/* Single controlled dialog — opened by add/edit buttons below */}
              <Dialog open={isSchoolDialogOpen} onOpenChange={setIsSchoolDialogOpen}>
                {schoolDialog}
              </Dialog>

              <div className={`${CARD} mb-6 overflow-hidden`}>
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${C.blue}, ${C.cyan})` }} />
                <div className="p-5">

                  {/* Section header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: C.skySoft }}>
                        <GraduationCap className="w-4.5 h-4.5" style={{ color: C.blue }} />
                      </div>
                      <p className={`${DISPLAY} font-extrabold text-lg`}>Education</p>
                    </div>
                    {isOwnProfile && (
                      <button
                        onClick={openAddEntry}
                        className={`${BTN_PRIMARY} text-xs px-3.5 py-2 gap-1`}
                        style={{ background: C.blue }}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    )}
                  </div>

                  {/* Empty state */}
                  {sortedEntries.length === 0 && isOwnProfile && (
                    <button
                      onClick={openAddEntry}
                      className="w-full py-6 rounded-[16px] border-[2px] border-dashed border-slate-300 flex flex-col items-center gap-2 hover:border-blue-400 hover:bg-blue-50/40 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-full border-[2px] border-slate-300 group-hover:border-blue-400 flex items-center justify-center transition-colors">
                        <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                      </div>
                      <p className="text-sm font-extrabold text-slate-400 group-hover:text-blue-500 transition-colors font-['Baloo_2']">Add your education history</p>
                      <p className="text-xs font-semibold text-slate-400">Primary, secondary, pre-u, university — all optional</p>
                    </button>
                  )}

                  {/* Timeline entries */}
                  {sortedEntries.length > 0 && (
                    <div>
                      {sortedEntries.map((entry, idx) => {
                        const level = deriveLevelFromGrade(entry.grade ?? '');
                        const lvlCfg = level ? EDUCATION_LEVELS.find(l => l.value === level) : null;
                        const isTert = entry.school_type && ['Universiti Awam','Universiti Swasta','Politeknik','Kolej Komuniti','Kolej Matrikulasi'].includes(entry.school_type);
                        const typeStyle = entry.school_type ? (SCHOOL_TYPE_STYLE[entry.school_type] ?? { bg: '#f1f5f9', color: '#64748b' }) : null;
                        const detail = [
                          entry.grade,
                          entry.curricular ? (isTert ? entry.curricular : `${entry.curricular} Stream`) : null,
                          entry.class_name ? (isTert ? entry.class_name : `Class ${entry.class_name}`) : null,
                        ].filter(Boolean).join(' · ');
                        const isLast = idx === sortedEntries.length - 1;
                        const LvlIcon = lvlCfg?.Icon ?? GraduationCap;

                        return (
                          <div key={entry.id} className="flex gap-4">
                            {/* Timeline spine */}
                            <div className="flex flex-col items-center shrink-0" style={{ width: 40 }}>
                              <div
                                className="w-10 h-10 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0"
                                style={{ background: lvlCfg?.idleBg ?? C.skySoft }}
                              >
                                <LvlIcon className="w-4.5 h-4.5" style={{ color: lvlCfg?.idleColor ?? C.blue }} />
                              </div>
                              {!isLast && (
                                <div className="w-0.5 flex-1 my-1.5 rounded-full bg-slate-200" style={{ minHeight: 20 }} />
                              )}
                            </div>

                            {/* Entry content */}
                            <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-4'}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className={`${DISPLAY} font-extrabold text-base leading-tight`}>{entry.school_name ?? 'Unknown School'}</p>
                                  {detail && <p className="text-sm font-semibold text-slate-600 mt-0.5">{detail}</p>}
                                  {(entry.start_year || entry.is_current) && (
                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                                      {entry.start_year ?? '?'} –{' '}
                                      {entry.is_current
                                        ? <span className="font-extrabold" style={{ color: C.blue }}>Present</span>
                                        : (entry.end_year ?? '?')
                                      }
                                    </p>
                                  )}
                                </div>
                                {isOwnProfile && (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      onClick={() => openEditEntry(entry)}
                                      className="w-7 h-7 rounded-full border-[2px] border-[#0F172A] bg-white flex items-center justify-center hover:-translate-y-0.5 transition-all shadow-[1px_1px_0_0_#0F172A]"
                                      title="Edit"
                                    >
                                      <PenLine className="w-3 h-3 text-slate-500" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEntry(entry.id)}
                                      className="w-7 h-7 rounded-full border-[2px] border-[#0F172A] bg-white flex items-center justify-center hover:-translate-y-0.5 transition-all shadow-[1px_1px_0_0_#0F172A] hover:bg-red-50"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3 text-red-400" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center flex-wrap gap-2 mt-2">
                                {typeStyle && entry.school_type && (
                                  <span
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full border-[2px] border-[#0F172A] text-[11px] font-extrabold shadow-[1px_1px_0_0_#0F172A]"
                                    style={{ background: typeStyle.bg, color: typeStyle.color }}
                                  >
                                    {entry.school_type}
                                  </span>
                                )}
                                {entry.school_location && (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                                    <MapPin className="w-3 h-3 shrink-0" />{entry.school_location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>
            </>
          );
        })()}

        {/* ── Stats ── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Posts', value: posts.length, bg: C.skySoft, color: C.blue, onClick: undefined },
            { label: 'Followers', value: profile?.followers_count || 0, bg: C.indigoSoft, color: C.indigo, onClick: isOwnProfile ? () => setIsFollowersOpen(true) : undefined },
            { label: 'Following', value: profile?.following_count || 0, bg: C.mintSoft, color: '#059669', onClick: isOwnProfile ? () => setIsFollowingOpen(true) : undefined },
            { label: 'Streak', value: streak, bg: C.peach, color: C.pop, icon: <Flame className="w-4 h-4" />, onClick: undefined },
          ].map(({ label, value, bg, color, icon, onClick }) => (
            <div
              key={label}
              className={`border-[2.5px] border-[#0F172A] rounded-[18px] shadow-[3px_3px_0_0_#0F172A] text-center py-4 px-2 ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all' : ''}`}
              style={{ background: bg }}
              onClick={onClick}
            >
              {icon ? (
                <div className="flex items-center justify-center gap-1 mb-0.5" style={{ color }}>
                  {icon}
                  <span className={`${DISPLAY} font-extrabold text-xl`}>{value}</span>
                </div>
              ) : (
                <div className={`${DISPLAY} font-extrabold text-xl mb-0.5`} style={{ color }}>{value}</div>
              )}
              <div className="text-xs font-bold text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Streak Statistics ── */}
        <div className={`${CARD} mb-6`} style={{ background: C.lemon }}>
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: C.pop }}>
                <Flame className="w-4 h-4 text-white" />
              </div>
              <p className={`${DISPLAY} font-extrabold text-lg`}>Streak Statistics</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="border-[2px] border-[#0F172A] rounded-[16px] shadow-[2px_2px_0_0_#0F172A] p-5 text-center bg-white">
                <Zap className="w-10 h-10 mx-auto mb-2" style={{ color: C.pop }} />
                <p className={`${DISPLAY} font-extrabold text-4xl`} style={{ color: C.pop }}>{streak}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Current Streak</p>
              </div>
              <div className="border-[2px] border-[#0F172A] rounded-[16px] shadow-[2px_2px_0_0_#0F172A] p-5 text-center bg-white">
                <Target className="w-10 h-10 mx-auto mb-2" style={{ color: C.blue }} />
                <p className={`${DISPLAY} font-extrabold text-4xl`} style={{ color: C.blue }}>{streak}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Best Streak</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Streak Leaderboard ── */}
        <div className="mb-6">
          <StreakLeaderboard currentUserId={user?.id} currentStreak={streak} />
        </div>

        {/* ── User Search ── */}
        <div className={`${CARD} mb-6`} style={{ background: C.lavender }}>
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: C.cyan }}>
                <Search className="w-4 h-4" style={{ color: C.ink }} />
              </div>
              <p className={`${DISPLAY} font-extrabold text-lg`}>Search Users</p>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                placeholder="Search by username…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); searchUsers(e.target.value); }}
                className={`${INPUT} pl-10`}
              />
            </div>
            {isSearching && <p className="text-xs font-semibold text-slate-400 px-1">Searching…</p>}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide">
                {searchResults.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 border-[2px] border-[#0F172A]/20 rounded-[14px] bg-white hover:border-[#0F172A]/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border-[2px] border-[#0F172A] shadow-[1px_1px_0_0_#0F172A]">
                        <AvatarImage src={u.avatar_url || undefined} className="object-cover" />
                        <AvatarFallback className={`${DISPLAY} font-extrabold text-sm`} style={{ background: C.cyan, color: C.ink }}>
                          {u.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className={`${DISPLAY} font-extrabold text-sm`}>{u.username || 'Anonymous'}</p>
                        {u.bio && <p className="text-xs font-semibold text-slate-400 truncate max-w-48">{u.bio}</p>}
                      </div>
                    </div>
                    <FollowButton targetUserId={u.user_id} />
                  </div>
                ))}
              </div>
            )}
            {searchQuery && !isSearching && searchResults.length === 0 && (
              <p className="text-xs font-semibold text-slate-400 px-1">No users found for "{searchQuery}"</p>
            )}
          </div>
        </div>

        {/* ── Posts ── */}
        <div className="space-y-5">
          {!isOwnProfile && !isMutual && !isMutualLoading ? (
            <div className={`${CARD} py-16 flex flex-col items-center gap-4 text-center px-6`}>
              <div className="w-14 h-14 rounded-[18px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center" style={{ background: C.indigoSoft }}>
                <Lock className="w-6 h-6" style={{ color: C.indigo }} />
              </div>
              <div>
                <p className={`${DISPLAY} font-extrabold text-lg`}>Posts are private</p>
                <p className="text-sm font-semibold text-slate-400 mt-1 max-w-xs">
                  Follow each other to see <span className="font-bold text-[#0F172A]">{profile?.username || 'this user'}</span>'s posts.
                </p>
              </div>
              {profileUserId && <FollowButton targetUserId={profileUserId} />}
            </div>
          ) : (
            <>
              {isOwnProfile && <PostUpload onPostCreated={fetchPosts} />}

              {isLoading ? (
                <div className={`${CARD} p-1`}>
                  <div className="grid grid-cols-3 gap-1">
                    {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="aspect-square w-full rounded-none" />)}
                  </div>
                </div>
              ) : posts.length === 0 ? (
                <div className={`${CARD} py-12 flex flex-col items-center gap-3 text-center px-6`}>
                  <div className="w-12 h-12 rounded-[14px] border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center" style={{ background: C.skySoft }}>
                    <GraduationCap className="w-5 h-5" style={{ color: C.indigo }} />
                  </div>
                  <p className={`${DISPLAY} font-extrabold text-base`}>No posts yet</p>
                  {isOwnProfile && <p className="text-sm font-semibold text-slate-400">Create your first post above!</p>}
                </div>
              ) : (
                <div className={`${CARD} overflow-hidden`}>
                  <div className="flex items-center gap-2 px-4 py-3 border-b-[2px] border-[#0F172A]/10">
                    <PenLine className="w-4 h-4" style={{ color: C.indigo }} />
                    <p className={`${DISPLAY} font-extrabold text-sm`}>Posts</p>
                    <span className="ml-auto text-xs font-bold text-slate-400">{posts.length}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-[2px] bg-[#0F172A]/10">
                    {posts.map((post) => {
                      const thumb = post.images?.[0]?.file_url ?? post.image_url ?? null;
                      return (
                        <button
                          key={post.id}
                          className="aspect-square relative overflow-hidden group cursor-pointer bg-slate-100 focus:outline-none"
                          onClick={() => setSelectedPostId(post.id)}
                        >
                          {thumb ? (
                            <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center p-2" style={{ background: C.indigoSoft }}>
                              <p className="text-[11px] font-bold text-center text-slate-600 line-clamp-4 leading-tight">{post.content}</p>
                            </div>
                          )}
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                            <span className="text-white font-extrabold text-sm flex items-center gap-1">
                              <PenLine className="w-4 h-4" /> {post.likes_count}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Followers / Following dialogs */}
        <Dialog open={isFollowersOpen} onOpenChange={setIsFollowersOpen}>
          <DialogContent className="max-w-sm max-h-[70vh] overflow-y-auto border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A]">
            <DialogHeader><DialogTitle className={`${DISPLAY} font-extrabold`}>Followers</DialogTitle></DialogHeader>
            <UsersList title="" userIds={followers} showAll />
          </DialogContent>
        </Dialog>
        <Dialog open={isFollowingOpen} onOpenChange={setIsFollowingOpen}>
          <DialogContent className="max-w-sm max-h-[70vh] overflow-y-auto border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A]">
            <DialogHeader><DialogTitle className={`${DISPLAY} font-extrabold`}>Following</DialogTitle></DialogHeader>
            <UsersList title="" userIds={following} showAll />
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Profile image lightbox ── */}
      {lightboxImage && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }} onClick={() => setLightboxImage(null)}>
          <button type="button" className="absolute top-4 right-5 text-white/70 hover:text-white text-2xl leading-none z-10 transition-colors" onClick={() => setLightboxImage(null)} aria-label="Close">✕</button>
          <img src={lightboxImage} alt="Full size" className="max-w-[92vw] max-h-[88vh] object-contain rounded-2xl shadow-2xl lb-zoom-in" onClick={(e) => e.stopPropagation()} />
        </div>,
        document.body
      )}

      {/* ── Expanded post modal (Instagram-style) ── */}
      {selectedPostId && (() => {
        const post = posts.find((p) => p.id === selectedPostId);
        if (!post) return null;
        const hasGalleryImages = !!(post.images && post.images.length);
        const gallery = (post.images?.map((img) => img.file_url) ?? []).concat(!hasGalleryImages && post.image_url ? [post.image_url] : []);
        return createPortal(
          <div
            className="fixed inset-0 z-[55] flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={() => setSelectedPostId(null)}
          >
            <div
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[6px_6px_0_0_#0F172A] bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b-[2px] border-[#0F172A]/10 sticky top-0 bg-white z-10">
                <Avatar className="h-9 w-9 border-[2px] border-[#0F172A] shadow-[1px_1px_0_0_#0F172A] flex-shrink-0">
                  <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className={`${DISPLAY} font-extrabold text-sm`} style={{ background: C.cyan, color: C.ink }}>
                    {displayName[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={`${DISPLAY} font-extrabold text-sm leading-tight`}>{displayName}</p>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => { deletePost(post.id); setSelectedPostId(null); }}
                    className="h-8 w-8 rounded-full border-[2px] border-[#0F172A]/20 bg-white flex items-center justify-center hover:border-red-300 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedPostId(null)}
                  className="h-8 w-8 rounded-full border-[2px] border-[#0F172A]/20 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors ml-1"
                  aria-label="Close"
                >
                  <span className="text-slate-400 text-base leading-none">✕</span>
                </button>
              </div>

              {/* Image */}
              {gallery.length > 0 && (
                <div className="border-b-[2px] border-[#0F172A]/10">
                  <PostImageCarousel images={gallery} onImageClick={hasGalleryImages ? (idx) => openLightbox(post.id, idx) : undefined} />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-0.5 px-3 pt-2 pb-1">
                <LikeButton postId={post.id} likesCount={post.likes_count} onLikeChange={(n) => setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, likes_count: n } : p))} />
                <CommentSection
                  mode="trigger"
                  postId={post.id}
                  commentsCount={post.comments_count}
                  open={!!openComments[post.id]}
                  onOpenChange={(v) => setOpenComments((prev) => ({ ...prev, [post.id]: v }))}
                  onCommentChange={(n) => setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, comments_count: n } : p))}
                />
              </div>

              {/* Caption */}
              {post.content && (
                <p className="px-4 pb-2 text-sm font-medium leading-snug">
                  <span className={`${DISPLAY} font-extrabold mr-1.5`}>{displayName}</span>
                  {post.content}
                </p>
              )}

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="px-4 pb-2 flex flex-wrap gap-x-2 gap-y-1">
                  {post.tags.map((tag, i) => (
                    <span key={i} className="text-xs font-bold" style={{ color: C.indigo }}>#{tag}</span>
                  ))}
                </div>
              )}

              {/* Comment preview (collapsed) or full panel (expanded) — both below caption */}
              {openComments[post.id] ? (
                <CommentSection
                  mode="panel"
                  postId={post.id}
                  commentsCount={post.comments_count}
                  open={true}
                  onOpenChange={(v) => setOpenComments((prev) => ({ ...prev, [post.id]: v }))}
                  onCommentChange={(n) => setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, comments_count: n } : p))}
                />
              ) : (
                <CommentPreview
                  postId={post.id}
                  commentsCount={post.comments_count}
                  onViewAll={() => setOpenComments((prev) => ({ ...prev, [post.id]: true }))}
                />
              )}
            </div>
          </div>,
          document.body
        );
      })()}

      {/* ── Post image lightbox ── */}
      {lightboxPostId && (() => {
        const post = posts.find((p) => p.id === lightboxPostId);
        if (!post?.images?.length) return null;
        const currentImage = post.images[lightboxIndex];
        if (!currentImage) return null;
        return createPortal(
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
            <button type="button" className="absolute top-4 right-4 text-white text-2xl" onClick={closeLightbox}>✕</button>
            <button type="button" className="absolute left-4 md:left-8 text-white text-4xl" onClick={showPrev}>‹</button>
            <button type="button" className="absolute right-4 md:right-8 text-white text-4xl" onClick={showNext}>›</button>
            <div className="max-w-5xl w-full px-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              <img src={currentImage.file_url} alt="Post image" className="w-full max-h-[80vh] object-contain mx-auto" />
            </div>
          </div>,
          document.body
        );
      })()}

      {/* ── Image cropper modal ── */}
      {cropSrc && cropTarget && (
        <ImageCropper
          imageSrc={cropSrc}
          aspect={cropTarget === 'avatar' ? 1 : cropTarget.startsWith('cover') ? 3 : undefined}
          title={cropTarget === 'avatar' ? 'Crop Profile Photo' : 'Crop Cover Photo'}
          onConfirm={handleCropConfirm}
          onCancel={() => { const wasEditCrop = cropTarget === 'avatar' || cropTarget === 'cover-edit'; setCropSrc(null); setCropTarget(null); if (wasEditCrop) setIsEditDialogOpen(true); }}
        />
      )}
    </div>
  );
};
