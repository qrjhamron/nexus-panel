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
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { locationsApi, type Location } from '../../api/locations';

export function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Location | null>(null);
  const [form, setForm] = useState({ short: '', long: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      const { data } = await locationsApi.list();
      setLocations(data.data || []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const openCreateDialog = () => {
    setEditingLocation(null);
    setForm({ short: '', long: '' });
    setFormError('');
    setDialogOpen(true);
  };

  const openEditDialog = (loc: Location) => {
    setEditingLocation(loc);
    setForm({ short: loc.short, long: loc.long });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const shortCode = form.short.toUpperCase().trim();
    if (!shortCode) {
      setFormError('Short code is required');
      return;
    }
    if (!/^[A-Z0-9_-]+$/.test(shortCode)) {
      setFormError('Short code must be uppercase letters, numbers, hyphens, or underscores');
      return;
    }
    if (!form.long.trim()) {
      setFormError('Full name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingLocation) {
        await locationsApi.update(editingLocation.id, { short: shortCode, long: form.long.trim() });
      } else {
        await locationsApi.create({ short: shortCode, long: form.long.trim() });
      }
      setDialogOpen(false);
      await fetchLocations();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save location';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await locationsApi.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      await fetchLocations();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete location';
      setFormError(message);
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
          Locations
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Add Location
        </Button>
      </Box>

      {locations.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <LocationIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No locations yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Locations help you organize your nodes by region or data center.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
              Create your first location
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Short Code</TableCell>
                  <TableCell>Full Name</TableCell>
                  <TableCell>Nodes</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell width={100}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {locations.map((loc) => (
                  <TableRow key={loc.id} hover>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        fontFamily="'JetBrains Mono', monospace"
                        fontSize={12}
                      >
                        {loc.short}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{loc.long}</Typography>
                    </TableCell>
                    <TableCell>{loc.nodeCount ?? 0}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(loc.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEditDialog(loc)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm(loc)}>
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
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingLocation ? 'Edit Location' : 'Create Location'}</DialogTitle>
        <DialogContent>
          {formError && (
            <Box sx={{ mb: 2, mt: 1, p: 1.5, borderRadius: 1, bgcolor: 'error.main', color: 'error.contrastText' }}>
              <Typography variant="body2">{formError}</Typography>
            </Box>
          )}
          <TextField
            fullWidth
            label="Short Code"
            placeholder="US-EAST"
            value={form.short}
            onChange={(e) => {
              setForm({ ...form, short: e.target.value.toUpperCase() });
              setFormError('');
            }}
            helperText="Uppercase identifier (e.g. US-EAST, EU-WEST)"
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Full Name"
            placeholder="US East Coast - New York"
            value={form.long}
            onChange={(e) => {
              setForm({ ...form, long: e.target.value });
              setFormError('');
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : editingLocation ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Location</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteConfirm?.long}</strong> ({deleteConfirm?.short})?
          </Typography>
          {(deleteConfirm?.nodeCount ?? 0) > 0 && (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: 'warning.main', color: 'warning.contrastText' }}>
              <Typography variant="body2">
                Warning: This location has {deleteConfirm?.nodeCount} node(s) assigned. You must reassign or
                delete them first.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
