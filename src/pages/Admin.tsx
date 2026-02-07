import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { Users, Image, CheckCircle, XCircle, ArrowLeft, Images, Coins, Plus, Minus, Download, MessageSquare, ExternalLink, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminUserTable } from '@/components/admin/AdminUserTable';
import { AdminUserImages } from '@/components/admin/AdminUserImages';
import { AdminUserScenes } from '@/components/admin/AdminUserScenes';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  company_name: string | null;
  customer_type: string | null;
  credits: number;
  created_at: string;
  roles: string[];
}

interface Stats {
  total_users: number;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
}

interface BugReport {
  id: string;
  user_id: string;
  message: string;
  page_url: string | null;
  user_agent: string | null;
  status: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
}

const Admin = () => {
  const { isAdmin, loading: authLoading, adminLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCredits, setTotalCredits] = useState(0);
  
  // Feedback/Bug reports
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  
  // Credit adjustment dialog
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  
  // Confirmation dialog for large adjustments
  const [pendingAdjustment, setPendingAdjustment] = useState<{ isPositive: boolean } | null>(null);
  
  // Security limits
  const MAX_CREDIT_ADJUSTMENT = 10000;
  const LARGE_ADJUSTMENT_THRESHOLD = 100;
  
  // Delete user dialog
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // User images dialog
  const [viewingImagesUser, setViewingImagesUser] = useState<UserData | null>(null);
  
  // User AI scenes dialog
  const [viewingScenesUser, setViewingScenesUser] = useState<UserData | null>(null);

  useEffect(() => {
    if (!authLoading && !adminLoading && !isAdmin) {
      toast.error('Du har inte behörighet att se den här sidan');
      navigate('/');
    }
  }, [isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
      loadBugReports();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: usersData, error: usersError } = await supabase.rpc('admin_get_users_with_credits');
      if (usersError) throw usersError;
      setUsers(usersData || []);
      
      const total = (usersData || []).reduce((sum: number, user: UserData) => sum + (user.credits || 0), 0);
      setTotalCredits(total);

      const { data: statsData, error: statsError } = await supabase.rpc('admin_get_user_stats');
      if (statsError) throw statsError;
      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }
    } catch (error: any) {
      console.error('Error loading admin data:', error);
      toast.error('Kunde inte ladda data');
    } finally {
      setLoading(false);
    }
  };

  const loadBugReports = async () => {
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, company_name')
          .in('id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const reportsWithUserInfo: BugReport[] = data.map(report => ({
          ...report,
          full_name: profileMap.get(report.user_id)?.full_name || null,
          email: profileMap.get(report.user_id)?.email || null,
          company_name: profileMap.get(report.user_id)?.company_name || null
        }));
        
        setBugReports(reportsWithUserInfo);
      } else {
        setBugReports([]);
      }
    } catch (error) {
      console.error('Error loading bug reports:', error);
      toast.error('Kunde inte ladda feedback');
    } finally {
      setLoadingReports(false);
    }
  };

  const markReportResolved = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('bug_reports')
        .update({ status: 'resolved' })
        .eq('id', reportId);
      
      if (error) throw error;
      
      setBugReports(prev => prev.map(r => 
        r.id === reportId ? { ...r, status: 'resolved' } : r
      ));
      toast.success('Markerad som löst');
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('Kunde inte uppdatera');
    }
  };

  const initiateAdjustment = (isPositive: boolean) => {
    if (!selectedUser || !creditAmount) return;
    
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Ange ett giltigt positivt antal');
      return;
    }
    
    if (amount > MAX_CREDIT_ADJUSTMENT) {
      toast.error(`Maximal justering är ${MAX_CREDIT_ADJUSTMENT.toLocaleString('sv-SE')} credits per operation`);
      return;
    }
    
    if (!creditDescription.trim()) {
      toast.error('Ange en beskrivning för justeringen');
      return;
    }
    
    if (amount > LARGE_ADJUSTMENT_THRESHOLD) {
      setPendingAdjustment({ isPositive });
      return;
    }
    
    executeAdjustment(isPositive);
  };
  
  const executeAdjustment = async (isPositive: boolean) => {
    if (!selectedUser || !creditAmount) return;
    
    const amount = parseInt(creditAmount) * (isPositive ? 1 : -1);
    
    setAdjusting(true);
    setPendingAdjustment(null);
    
    try {
      const { data, error } = await supabase.rpc('admin_add_credits', {
        target_user_id: selectedUser.id,
        amount: amount,
        description: creditDescription
      });

      if (error) throw error;

      toast.success(`${Math.abs(amount)} credits ${isPositive ? 'tillagda till' : 'borttagna från'} ${selectedUser.email}`);
      setSelectedUser(null);
      setCreditAmount('');
      setCreditDescription('');
      loadData();
    } catch (error: any) {
      console.error('Error adjusting credits:', error);
      toast.error('Kunde inte justera credits');
    } finally {
      setAdjusting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeleting(true);
    try {
      const { data, error } = await supabase.rpc('admin_delete_user', {
        target_user_id: userToDelete.id
      });

      if (error) throw error;

      toast.success(`Användare ${userToDelete.email} raderad`);
      setUserToDelete(null);
      loadData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Kunde inte radera användare');
    } finally {
      setDeleting(false);
    }
  };

  const exportLeadsCSV = () => {
    if (users.length === 0) {
      toast.error('Inga användare att exportera');
      return;
    }
    
    const headers = ['Email', 'Namn', 'Företag', 'Typ', 'Telefon', 'Credits', 'Registrerad'];
    const rows = users.map(user => [
      user.email,
      user.full_name || '',
      user.company_name || '',
      user.customer_type === 'private' ? 'Privat' : 'Företag',
      '',
      user.credits.toString(),
      new Date(user.created_at).toLocaleDateString('sv-SE')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`${users.length} leads exporterade till CSV`);
  };

  if (authLoading || adminLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Hantera användare, credits och se statistik
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={exportLeadsCSV}>
                <Download className="mr-2 h-4 w-4" />
                Exportera CSV
              </Button>
              <Button onClick={() => navigate('/admin/scener')}>
                <Images className="mr-2 h-4 w-4" />
                Hantera Scener
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tillbaka
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Totalt användare</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_users || users.length}</div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Totalt credits</CardTitle>
                <Coins className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{totalCredits}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Totalt jobb</CardTitle>
                <Image className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_jobs || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Slutförda</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.completed_jobs || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Misslyckade</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.failed_jobs || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Users Table with Credits */}
          <Card>
            <CardHeader>
              <CardTitle>Användare & Credits</CardTitle>
              <CardDescription>
                Alla registrerade användare, deras credits och roller. Sortera och filtrera för att hitta rätt kunder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminUserTable
                users={users}
                loading={loading}
                onViewImages={(user) => setViewingImagesUser(user)}
                onViewScenes={(user) => setViewingScenesUser(user)}
                onAdjustCredits={(user) => setSelectedUser(user)}
                onDeleteUser={(user) => setUserToDelete(user)}
              />
            </CardContent>
          </Card>

          {/* Feedback / Bug Reports Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Kundfeedback
              </CardTitle>
              <CardDescription>
                Feedback och buggrapporter från användare. Klicka för att markera som löst.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReports ? (
                <div className="text-center py-8 text-muted-foreground">
                  Laddar feedback...
                </div>
              ) : bugReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Ingen feedback ännu
                </div>
              ) : (
                <div className="space-y-4">
                  {bugReports.map((report) => (
                    <div 
                      key={report.id} 
                      className={`p-4 rounded-lg border ${
                        report.status === 'resolved' 
                          ? 'bg-muted/50 border-muted' 
                          : 'bg-card border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {report.full_name || report.email || 'Okänd användare'}
                            </span>
                            {report.company_name && (
                              <Badge variant="outline">{report.company_name}</Badge>
                            )}
                            <Badge variant={report.status === 'resolved' ? 'secondary' : 'default'}>
                              {report.status === 'resolved' ? 'Löst' : 'Ny'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(report.created_at).toLocaleString('sv-SE')}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{report.message}</p>
                          {report.page_url && (
                            <a 
                              href={report.page_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {report.page_url}
                            </a>
                          )}
                          {report.user_agent && (
                            <p className="text-xs text-muted-foreground truncate max-w-xl">
                              {report.user_agent}
                            </p>
                          )}
                        </div>
                        {report.status !== 'resolved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markReportResolved(report.id)}
                            className="shrink-0"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Markera löst
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Credit Adjustment Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justera credits</DialogTitle>
            <DialogDescription>
              {selectedUser?.full_name || selectedUser?.email}
              <br />
              Nuvarande saldo: <span className="font-bold">{selectedUser?.credits || 0}</span> credits
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Antal credits (max {MAX_CREDIT_ADJUSTMENT.toLocaleString('sv-SE')})</label>
              <Input
                type="number"
                min="1"
                max={MAX_CREDIT_ADJUSTMENT}
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Ange antal"
              />
              {parseInt(creditAmount) > LARGE_ADJUSTMENT_THRESHOLD && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Stora justeringar ({'>'}100) kräver bekräftelse
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Beskrivning (obligatorisk)</label>
              <Input
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                placeholder="T.ex. 'Bonus för testkonto' eller 'Korrigering för order #123'"
                required
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => initiateAdjustment(false)}
              disabled={adjusting || !creditAmount || !creditDescription.trim()}
              className="text-destructive"
            >
              <Minus className="h-4 w-4 mr-1" />
              Dra credits
            </Button>
            <Button
              onClick={() => initiateAdjustment(true)}
              disabled={adjusting || !creditAmount || !creditDescription.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Lägg till credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Radera användare</DialogTitle>
            <DialogDescription>
              Är du säker på att du vill radera användaren <strong>{userToDelete?.email}</strong>?
              <br /><br />
              Detta kommer permanent radera:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Användarens konto</li>
                <li>Profil och företagsinformation</li>
                <li>Alla credits ({userToDelete?.credits || 0} st)</li>
                <li>Alla genererade bilder</li>
              </ul>
              <br />
              <strong className="text-destructive">Denna åtgärd kan inte ångras.</strong>
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setUserToDelete(null)}
              disabled={deleting}
            >
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleting}
            >
              {deleting ? 'Raderar...' : 'Radera användare'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Large Adjustment Confirmation Dialog */}
      <Dialog open={!!pendingAdjustment} onOpenChange={() => setPendingAdjustment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-amber-600">⚠️ Bekräfta stor justering</DialogTitle>
            <DialogDescription>
              Du är på väg att {pendingAdjustment?.isPositive ? 'lägga till' : 'dra'}{' '}
              <strong className="text-foreground">{creditAmount}</strong> credits{' '}
              {pendingAdjustment?.isPositive ? 'till' : 'från'}{' '}
              <strong className="text-foreground">{selectedUser?.email}</strong>.
              <br /><br />
              <span className="text-muted-foreground">Anledning: {creditDescription}</span>
              <br /><br />
              Denna åtgärd loggas i systemet.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPendingAdjustment(null)}
              disabled={adjusting}
            >
              Avbryt
            </Button>
            <Button
              variant={pendingAdjustment?.isPositive ? 'default' : 'destructive'}
              onClick={() => pendingAdjustment && executeAdjustment(pendingAdjustment.isPositive)}
              disabled={adjusting}
            >
              {adjusting ? 'Justerar...' : `Bekräfta ${pendingAdjustment?.isPositive ? 'tillägg' : 'avdrag'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Images Dialog */}
      <AdminUserImages
        user={viewingImagesUser}
        onClose={() => setViewingImagesUser(null)}
      />

      {/* View User AI Scenes Dialog */}
      <AdminUserScenes
        user={viewingScenesUser}
        onClose={() => setViewingScenesUser(null)}
      />
    </div>
  );
};

export default Admin;
