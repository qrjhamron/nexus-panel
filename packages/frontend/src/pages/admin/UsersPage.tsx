import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  SupervisorAccount as ImpersonateIcon,
} from '@mui/icons-material';
import apiClient from '../../api/client';

interface User {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  serversCount: number;
  createdAt: string;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiClient.get('/admin/users').then(({ data }) => setUsers(data.data || [])).catch(() => {});
  }, []);

  const filtered = users.filter(
    (u) => u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleImpersonate = async (id: string) => {
    try {
      const { data } = await apiClient.post(`/admin/users/${id}/impersonate`);
      window.location.href = '/dashboard';
    } catch { /* noop */ }
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(`/admin/users/${id}`);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Users</Typography>
        <TextField placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 280 }} />
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Servers</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell width={100}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell><Typography variant="body2" fontWeight={600}>{u.username}</Typography></TableCell>
                  <TableCell><Typography variant="caption">{u.email}</Typography></TableCell>
                  <TableCell>
                    <Chip label={u.isAdmin ? 'Admin' : 'User'} size="small" color={u.isAdmin ? 'primary' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell>{u.serversCount}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Impersonate">
                      <IconButton size="small" onClick={() => handleImpersonate(u.id)}>
                        <ImpersonateIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDelete(u.id)}>
                        <DeleteIcon fontSize="small" />
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
