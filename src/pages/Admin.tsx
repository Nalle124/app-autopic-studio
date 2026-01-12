import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { Users, Image, CheckCircle, XCircle, ArrowLeft, Images, Coins, Plus, Minus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

const Admin = () => {
  const { isAdmin, loading: authLoading, adminLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCredits, setTotalCredits] = useState(0);
  
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

  useEffect(() => {
    // Wait for both auth and admin check to complete
    if (!authLoading && !adminLoading && !isAdmin) {
      toast.error('Du har inte behörighet att se den här sidan');
      navigate('/');
    }
  }, [isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load users with credits
      const { data: usersData, error: usersError } = await supabase.rpc('admin_get_users_with_credits');
      if (usersError) throw usersError;
      setUsers(usersData || []);
      
      // Calculate total credits
      const total = (usersData || []).reduce((sum: number, user: UserData) => sum + (user.credits || 0), 0);
      setTotalCredits(total);

      // Load stats
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

  const initiateAdjustment = (isPositive: boolean) => {
    if (!selectedUser || !creditAmount) return;
    
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Ange ett giltigt positivt antal');
      return;
    }
    
    // Validate maximum limit
    if (amount > MAX_CREDIT_ADJUSTMENT) {
      toast.error(`Maximal justering är ${MAX_CREDIT_ADJUSTMENT.toLocaleString('sv-SE')} credits per operation`);
      return;
    }
    
    // Require description for adjustments
    if (!creditDescription.trim()) {
      toast.error('Ange en beskrivning för justeringen');
      return;
    }
    
    // Show confirmation for large adjustments
    if (amount > LARGE_ADJUSTMENT_THRESHOLD) {
      setPendingAdjustment({ isPositive });
      return;
    }
    
    // Proceed directly for small adjustments
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
      // Use edge function that also cancels Stripe subscriptions
      const { error } = await supabase.functions.invoke('admin-delete-user', {
        body: { targetUserId: userToDelete.id }
      });

      if (error) throw error;

      toast.success(`Användare ${userToDelete.email} raderad och Stripe-abonnemang avslutat`);
      setUserToDelete(null);
      loadData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Kunde inte radera användare');
    } finally {
      setDeleting(false);
    }
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
                Alla registrerade användare, deras credits och roller. Klicka på en användare för att justera credits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Laddar...
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Inga användare hittades
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Namn</TableHead>
                      <TableHead>E-post</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Företag</TableHead>
                      <TableHead className="text-center">Credits</TableHead>
                      <TableHead>Roller</TableHead>
                      <TableHead>Registrerad</TableHead>
                      <TableHead className="text-right">Åtgärder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.customer_type === 'private' ? 'Privat' : 'Företag'}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.company_name || '-'}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${user.credits > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {user.credits}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {user.roles?.map((role) => (
                              <Badge 
                                key={role}
                                variant={role === 'admin' ? 'default' : 'secondary'}
                              >
                                {role === 'admin' ? 'Admin' : 'Användare'}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString('sv-SE')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Coins className="h-4 w-4 mr-1" />
                              Justera
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUserToDelete(user)}
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              disabled={user.roles?.includes('admin')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
    </div>
  );
};

export default Admin;