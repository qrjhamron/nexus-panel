import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Skeleton } from '@mui/material';
import {
  DnsOutlined as ServersIcon,
  PlayArrow as RunningIcon,
  Memory as RamIcon,
  Storage as DiskIcon,
  ErrorOutline as ErrorIcon,
  ArrowForward as ArrowIcon,
  Rocket as RocketIcon,
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
  memory?: number;
  disk?: number;
  resources?: {
    cpuPercent: number;
    memoryBytes: number;
    memoryLimitBytes: number;
  };
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.main',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [servers, setServers] = useState<Server[]>([]);
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
        'Failed to load dashboard data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const totalServers = servers.length;
  const runningServers = servers.filter((s) => s.status === 'running').length;
  const totalRamMB = servers.reduce((sum, s) => sum + (s.memory || 0), 0);
  const totalDiskMB = servers.reduce((sum, s) => sum + (s.disk || 0), 0);

  const formatGB = (mb: number) => {
    if (mb < 1024) return `${mb} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const previewServers = servers.slice(0, 4);

  if (error) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          Welcome back, {user?.username}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Here&apos;s an overview of your servers
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
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Welcome back, {user?.username}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Here&apos;s an overview of your servers
      </Typography>

      {loading ? (
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {[0, 1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Skeleton variant="rounded" width={48} height={48} />
                  <Box>
                    <Skeleton variant="text" width={80} height={18} />
                    <Skeleton variant="text" width={50} height={32} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard icon={<ServersIcon />} label="Total Servers" value={String(totalServers)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard icon={<RunningIcon />} label="Running Servers" value={String(runningServers)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard icon={<RamIcon />} label="Total RAM" value={formatGB(totalRamMB)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard icon={<DiskIcon />} label="Total Disk" value={formatGB(totalDiskMB)} />
            </Grid>
          </Grid>

          {servers.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <RocketIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Get Started
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  You don&apos;t have any servers yet. Head to the servers page to get started.
                </Typography>
                <Button variant="contained" onClick={() => navigate('/servers')}>
                  View Servers
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Your Servers
                </Typography>
                <Button
                  size="small"
                  endIcon={<ArrowIcon />}
                  onClick={() => navigate('/servers')}
                >
                  View All
                </Button>
              </Box>
              <Grid container spacing={2.5}>
                {previewServers.map((server) => (
                  <Grid key={server.uuid} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
                    <ServerCard server={server} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
