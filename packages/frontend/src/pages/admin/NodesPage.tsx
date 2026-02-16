import { useState, useEffect, useCallback } from 'react';
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
  LinearProgress,
  Tooltip,
  CircularProgress,
  MenuItem,
  Switch,
  FormControlLabel,
  Checkbox,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Dns as NodeIcon,
} from '@mui/icons-material';
import { nodesApi } from '../../api/nodes';
import { locationsApi, type Location } from '../../api/locations';

interface Node {
  id: number;
  name: string;
  locationId?: string;
  locationName?: string;
  fqdn: string;
  port: number;
  scheme: string;
  isOnline: boolean;
  isMaintenance?: boolean;
  memoryMB: number;
  memoryUsedMB?: number;
  diskMB: number;
  diskUsedMB?: number;
  serversCount: number;
}

interface Allocation {
  id: number;
  ip: string;
  port: number;
  alias?: string;
  assigned: boolean;
}

interface NodeCredentials {
  tokenId: string;
  token: string;
}

export function NodesPage() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    fqdn: '',
    port: '8080',
    scheme: 'https',
    memoryMB: '0',
    diskMB: '0',
    locationId: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Credentials dialog
  const [credentials, setCredentials] = useState<NodeCredentials | null>(null);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Detail dialog
  const [detailNode, setDetailNode] = useState<Node | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [allocForm, setAllocForm] = useState({ ip: '', port: '' });

  // Delete dialog
  const [deleteConfirm, setDeleteConfirm] = useState<Node | null>(null);

  const fetchNodes = useCallback(async () => {
    try {
      const { data } = await nodesApi.list();
      setNodes(data.data || []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const { data } = await locationsApi.list();
      setLocations(data.data || []);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    fetchNodes();
    fetchLocations();
  }, [fetchNodes, fetchLocations]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.fqdn.trim()) {
      setFormError('Name and FQDN are required');
      return;
    }
    setSaving(true);
    try {
      const { data } = await nodesApi.create({
        name: form.name,
        fqdn: form.fqdn,
        port: Number(form.port),
        scheme: form.scheme,
        memoryMB: Number(form.memoryMB),
        diskMB: Number(form.diskMB),
        locationId: form.locationId || undefined,
      });
      setDialogOpen(false);
      const result = data.data || data;
      if (result.tokenId && result.token) {
        setCredentials({ tokenId: result.tokenId, token: result.token });
        setCredentialsSaved(false);
        setShowToken(false);
      }
      await fetchNodes();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create node';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await nodesApi.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      await fetchNodes();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete node';
      setFormError(message);
    }
  };

  const openDetailDialog = async (node: Node) => {
    setDetailNode(node);
    try {
      const { data } = await nodesApi.getAllocations(node.id);
      setAllocations(data.data || []);
    } catch {
      setAllocations([]);
    }
  };

  const handleCreateAllocation = async () => {
    if (!detailNode || !allocForm.ip || !allocForm.port) return;
    try {
      await nodesApi.createAllocation(detailNode.id, {
        ip: allocForm.ip,
        port: Number(allocForm.port),
      });
      const { data } = await nodesApi.getAllocations(detailNode.id);
      setAllocations(data.data || []);
      setAllocForm({ ip: '', port: '' });
    } catch {
      /* noop */
    }
  };

  const handleDeleteAllocation = async (allocationId: number) => {
    if (!detailNode) return;
    try {
      await nodesApi.deleteAllocation(detailNode.id, allocationId);
      setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
    } catch {
      /* noop */
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (node: Node): 'success' | 'error' | 'warning' => {
    if (node.isMaintenance) return 'warning';
    return node.isOnline ? 'success' : 'error';
  };

  const getStatusLabel = (node: Node): string => {
    if (node.isMaintenance) return 'Maintenance';
    return node.isOnline ? 'Online' : 'Offline';
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
          Nodes
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setForm({ name: '', fqdn: '', port: '8080', scheme: 'https', memoryMB: '0', diskMB: '0', locationId: '' });
            setFormError('');
            setDialogOpen(true);
          }}
        >
          Add Node
        </Button>
      </Box>

      {nodes.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <NodeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No nodes configured
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Nodes are the servers that run your game servers.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setForm({ name: '', fqdn: '', port: '8080', scheme: 'https', memoryMB: '0', diskMB: '0', locationId: '' });
                setFormError('');
                setDialogOpen(true);
              }}
            >
              Add your first node
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>FQDN</TableCell>
                  <TableCell>Servers</TableCell>
                  <TableCell>Memory</TableCell>
                  <TableCell>Disk</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell width={100}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nodes.map((node) => {
                  const memPct = node.memoryMB > 0 ? ((node.memoryUsedMB || 0) / node.memoryMB) * 100 : 0;
                  const diskPct = node.diskMB > 0 ? ((node.diskUsedMB || 0) / node.diskMB) * 100 : 0;
                  return (
                    <TableRow
                      key={node.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => openDetailDialog(node)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {node.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {node.locationName || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="'JetBrains Mono', monospace" fontSize={12}>
                          {node.scheme}://{node.fqdn}:{node.port}
                        </Typography>
                      </TableCell>
                      <TableCell>{node.serversCount}</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={memPct}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            color={memPct > 80 ? 'error' : 'primary'}
                          />
                          <Typography variant="caption" sx={{ minWidth: 40 }}>
                            {memPct.toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={diskPct}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            color={diskPct > 80 ? 'error' : 'primary'}
                          />
                          <Typography variant="caption" sx={{ minWidth: 40 }}>
                            {diskPct.toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: `${getStatusColor(node)}.main`,
                            }}
                          />
                          <Typography variant="caption">{getStatusLabel(node)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => navigate(`/admin/nodes/${node.id}`)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => setDeleteConfirm(node)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Node Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Node</DialogTitle>
        <DialogContent>
          {formError && (
            <Box sx={{ mb: 2, mt: 1, p: 1.5, borderRadius: 1, bgcolor: 'error.main', color: 'error.contrastText' }}>
              <Typography variant="body2">{formError}</Typography>
            </Box>
          )}
          {locations.length > 0 && (
            <TextField
              select
              fullWidth
              label="Location"
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              sx={{ mt: 1, mb: 2 }}
            >
              <MenuItem value="">None</MenuItem>
              {locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>
                  {loc.long} ({loc.short})
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            fullWidth
            label="Name"
            value={form.name}
            onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormError(''); }}
            sx={{ mt: locations.length > 0 ? 0 : 1, mb: 2 }}
          />
          <TextField
            fullWidth
            label="FQDN"
            value={form.fqdn}
            onChange={(e) => { setForm({ ...form, fqdn: e.target.value }); setFormError(''); }}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Port"
              value={form.port}
              onChange={(e) => setForm({ ...form, port: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.scheme === 'https'}
                  onChange={(e) => setForm({ ...form, scheme: e.target.checked ? 'https' : 'http' })}
                />
              }
              label="HTTPS"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Memory (MB)"
              value={form.memoryMB}
              onChange={(e) => setForm({ ...form, memoryMB: e.target.value })}
            />
            <TextField
              label="Disk (MB)"
              value={form.diskMB}
              onChange={(e) => setForm({ ...form, diskMB: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog
        open={!!credentials}
        maxWidth="sm"
        fullWidth
        onClose={() => {
          if (credentialsSaved) setCredentials(null);
        }}
      >
        <DialogTitle>Node Credentials</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Save these credentials now. They will not be shown again.
          </Typography>
          <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover', mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Token ID
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontFamily="'JetBrains Mono', monospace" sx={{ flex: 1, wordBreak: 'break-all' }}>
                {credentials?.tokenId}
              </Typography>
              <IconButton size="small" onClick={() => copyToClipboard(credentials?.tokenId || '')}>
                <CopyIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover', mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Token
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontFamily="'JetBrains Mono', monospace" sx={{ flex: 1, wordBreak: 'break-all' }}>
                {showToken ? credentials?.token : '••••••••••••••••••••••••'}
              </Typography>
              <IconButton size="small" onClick={() => setShowToken((s) => !s)}>
                {showToken ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
              <IconButton size="small" onClick={() => copyToClipboard(credentials?.token || '')}>
                <CopyIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <FormControlLabel
            control={<Checkbox checked={credentialsSaved} onChange={(e) => setCredentialsSaved(e.target.checked)} />}
            label="I have saved these credentials"
          />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" disabled={!credentialsSaved} onClick={() => setCredentials(null)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Node Detail Dialog */}
      <Dialog open={!!detailNode} onClose={() => setDetailNode(null)} maxWidth="md" fullWidth>
        <DialogTitle>{detailNode?.name}</DialogTitle>
        <DialogContent>
          {detailNode && (
            <>
              <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">FQDN</Typography>
                  <Typography variant="body2" fontFamily="'JetBrains Mono', monospace">
                    {detailNode.scheme}://{detailNode.fqdn}:{detailNode.port}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Chip
                    label={getStatusLabel(detailNode)}
                    size="small"
                    color={getStatusColor(detailNode)}
                    variant="outlined"
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Memory</Typography>
                  <Typography variant="body2">{(detailNode.memoryMB / 1024).toFixed(1)} GB</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Disk</Typography>
                  <Typography variant="body2">{(detailNode.diskMB / 1024).toFixed(1)} GB</Typography>
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Allocations
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  label="IP"
                  value={allocForm.ip}
                  onChange={(e) => setAllocForm({ ...allocForm, ip: e.target.value })}
                />
                <TextField
                  size="small"
                  label="Port"
                  value={allocForm.port}
                  onChange={(e) => setAllocForm({ ...allocForm, port: e.target.value })}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={handleCreateAllocation}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              {allocations.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>IP</TableCell>
                      <TableCell>Port</TableCell>
                      <TableCell>Alias</TableCell>
                      <TableCell>Assigned</TableCell>
                      <TableCell width={60} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allocations.map((alloc) => (
                      <TableRow key={alloc.id}>
                        <TableCell>{alloc.ip}</TableCell>
                        <TableCell>{alloc.port}</TableCell>
                        <TableCell>{alloc.alias || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={alloc.assigned ? 'Yes' : 'No'}
                            size="small"
                            color={alloc.assigned ? 'primary' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {!alloc.assigned && (
                            <IconButton size="small" color="error" onClick={() => handleDeleteAllocation(alloc.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No allocations
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailNode(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Node</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?
          </Typography>
          {(deleteConfirm?.serversCount ?? 0) > 0 && (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: 'error.main', color: 'error.contrastText' }}>
              <Typography variant="body2">
                This node has {deleteConfirm?.serversCount} server(s) assigned. You must delete or migrate them first.
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
