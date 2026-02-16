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
  Tooltip,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import apiClient from '../../api/client';

interface ApiKey {
  id: string;
  description: string;
  prefix: string;
  lastUsedAt?: string;
  createdAt: string;
}

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [newKey, setNewKey] = useState('');

  useEffect(() => {
    apiClient.get('/account/api-keys').then(({ data }) => setKeys(data.data || [])).catch(() => {});
  }, []);

  const handleCreate = async () => {
    const { data } = await apiClient.post('/account/api-keys', { description });
    const result = data.data || data;
    setNewKey(result.key || result.token || '');
    setDescription('');
    const { data: refreshed } = await apiClient.get('/account/api-keys');
    setKeys(refreshed.data || []);
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(`/account/api-keys/${id}`);
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>API Keys</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setNewKey(''); setDialogOpen(true); }}>
          Create Key
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell>Key Prefix</TableCell>
                <TableCell>Last Used</TableCell>
                <TableCell>Created</TableCell>
                <TableCell width={64}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell><Typography variant="body2" fontWeight={600}>{key.description}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="caption" fontFamily="'JetBrains Mono', monospace">{key.prefix}...</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => handleDelete(key.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {keys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No API keys</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent>
          {newKey ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              <Typography variant="body2" mb={1}>Your API key (copy it now, it won&apos;t be shown again):</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontFamily="'JetBrains Mono', monospace" sx={{ wordBreak: 'break-all' }}>
                  {newKey}
                </Typography>
                <Tooltip title="Copy">
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(newKey)}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Alert>
          ) : (
            <TextField
              autoFocus fullWidth label="Description" value={description}
              onChange={(e) => setDescription(e.target.value)} sx={{ mt: 1 }}
              helperText="A short description of what this key is used for"
            />
          )}
        </DialogContent>
        <DialogActions>
          {newKey ? (
            <Button onClick={() => setDialogOpen(false)}>Done</Button>
          ) : (
            <>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleCreate} disabled={!description.trim()}>Create</Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
