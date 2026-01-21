import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Trash2, Clock, AlertTriangle, Loader2, UserX, Search } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface DeletionRequest {
  id: string;
  user_id: string;
  requested_at: string;
  scheduled_deletion_at: string;
  status: string;
  profiles: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    email: string | null;
    mobile_number: string | null;
  } | null;
}

export default function AdminDeletionRequests() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [directDeleteDialogOpen, setDirectDeleteDialogOpen] = useState(false);
  const [searchMobile, setSearchMobile] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-deletion-requests'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-account-deletion', {
        body: { action: 'get_all_pending', user_id: 'admin' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return (data?.requests || []) as DeletionRequest[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'admin_delete_now' | 'admin_delete_direct' }) => {
      const { data, error } = await supabase.functions.invoke('manage-account-deletion', {
        body: { 
          action, 
          user_id: userId,
          admin_id: currentUser?.id
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deletion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User account permanently deleted');
      setDeleteDialogOpen(false);
      setDirectDeleteDialogOpen(false);
      setSelectedRequest(null);
      setFoundUser(null);
      setSearchMobile('');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete account: ' + error.message);
    },
  });

  const handleSearchUser = async () => {
    if (!searchMobile.trim()) {
      toast.error('Please enter a mobile number');
      return;
    }
    
    setSearching(true);
    setFoundUser(null);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, email, mobile_number, created_at')
        .eq('mobile_number', searchMobile.trim())
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setFoundUser(data);
      } else {
        toast.error('No user found with this mobile number');
      }
    } catch (error: any) {
      toast.error('Error searching: ' + error.message);
    } finally {
      setSearching(false);
    }
  };

  const getTimeRemaining = (scheduledDate: string) => {
    const scheduled = new Date(scheduledDate);
    const now = new Date();
    const diff = scheduled.getTime() - now.getTime();
    
    if (diff <= 0) return 'Overdue';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
  };

  const handleDeleteClick = (request: DeletionRequest) => {
    setSelectedRequest(request);
    setDeleteDialogOpen(true);
  };

  return (
    <AdminLayout 
      title="Account Deletion Requests" 
      description="Manage pending account deletion requests. You can delete accounts immediately before the notice period ends."
    >
      {/* Direct User Delete Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Direct User Deletion</CardTitle>
          <CardDescription>
            Search by mobile number to immediately delete a user account (no deletion request needed)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor="search-mobile">Mobile Number</Label>
              <Input
                id="search-mobile"
                placeholder="Enter mobile number (e.g., 9961801835)"
                value={searchMobile}
                onChange={(e) => setSearchMobile(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
              />
            </div>
            <Button onClick={handleSearchUser} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          </div>
          
          {foundUser && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={foundUser.avatar_url} />
                    <AvatarFallback>{foundUser.full_name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{foundUser.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {foundUser.mobile_number} • Joined {formatDistanceToNow(new Date(foundUser.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setDirectDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Requests Section */}
      <h3 className="text-lg font-semibold mb-4">Pending Deletion Requests</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserX className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No pending deletion requests</p>
            <p className="text-sm text-muted-foreground">Users who request account deletion will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="border-destructive/20">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={request.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-destructive/10 text-destructive">
                        {request.profiles?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {request.profiles?.full_name || 'Unknown User'}
                      </CardTitle>
                      <CardDescription>
                        {request.profiles?.mobile_number || request.profiles?.username || 'no-username'}
                        {request.profiles?.email && ` • ${request.profiles.email}`}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Pending Deletion
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Requested: {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Trash2 className="h-4 w-4" />
                    <span>Scheduled: {format(new Date(request.scheduled_deletion_at), 'PPp')}</span>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                    {getTimeRemaining(request.scheduled_deletion_at)}
                  </Badge>
                </div>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteClick(request)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog for Pending Requests */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Permanently Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to permanently delete the account of{' '}
                <strong>{selectedRequest?.profiles?.full_name || 'this user'}</strong> 
                {' '}({selectedRequest?.profiles?.mobile_number || selectedRequest?.profiles?.username}).
              </p>
              <p className="font-medium">This action will immediately:</p>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>Delete all posts, comments, and likes</li>
                <li>Remove all messages and conversations</li>
                <li>Delete business and community memberships</li>
                <li>Remove the user profile permanently</li>
              </ul>
              <p className="mt-3 text-destructive font-medium">
                This action cannot be undone!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRequest && deleteMutation.mutate({ userId: selectedRequest.user_id, action: 'admin_delete_now' })}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Yes, Delete Permanently'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Direct Delete Confirmation Dialog */}
      <AlertDialog open={directDeleteDialogOpen} onOpenChange={setDirectDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Direct Account Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to permanently delete the account of{' '}
                <strong>{foundUser?.full_name || 'this user'}</strong> 
                {' '}({foundUser?.mobile_number}).
              </p>
              <p className="font-medium">This action will immediately:</p>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>Delete all posts, comments, and likes</li>
                <li>Remove all messages and conversations</li>
                <li>Delete business and community memberships</li>
                <li>Remove the user profile permanently</li>
              </ul>
              <p className="mt-3 text-destructive font-medium">
                This action cannot be undone!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => foundUser && deleteMutation.mutate({ userId: foundUser.id, action: 'admin_delete_direct' })}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Yes, Delete Permanently'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
