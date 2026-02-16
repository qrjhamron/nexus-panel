import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Divider,
  Alert,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useAuthStore } from '../../stores/auth.store';
import { authApi } from '../../api/auth';
import apiClient from '../../api/client';

export function AccountSettingsPage() {
  const { user, setUser } = useAuthStore();
  const [email, setEmail] = useState(user?.email || '');
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
  const [twoFactorQr, setTwoFactorQr] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const { data } = await apiClient.patch('/account', { email, username });
      setUser(data.data || data);
      setMessage({ type: 'success', text: 'Profile updated' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.put('/account/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setMessage({ type: 'success', text: 'Password changed' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const { data } = await authApi.setup2FA();
      setTwoFactorQr(data.data?.qrCodeUrl || data.qrCodeUrl || '');
      setTwoFactorDialogOpen(true);
    } catch { /* noop */ }
  };

  const handleVerify2FA = async () => {
    try {
      await authApi.verify2FA(twoFactorCode);
      setTwoFactorDialogOpen(false);
      setTwoFactorCode('');
      setUser(user ? { ...user, twoFactorEnabled: true } : null);
    } catch { /* noop */ }
  };

  const handleDisable2FA = async () => {
    try {
      await authApi.disable2FA(currentPassword);
      setUser(user ? { ...user, twoFactorEnabled: false } : null);
    } catch { /* noop */ }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>Account Settings</Typography>

      {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Profile</Typography>
          <TextField fullWidth label="Email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Username" value={username} onChange={(e) => setUsername(e.target.value)} sx={{ mb: 2 }} />
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveProfile} disabled={saving}>
            Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Change Password</Typography>
          <TextField fullWidth label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} sx={{ mb: 2 }} />
          <Button variant="contained" onClick={handleChangePassword} disabled={saving || !currentPassword || !newPassword}>
            Change Password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Two-Factor Authentication</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="body2">
                {user?.twoFactorEnabled ? '2FA is currently enabled' : '2FA is not enabled'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Add an extra layer of security to your account
              </Typography>
            </Box>
            {user?.twoFactorEnabled ? (
              <Button variant="outlined" color="error" onClick={handleDisable2FA}>Disable 2FA</Button>
            ) : (
              <Button variant="contained" onClick={handleSetup2FA}>Enable 2FA</Button>
            )}
          </Box>
        </CardContent>
      </Card>

      <Dialog open={twoFactorDialogOpen} onClose={() => setTwoFactorDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
        <DialogContent>
          {twoFactorQr && (
            <Box textAlign="center" mb={2}>
              <img src={twoFactorQr} alt="2FA QR Code" style={{ maxWidth: 200 }} />
            </Box>
          )}
          <TextField fullWidth label="Verification Code" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} placeholder="000000" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTwoFactorDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleVerify2FA}>Verify</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
