import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Grid,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  DnsOutlined as ServersIcon,
  Add as AddIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { serversApi } from '../../api/servers';
import { useAuthStore } from '../../stores/auth.store';
import { ServerCard } from '../../components/server/ServerCard';

interface Server {
  uuid: string;
  name: string;
  eggName?: string;
  nodeName?: string;
  status: string;
  resources?: {
    cpuPercent: number;
    memoryBytes: number;
    memoryLimitBytes: number;
  };
}

export function ServersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [servers, setServers] = useState<Server[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await serversApi.list();
      setServers(data.data || []);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load servers';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const filtered = servers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.eggName?.toLowerCase().includes(search.toLowerCase()),
  );

  if (error) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
          My Servers
        </Typography>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <ErrorIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {error}
            </Typography>
            <Button variant="contained" onClick={fetchServers}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            My Servers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {servers.length} server{servers.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search servers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: 280 }}
          />
          {user?.isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/admin/servers')}
            >
              New Server
            </Button>
          )}
        </Box>
      </Box>

      {loading ? (
        <Grid container spacing={2.5}>
          {[0, 1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={28} />
                  <Skeleton variant="text" width="40%" height={18} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" height={4} sx={{ mb: 1.5, borderRadius: 2 }} />
                  <Skeleton variant="rectangular" height={4} sx={{ borderRadius: 2 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : servers.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <ServersIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No servers yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first server to get started
            </Typography>
            {user?.isAdmin && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/admin/servers')}
              >
                Create Server
              </Button>
            )}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography color="text.secondary">No servers match your search.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map((server) => (
            <Grid key={server.uuid} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
              <ServerCard server={server} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
