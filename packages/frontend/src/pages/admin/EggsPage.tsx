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
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Upload as ImportIcon,
  Download as ExportIcon,
} from '@mui/icons-material';
import { eggsApi } from '../../api/eggs';

interface Egg {
  id: number;
  name: string;
  description: string;
  dockerImage: string;
  startup: string;
  serversCount: number;
}

export function EggsPage() {
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [form, setForm] = useState({ name: '', description: '', dockerImage: '', startup: '' });

  useEffect(() => {
    eggsApi.list().then(({ data }) => setEggs(data.data || [])).catch(() => {});
  }, []);

  const handleCreate = async () => {
    await eggsApi.create(form);
    setDialogOpen(false);
    setForm({ name: '', description: '', dockerImage: '', startup: '' });
    const { data } = await eggsApi.list();
    setEggs(data.data || []);
  };

  const handleDelete = async (id: number) => {
    await eggsApi.delete(id);
    setEggs((prev) => prev.filter((e) => e.id !== id));
  };

  const handleExport = async (id: number) => {
    const { data } = await eggsApi.export(id);
    const blob = new Blob([JSON.stringify(data.data || data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `egg-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importJson);
      await eggsApi.import(parsed);
      setImportDialogOpen(false);
      setImportJson('');
      const { data } = await eggsApi.list();
      setEggs(data.data || []);
    } catch { /* noop */ }
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Eggs</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<ImportIcon />} onClick={() => setImportDialogOpen(true)}>Import</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>Create Egg</Button>
        </Box>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={48} />
                <TableCell>Name</TableCell>
                <TableCell>Docker Image</TableCell>
                <TableCell>Servers</TableCell>
                <TableCell width={120}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eggs.map((egg) => (
                <>
                  <TableRow key={egg.id} hover>
                    <TableCell>
                      <IconButton size="small" onClick={() => toggleExpand(egg.id)}>
                        {expanded.has(egg.id) ? <CollapseIcon /> : <ExpandIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell><Typography variant="body2" fontWeight={600}>{egg.name}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="caption" fontFamily="'JetBrains Mono', monospace">{egg.dockerImage}</Typography>
                    </TableCell>
                    <TableCell>{egg.serversCount}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleExport(egg.id)}><ExportIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(egg.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                  {expanded.has(egg.id) && (
                    <TableRow key={`${egg.id}-detail`}>
                      <TableCell colSpan={5} sx={{ py: 0 }}>
                        <Collapse in={expanded.has(egg.id)}>
                          <Box sx={{ p: 2 }}>
                            <Typography variant="caption" color="text.secondary">{egg.description}</Typography>
                            <Typography variant="caption" display="block" fontFamily="'JetBrains Mono', monospace" mt={1} sx={{ bgcolor: 'background.default', p: 1, borderRadius: 1 }}>
                              {egg.startup}
                            </Typography>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Egg</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} sx={{ mt: 1, mb: 2 }} />
          <TextField fullWidth label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={2} sx={{ mb: 2 }} />
          <TextField fullWidth label="Docker Image" value={form.dockerImage} onChange={(e) => setForm({ ...form, dockerImage: e.target.value })} sx={{ mb: 2 }} />
          <TextField fullWidth label="Startup Command" value={form.startup} onChange={(e) => setForm({ ...form, startup: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Egg</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline rows={8} label="Egg JSON"
            value={importJson} onChange={(e) => setImportJson(e.target.value)}
            sx={{ mt: 1 }}
            slotProps={{ input: { sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12 } } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleImport}>Import</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
