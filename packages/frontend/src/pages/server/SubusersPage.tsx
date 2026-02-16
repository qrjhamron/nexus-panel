import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { PersonAdd as InviteIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { serversApi } from '../../api/servers';

interface Subuser {
  id: string;
  email: string;
  username: string;
  permissions: string[];
  createdAt: string;
}

const ALL_PERMISSIONS = [
  'control.console', 'control.start', 'control.stop', 'control.restart',
  'file.read', 'file.create', 'file.update', 'file.delete',
  'database.read', 'database.create', 'database.delete',
  'schedule.read', 'schedule.create', 'schedule.update', 'schedule.delete',
  'user.read', 'user.create', 'user.update', 'user.delete',
  'startup.read', 'startup.update',
  'settings.read',
];

export function SubusersPage() {
  const { uuid = '' } = useParams<{ uuid: string }>();
  const [subusers, setSubusers] = useState<Subuser[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    serversApi.getSubusers(uuid).then(({ data }) => setSubusers(data.data || [])).catch(() => {});
  }, [uuid]);

  const handleSave = async () => {
    if (editId) {
      await serversApi.updateSubuser(uuid, editId, { permissions });
    } else {
      await serversApi.addSubuser(uuid, { email, permissions });
    }
    setDialogOpen(false);
    setEditId(null);
    setEmail('');
    setPermissions([]);
    const { data } = await serversApi.getSubusers(uuid);
    setSubusers(data.data || []);
  };

  const handleEdit = (sub: Subuser) => {
    setEditId(sub.id);
    setEmail(sub.email);
    setPermissions([...sub.permissions]);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await serversApi.removeSubuser(uuid, id);
    setSubusers((prev) => prev.filter((s) => s.id !== id));
  };

  const togglePerm = (perm: string) => {
    setPermissions((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Subusers</Typography>
        <Button variant="contained" startIcon={<InviteIcon />} onClick={() => { setEditId(null); setEmail(''); setPermissions([]); setDialogOpen(true); }}>
          Invite User
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Permissions</TableCell>
                <TableCell>Added</TableCell>
                <TableCell width={100}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subusers.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{sub.username || sub.email}</Typography>
                    <Typography variant="caption" color="text.secondary">{sub.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {sub.permissions.slice(0, 3).map((p) => (
                        <Chip key={p} label={p} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                      ))}
                      {sub.permissions.length > 3 && (
                        <Chip label={`+${sub.permissions.length - 3}`} size="small" sx={{ fontSize: 11 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(sub)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(sub.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {subusers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No subusers</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Edit Subuser' : 'Invite Subuser'}</DialogTitle>
        <DialogContent>
          {!editId && (
            <TextField autoFocus fullWidth label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mt: 1, mb: 2 }} />
          )}
          <Typography variant="subtitle2" mb={1}>Permissions</Typography>
          <FormGroup>
            {ALL_PERMISSIONS.map((perm) => (
              <FormControlLabel
                key={perm}
                control={<Checkbox size="small" checked={permissions.includes(perm)} onChange={() => togglePerm(perm)} />}
                label={<Typography variant="body2" fontFamily="'JetBrains Mono', monospace" fontSize={12}>{perm}</Typography>}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>{editId ? 'Update' : 'Invite'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
