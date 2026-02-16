import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  type SelectChangeEvent,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import apiClient from '../../api/client';

interface AuditEntry {
  id: string;
  action: string;
  subaction?: string;
  userId: string;
  username: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

const actionColors: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  create: 'success',
  update: 'info',
  delete: 'error',
  login: 'primary',
  power: 'warning',
};

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    apiClient.get('/admin/audit-log', { params: { perPage: 50 } }).then(({ data }) => setEntries(data.data || [])).catch(() => {});
  }, []);

  const filtered = entries.filter((e) => {
    const matchesSearch = !search || e.action.includes(search) || e.username.includes(search) || e.ipAddress.includes(search);
    const matchesAction = !actionFilter || e.action.startsWith(actionFilter);
    return matchesSearch && matchesAction;
  });

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>Audit Log</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          sx={{ flex: 1 }}
        />
        <FormControl sx={{ minWidth: 160 }} size="small">
          <InputLabel>Action Type</InputLabel>
          <Select
            label="Action Type"
            value={actionFilter}
            onChange={(e: SelectChangeEvent) => setActionFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="create">Create</MenuItem>
            <MenuItem value="update">Update</MenuItem>
            <MenuItem value="delete">Delete</MenuItem>
            <MenuItem value="login">Login</MenuItem>
            <MenuItem value="power">Power</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Action</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Target</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((entry) => {
                const actionBase = entry.action.split(':')[0] || '';
                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Chip
                        label={entry.action}
                        size="small"
                        color={actionColors[actionBase] || 'default'}
                        variant="outlined"
                        sx={{ fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{entry.username}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {entry.targetType ? `${entry.targetType}:${entry.targetId}` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontFamily="'JetBrains Mono', monospace">
                        {entry.ipAddress}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(entry.createdAt).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
