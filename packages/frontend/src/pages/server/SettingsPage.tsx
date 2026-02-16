import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
} from '@mui/material';
import { Save as SaveIcon, Replay as ReinstallIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { serversApi } from '../../api/servers';

export function SettingsPage() {
  const { uuid = '' } = useParams<{ uuid: string }>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [reinstallOpen, setReinstallOpen] = useState(false);

  useEffect(() => {
    serversApi.getSettings(uuid).then(({ data }) => {
      const settings = data.data || data;
      setName(settings.name || '');
      setDescription(settings.description || '');
    }).catch(() => {});
  }, [uuid]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await serversApi.updateSettings(uuid, { name, description });
    } finally {
      setSaving(false);
    }
  };

  const handleReinstall = async () => {
    await serversApi.reinstall(uuid);
    setReinstallOpen(false);
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>Server Settings</Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>General</Typography>
          <TextField
            fullWidth label="Server Name" value={name}
            onChange={(e) => setName(e.target.value)} sx={{ mb: 2 }}
          />
          <TextField
            fullWidth label="Description" value={description}
            onChange={(e) => setDescription(e.target.value)} multiline rows={3} sx={{ mb: 2 }}
          />
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ borderColor: 'warning.main' }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={1} color="warning.main">
            Danger Zone
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="body2" fontWeight={600}>Reinstall Server</Typography>
              <Typography variant="caption" color="text.secondary">
                This will delete all server files and reinstall from the egg.
              </Typography>
            </Box>
            <Button
              variant="outlined" color="warning" startIcon={<ReinstallIcon />}
              onClick={() => setReinstallOpen(true)}
            >
              Reinstall
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={reinstallOpen} onClose={() => setReinstallOpen(false)}>
        <DialogTitle>Confirm Reinstall</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>This action is irreversible!</Alert>
          <DialogContentText>
            This will delete all server files and reinstall from the egg configuration. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReinstallOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleReinstall}>Reinstall</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
