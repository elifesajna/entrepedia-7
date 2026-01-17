import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/feed/PostCard';
import { CreatePostCard } from '@/components/feed/CreatePostCard';
import { TrendingSection } from '@/components/feed/TrendingSection';
import { SuggestedUsers } from '@/components/feed/SuggestedUsers';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Post {
  id: string;
  content: string | null;
  image_url: string | null;
  youtube_url: string | null;
  instagram_url: string | null;
  created_at: string;
  user_id: string;
  business_id: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  businesses: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
  post_likes: { user_id: string }[];
  comments: { id: string }[];
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('for-you');

  useEffect(() => {
    if (!authLoading) {
      fetchPosts();
    }
  }, [activeTab, user, authLoading]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (id, full_name, username, avatar_url),
          businesses:business_id (id, name, logo_url),
          post_likes (user_id),
          comments (id)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (activeTab === 'following' && user) {
        // Get posts from followed users
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        
        if (following && following.length > 0) {
          const followingIds = following.map(f => f.following_id);
          query = query.in('user_id', followingIds);
        }
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = () => {
    fetchPosts();
  };

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Hidden on mobile */}
          <aside className="hidden lg:block lg:col-span-3">
            <TrendingSection />
          </aside>

          {/* Main Feed */}
          <div className="lg:col-span-6 space-y-6">
            {user && <CreatePostCard onPostCreated={handlePostCreated} />}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="for-you">For You</TabsTrigger>
                <TabsTrigger value="following" disabled={!user}>Following</TabsTrigger>
              </TabsList>

              <TabsContent value="for-you" className="mt-4 space-y-4">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-96 w-full rounded-xl" />
                  ))
                ) : posts.length > 0 ? (
                  posts.map((post) => (
                    <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="following" className="mt-4 space-y-4">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-96 w-full rounded-xl" />
                  ))
                ) : posts.length > 0 ? (
                  posts.map((post) => (
                    <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      Follow entrepreneurs to see their posts here!
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Hidden on mobile */}
          <aside className="hidden lg:block lg:col-span-3">
            <SuggestedUsers />
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
