import { useState, useEffect, useCallback } from 'react';
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
  Avatar,
  CircularProgress,
  TablePagination,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  People as UsersIcon,
} from '@mui/icons-material';
import apiClient from '../../api/client';

interface User {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  serversCount: number;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', username: '', password: '', isAdmin: false });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ email: '', username: '', password: '', isAdmin: false });
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/admin/users');
      setUsers(data.data || []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const paginatedUsers = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleCreate = async () => {
    if (!createForm.email || !createForm.username || !createForm.password) {
      setCreateError('All fields are required');
      return;
    }
    setCreating(true);
    try {
      await apiClient.post('/admin/users', createForm);
      setCreateOpen(false);
      setCreateForm({ email: '', username: '', password: '', isAdmin: false });
      await fetchUsers();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create user';
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        email: editForm.email,
        username: editForm.username,
        isAdmin: editForm.isAdmin,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }
      await apiClient.patch(`/admin/users/${editUser.id}`, payload);
      setEditUser(null);
      await fetchUsers();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update user';
      setEditError(message);
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (user: User) => {
    setEditUser(user);
    setEditForm({ email: user.email, username: user.username, password: '', isAdmin: user.isAdmin });
    setEditError('');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await apiClient.delete(`/admin/users/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      await fetchUsers();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete user';
      setEditError(message);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Users
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Search users..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            size="small"
            sx={{ width: 280 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setCreateForm({ email: '', username: '', password: '', isAdmin: false });
              setCreateError('');
              setCreateOpen(true);
            }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {users.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <UsersIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No users found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Create your first user to get started.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setCreateForm({ email: '', username: '', password: '', isAdmin: false });
                setCreateError('');
                setCreateOpen(true);
              }}
            >
              Create User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Servers</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell width={100}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedUsers.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          src={u.avatarUrl}
                          sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}
                        >
                          {u.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>
                          {u.username}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{u.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.isAdmin ? 'Admin' : 'User'}
                        size="small"
                        color={u.isAdmin ? 'primary' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{u.serversCount}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEditDialog(u)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm(u)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </CardContent>
        </Card>
      )}

      {/* Create User Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create User</DialogTitle>
        <DialogContent>
          {createError && (
            <Box sx={{ mb: 2, mt: 1, p: 1.5, borderRadius: 1, bgcolor: 'error.main', color: 'error.contrastText' }}>
              <Typography variant="body2">{createError}</Typography>
            </Box>
          )}
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={createForm.email}
            onChange={(e) => { setCreateForm({ ...createForm, email: e.target.value }); setCreateError(''); }}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Username"
            value={createForm.username}
            onChange={(e) => { setCreateForm({ ...createForm, username: e.target.value }); setCreateError(''); }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={createForm.password}
            onChange={(e) => { setCreateForm({ ...createForm, password: e.target.value }); setCreateError(''); }}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={createForm.isAdmin}
                onChange={(e) => setCreateForm({ ...createForm, isAdmin: e.target.checked })}
              />
            }
            label="Administrator"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}>
            {creating ? <CircularProgress size={20} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {editError && (
            <Box sx={{ mb: 2, mt: 1, p: 1.5, borderRadius: 1, bgcolor: 'error.main', color: 'error.contrastText' }}>
              <Typography variant="body2">{editError}</Typography>
            </Box>
          )}
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(e) => { setEditForm({ ...editForm, email: e.target.value }); setEditError(''); }}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Username"
            value={editForm.username}
            onChange={(e) => { setEditForm({ ...editForm, username: e.target.value }); setEditError(''); }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={editForm.password}
            onChange={(e) => { setEditForm({ ...editForm, password: e.target.value }); setEditError(''); }}
            helperText="Leave blank to keep current password"
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editForm.isAdmin}
                onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })}
              />
            }
            label="Administrator"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleEdit} disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteConfirm?.username}</strong>?
          </Typography>
          {(deleteConfirm?.serversCount ?? 0) > 0 && (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: 'error.main', color: 'error.contrastText' }}>
              <Typography variant="body2">
                This user owns {deleteConfirm?.serversCount} server(s). You must delete or reassign them first.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={(deleteConfirm?.serversCount ?? 0) > 0}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
