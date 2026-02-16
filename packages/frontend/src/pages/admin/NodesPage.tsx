import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { nodesApi } from '../../api/nodes';

interface Node {
  id: number;
  name: string;
  fqdn: string;
  port: number;
  scheme: string;
  isOnline: boolean;
  memoryMB: number;
  diskMB: number;
  serversCount: number;
}

export function NodesPage() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', fqdn: '', port: '8080', scheme: 'https', memoryMB: '0', diskMB: '0' });

  useEffect(() => {
    nodesApi.list().then(({ data }) => setNodes(data.data || [])).catch(() => {});
  }, []);

  const handleCreate = async () => {
    await nodesApi.create({
      name: form.name,
      fqdn: form.fqdn,
      port: Number(form.port),
      scheme: form.scheme,
      memoryMB: Number(form.memoryMB),
      diskMB: Number(form.diskMB),
    });
    setDialogOpen(false);
    const { data } = await nodesApi.list();
    setNodes(data.data || []);
  };

  const handleDelete = async (id: number) => {
    await nodesApi.delete(id);
    setNodes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Nodes</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add Node
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>FQDN</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Memory</TableCell>
                <TableCell>Disk</TableCell>
                <TableCell>Servers</TableCell>
                <TableCell width={100}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nodes.map((node) => (
                <TableRow key={node.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/nodes/${node.id}`)}>
                  <TableCell><Typography variant="body2" fontWeight={600}>{node.name}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="'JetBrains Mono', monospace" fontSize={12}>
                      {node.scheme}://{node.fqdn}:{node.port}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={node.isOnline ? 'Online' : 'Offline'} size="small" color={node.isOnline ? 'success' : 'error'} variant="outlined" />
                  </TableCell>
                  <TableCell>{(node.memoryMB / 1024).toFixed(1)} GB</TableCell>
                  <TableCell>{(node.diskMB / 1024).toFixed(1)} GB</TableCell>
                  <TableCell>{node.serversCount}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={() => navigate(`/admin/nodes/${node.id}`)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(node.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {nodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No nodes configured</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Node</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} sx={{ mt: 1, mb: 2 }} />
          <TextField fullWidth label="FQDN" value={form.fqdn} onChange={(e) => setForm({ ...form, fqdn: e.target.value })} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField label="Port" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} />
            <TextField label="Scheme" value={form.scheme} onChange={(e) => setForm({ ...form, scheme: e.target.value })} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Memory (MB)" value={form.memoryMB} onChange={(e) => setForm({ ...form, memoryMB: e.target.value })} />
            <TextField label="Disk (MB)" value={form.diskMB} onChange={(e) => setForm({ ...form, diskMB: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
