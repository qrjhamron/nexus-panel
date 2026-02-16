import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Search as SearchIcon, Delete as DeleteIcon, OpenInNew as OpenIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';

interface Server {
  uuid: string;
  name: string;
  status: string;
  user: { email: string };
  node: { name: string };
  eggName: string;
  memoryMB: number;
  diskMB: number;
}

export function ServersPage() {
  const navigate = useNavigate();
  const [servers, setServers] = useState<Server[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiClient.get('/admin/servers').then(({ data }) => setServers(data.data || [])).catch(() => {});
  }, []);

  const filtered = servers.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.user.email.includes(search.toLowerCase()),
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>All Servers</Typography>
        <TextField
          placeholder="Search servers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          sx={{ width: 280 }}
        />
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Node</TableCell>
                <TableCell>Egg</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Resources</TableCell>
                <TableCell width={80}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.uuid} hover>
                  <TableCell><Typography variant="body2" fontWeight={600}>{s.name}</Typography></TableCell>
                  <TableCell><Typography variant="caption">{s.user.email}</Typography></TableCell>
                  <TableCell><Chip label={s.node.name} size="small" variant="outlined" /></TableCell>
                  <TableCell><Typography variant="caption">{s.eggName}</Typography></TableCell>
                  <TableCell>
                    <Chip
                      label={s.status}
                      size="small"
                      color={s.status === 'running' ? 'success' : s.status === 'offline' ? 'default' : 'warning'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontFamily="monospace">
                      {s.memoryMB}MB / {(s.diskMB / 1024).toFixed(0)}GB
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Open">
                      <IconButton size="small" onClick={() => navigate(`/server/${s.uuid}/console`)}>
                        <OpenIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
