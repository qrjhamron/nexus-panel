import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Dns as NodesIcon,
  Storage as ServersIcon,
  People as UsersIcon,
  Memory as MemoryIcon,
} from '@mui/icons-material';
import apiClient from '../../api/client';

interface OverviewStats {
  totalNodes: number;
  totalServers: number;
  totalUsers: number;
  totalMemoryMB: number;
  usedMemoryMB: number;
}

interface NodeHealth {
  id: number;
  name: string;
  fqdn: string;
  isOnline: boolean;
  cpuPercent: number;
  memoryPercent: number;
  serversCount: number;
}

interface AuditEntry {
  id: string;
  action: string;
  user: string;
  createdAt: string;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}22`, color, display: 'flex' }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={700}>{value}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [nodes, setNodes] = useState<NodeHealth[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  useEffect(() => {
    apiClient.get('/admin/overview').then(({ data }) => {
      const d = data.data || data;
      setStats(d.stats || d);
      setNodes(d.nodes || []);
      setAudit(d.recentAudit || []);
    }).catch(() => {});
  }, []);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>Admin Dashboard</Typography>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard icon={<NodesIcon />} label="Nodes" value={stats?.totalNodes ?? 0} color="#00E5FF" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard icon={<ServersIcon />} label="Servers" value={stats?.totalServers ?? 0} color="#7C4DFF" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard icon={<UsersIcon />} label="Users" value={stats?.totalUsers ?? 0} color="#00E676" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            icon={<MemoryIcon />}
            label="Memory"
            value={`${((stats?.usedMemoryMB ?? 0) / 1024).toFixed(1)} / ${((stats?.totalMemoryMB ?? 0) / 1024).toFixed(1)} GB`}
            color="#FFAB00"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Node Health</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Node</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>CPU</TableCell>
                    <TableCell>Memory</TableCell>
                    <TableCell>Servers</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {nodes.map((node) => (
                    <TableRow key={node.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{node.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{node.fqdn}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={node.isOnline ? 'Online' : 'Offline'}
                          size="small"
                          color={node.isOnline ? 'success' : 'error'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={node.cpuPercent}
                            sx={{ flex: 1, height: 4, borderRadius: 2 }}
                          />
                          <Typography variant="caption" fontFamily="monospace">{node.cpuPercent.toFixed(0)}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={node.memoryPercent}
                            color="secondary"
                            sx={{ flex: 1, height: 4, borderRadius: 2 }}
                          />
                          <Typography variant="caption" fontFamily="monospace">{node.memoryPercent.toFixed(0)}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{node.serversCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Recent Activity</Typography>
              {audit.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>No recent activity</Typography>
              ) : (
                audit.map((entry) => (
                  <Box key={entry.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box>
                      <Typography variant="body2">{entry.action}</Typography>
                      <Typography variant="caption" color="text.secondary">{entry.user}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(entry.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
