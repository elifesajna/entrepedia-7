import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Building2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface TrendingBusiness {
  id: string;
  name: string;
  category: string;
  logo_url: string | null;
  follower_count: number;
}

export function TrendingSection() {
  const [businesses, setBusinesses] = useState<TrendingBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingBusinesses();
  }, []);

  const fetchTrendingBusinesses = async () => {
    try {
      // Get featured businesses with follower count
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          id,
          name,
          category,
          logo_url
        `)
        .eq('is_featured', true)
        .limit(5);

      if (error) throw error;

      // Get follower counts
      const businessesWithCounts = await Promise.all(
        (data || []).map(async (business) => {
          const { count } = await supabase
            .from('business_follows')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', business.id);
          
          return {
            ...business,
            follower_count: count || 0,
          };
        })
      );

      setBusinesses(businessesWithCounts);
    } catch (error) {
      console.error('Error fetching trending:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    food: '🍕 Food',
    tech: '💻 Tech',
    handmade: '🎨 Handmade',
    services: '⚙️ Services',
    agriculture: '🌾 Agriculture',
    retail: '🛒 Retail',
    education: '📚 Education',
    health: '💊 Health',
    finance: '💰 Finance',
    other: '📦 Other',
  };

  return (
    <Card className="sticky top-20 shadow-soft border-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Trending Ideas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : businesses.length > 0 ? (
          <>
            {businesses.map((business) => (
              <Link
                key={business.id}
                to={`/business/${business.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt={business.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{business.name}</p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {categoryLabels[business.category] || business.category}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {business.follower_count} followers
                </span>
              </Link>
            ))}
            <Link
              to="/explore?tab=businesses"
              className="flex items-center justify-center gap-1 text-sm text-primary hover:underline pt-2"
            >
              See all <ChevronRight className="h-4 w-4" />
            </Link>
          </>
        ) : (
          <div className="text-center py-4">
            <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No featured businesses yet
            </p>
            <Link
              to="/create-business"
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              Create your business
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
