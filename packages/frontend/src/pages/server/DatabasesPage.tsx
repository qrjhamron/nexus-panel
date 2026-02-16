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
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RotateIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { serversApi } from '../../api/servers';

interface Database {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  connectionString?: string;
}

export function DatabasesPage() {
  const { uuid = '' } = useParams<{ uuid: string }>();
  const [databases, setDatabases] = useState<Database[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [dbName, setDbName] = useState('');
  const [remote, setRemote] = useState('%');

  useEffect(() => {
    serversApi.getDatabases(uuid).then(({ data }) => setDatabases(data.data || [])).catch(() => {});
  }, [uuid]);

  const handleCreate = async () => {
    if (!dbName.trim()) return;
    await serversApi.createDatabase(uuid, { name: dbName.trim(), remote });
    setCreateOpen(false);
    setDbName('');
    const { data } = await serversApi.getDatabases(uuid);
    setDatabases(data.data || []);
  };

  const handleDelete = async (id: string) => {
    await serversApi.deleteDatabase(uuid, id);
    setDatabases((prev) => prev.filter((d) => d.id !== id));
  };

  const handleRotate = async (id: string) => {
    await serversApi.rotateDatabasePassword(uuid, id);
    const { data } = await serversApi.getDatabases(uuid);
    setDatabases(data.data || []);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Databases</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Create Database
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Host</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Connection</TableCell>
                <TableCell width={120}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {databases.map((db) => (
                <TableRow key={db.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{db.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={`${db.host}:${db.port}`} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="'JetBrains Mono', monospace" fontSize={12}>
                      {db.username}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Copy connection string">
                      <IconButton
                        size="small"
                        onClick={() => navigator.clipboard.writeText(db.connectionString || '')}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Rotate password">
                      <IconButton size="small" onClick={() => handleRotate(db.id)}>
                        <RotateIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDelete(db.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {databases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No databases</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create Database</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="Database Name" value={dbName}
            onChange={(e) => setDbName(e.target.value)} sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth label="Remote Access" value={remote}
            onChange={(e) => setRemote(e.target.value)}
            helperText="Use % to allow connections from any host"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
