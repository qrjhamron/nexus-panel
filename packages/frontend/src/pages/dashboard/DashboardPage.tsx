import { useState, useEffect } from 'react';
import { Box, Typography, TextField, InputAdornment, Grid } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { serversApi } from '../../api/servers';
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

export function DashboardPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    serversApi
      .list()
      .then(({ data }) => setServers(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = servers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.eggName?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Your Servers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {servers.length} server{servers.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
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
      </Box>

      {loading ? (
        <Typography color="text.secondary">Loading...</Typography>
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography color="text.secondary">
            {search ? 'No servers match your search.' : 'No servers found.'}
          </Typography>
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
