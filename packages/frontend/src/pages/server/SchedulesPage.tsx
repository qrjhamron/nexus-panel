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
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import cronstrue from 'cronstrue';
import { serversApi } from '../../api/servers';

interface Schedule {
  id: string;
  name: string;
  cron: string;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
}

export function SchedulesPage() {
  const { uuid = '' } = useParams<{ uuid: string }>();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [minute, setMinute] = useState('*/5');
  const [hour, setHour] = useState('*');
  const [dayOfMonth, setDayOfMonth] = useState('*');
  const [month, setMonth] = useState('*');
  const [dayOfWeek, setDayOfWeek] = useState('*');

  useEffect(() => {
    serversApi.getSchedules(uuid).then(({ data }) => setSchedules(data.data || [])).catch(() => {});
  }, [uuid]);

  const cronExpression = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
  let cronReadable = '';
  try { cronReadable = cronstrue.toString(cronExpression); } catch { cronReadable = 'Invalid expression'; }

  const handleSave = async () => {
    const payload = { name, cron: cronExpression, isActive: true };
    if (editId) {
      await serversApi.updateSchedule(uuid, editId, payload);
    } else {
      await serversApi.createSchedule(uuid, payload);
    }
    setDialogOpen(false);
    resetForm();
    const { data } = await serversApi.getSchedules(uuid);
    setSchedules(data.data || []);
  };

  const handleDelete = async (id: string) => {
    await serversApi.deleteSchedule(uuid, id);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const handleEdit = (schedule: Schedule) => {
    setEditId(schedule.id);
    setName(schedule.name);
    const parts = schedule.cron.split(' ');
    setMinute(parts[0] || '*/5');
    setHour(parts[1] || '*');
    setDayOfMonth(parts[2] || '*');
    setMonth(parts[3] || '*');
    setDayOfWeek(parts[4] || '*');
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditId(null);
    setName('');
    setMinute('*/5');
    setHour('*');
    setDayOfMonth('*');
    setMonth('*');
    setDayOfWeek('*');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Schedules</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setDialogOpen(true); }}>
          Create Schedule
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Schedule</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Run</TableCell>
                <TableCell width={100}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules.map((s) => (
                <TableRow key={s.id}>
                  <TableCell><Typography variant="body2" fontWeight={600}>{s.name}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="caption" fontFamily="'JetBrains Mono', monospace">
                      {s.cron}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={s.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={s.isActive ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : 'Never'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(s)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(s.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {schedules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No schedules</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Schedule Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField label="Minute" value={minute} onChange={(e) => setMinute(e.target.value)} size="small" />
            <TextField label="Hour" value={hour} onChange={(e) => setHour(e.target.value)} size="small" />
            <TextField label="Day (Month)" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} size="small" />
            <TextField label="Month" value={month} onChange={(e) => setMonth(e.target.value)} size="small" />
            <TextField label="Day (Week)" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} size="small" />
          </Box>
          <Typography variant="caption" color="text.secondary">{cronReadable}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>{editId ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
