import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Coins, Eye, Trash2, ArrowUpDown, Search, Filter, Sparkles } from 'lucide-react';

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

type SortField = 'credits' | 'created_at' | 'name' | 'email';
type SortDirection = 'asc' | 'desc';
type CreditFilter = 'all' | 'has_credits' | 'no_credits';

interface AdminUserTableProps {
  users: UserData[];
  loading: boolean;
  onViewImages: (user: UserData) => void;
  onViewScenes: (user: UserData) => void;
  onAdjustCredits: (user: UserData) => void;
  onDeleteUser: (user: UserData) => void;
}

export const AdminUserTable = ({
  users,
  loading,
  onViewImages,
  onViewScenes,
  onAdjustCredits,
  onDeleteUser,
}: AdminUserTableProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [creditFilter, setCreditFilter] = useState<CreditFilter>('all');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'credits' ? 'desc' : 'asc');
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.full_name && u.full_name.toLowerCase().includes(q)) ||
          (u.company_name && u.company_name.toLowerCase().includes(q))
      );
    }

    // Credit filter
    if (creditFilter === 'has_credits') {
      result = result.filter((u) => u.credits > 0);
    } else if (creditFilter === 'no_credits') {
      result = result.filter((u) => u.credits <= 0);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'credits':
          cmp = a.credits - b.credits;
          break;
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'name': {
          const nameA = (a.full_name || a.company_name || '').toLowerCase();
          const nameB = (b.full_name || b.company_name || '').toLowerCase();
          cmp = nameA.localeCompare(nameB, 'sv');
          break;
        }
        case 'email':
          cmp = a.email.localeCompare(b.email, 'sv');
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [users, searchQuery, sortField, sortDirection, creditFilter]);

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {children}
      <ArrowUpDown
        className={`h-3 w-3 ${
          sortField === field ? 'text-primary' : 'text-muted-foreground/50'
        }`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Laddar...</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök namn, email eller företag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={creditFilter}
          onValueChange={(v) => setCreditFilter(v as CreditFilter)}
        >
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla användare</SelectItem>
            <SelectItem value="has_credits">Har credits</SelectItem>
            <SelectItem value="no_credits">Inga credits</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Result count */}
      <div className="text-sm text-muted-foreground">
        Visar {filteredAndSortedUsers.length} av {users.length} användare
      </div>

      {filteredAndSortedUsers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Inga användare matchar filtret
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton field="name">Namn</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="email">E-post</SortButton>
              </TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Företag</TableHead>
              <TableHead className="text-center">
                <SortButton field="credits">Credits</SortButton>
              </TableHead>
              <TableHead>Roller</TableHead>
              <TableHead>
                <SortButton field="created_at">Registrerad</SortButton>
              </TableHead>
              <TableHead className="text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.full_name || user.company_name || '-'}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {user.customer_type === 'private' ? 'Privat' : 'Företag'}
                  </Badge>
                </TableCell>
                <TableCell>{user.company_name || '-'}</TableCell>
                <TableCell className="text-center">
                  <span
                    className={`font-bold ${
                      user.credits > 0
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }`}
                  >
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
                      onClick={() => onViewImages(user)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Bilder
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewScenes(user)}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      AI
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAdjustCredits(user)}
                    >
                      <Coins className="h-4 w-4 mr-1" />
                      Justera
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteUser(user)}
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
    </div>
  );
};
