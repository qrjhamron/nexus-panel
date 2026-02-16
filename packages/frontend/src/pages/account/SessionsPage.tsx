import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import { Delete as RevokeIcon } from '@mui/icons-material';
import { authApi } from '../../api/auth';

interface Session {
  id: string;
  ipAddress: string;
  userAgent: string;
  lastActive: string;
  isCurrent: boolean;
  createdAt: string;
}

function parseUserAgent(ua: string): string {
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
}

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    authApi.listSessions().then(({ data }) => setSessions(data.data || [])).catch(() => {});
  }, []);

  const handleRevoke = async (id: string) => {
    await authApi.revokeSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>Active Sessions</Typography>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Browser</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>Last Active</TableCell>
                <TableCell>Created</TableCell>
                <TableCell width={80}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">{parseUserAgent(session.userAgent)}</Typography>
                      {session.isCurrent && <Chip label="Current" size="small" color="primary" sx={{ height: 20, fontSize: 11 }} />}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontFamily="'JetBrains Mono', monospace">{session.ipAddress}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(session.lastActive).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(session.createdAt).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {!session.isCurrent && (
                      <Tooltip title="Revoke session">
                        <IconButton size="small" color="error" onClick={() => handleRevoke(session.id)}>
                          <RevokeIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No active sessions</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
