import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  RestartAlt as RestartIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { serversApi } from '../../api/servers';

interface ServerCardProps {
  server: {
    uuid: string;
    name: string;
    eggName?: string;
    nodeName?: string;
    status: string;
    resources?: {
      cpuPercent: number;
      memoryBytes: number;
      memoryLimitBytes: number;
    };
  };
}

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  running: 'success',
  starting: 'warning',
  stopping: 'warning',
  offline: 'default',
};

export function ServerCard({ server }: ServerCardProps) {
  const navigate = useNavigate();
  const cpu = server.resources?.cpuPercent ?? 0;
  const memUsed = server.resources?.memoryBytes ?? 0;
  const memLimit = server.resources?.memoryLimitBytes ?? 1;
  const memPercent = Math.min((memUsed / memLimit) * 100, 100);

  const handlePower = async (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await serversApi.sendPower(server.uuid, action);
    } catch { /* noop */ }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  };

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.15s',
        '&:hover': {
          borderColor: 'primary.main',
          transform: 'translateY(-2px)',
        },
      }}
      onClick={() => navigate(`/server/${server.uuid}/console`)}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {server.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {server.eggName || 'Unknown'} · {server.nodeName || 'Node'}
            </Typography>
          </Box>
          <Chip
            label={server.status}
            size="small"
            color={statusColors[server.status] ?? 'default'}
            variant="outlined"
            sx={{ fontSize: 11, height: 22 }}
          />
        </Box>

        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
            <Typography variant="caption" color="text.secondary">
              CPU
            </Typography>
            <Typography variant="caption" fontFamily="'JetBrains Mono', monospace" fontWeight={500}>
              {cpu.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(cpu, 100)}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { borderRadius: 2 },
            }}
          />
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
            <Typography variant="caption" color="text.secondary">
              Memory
            </Typography>
            <Typography variant="caption" fontFamily="'JetBrains Mono', monospace" fontWeight={500}>
              {formatBytes(memUsed)} / {formatBytes(memLimit)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={memPercent}
            color="secondary"
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { borderRadius: 2 },
            }}
          />
        </Box>
      </CardContent>
      <CardActions sx={{ px: 2, pt: 0, pb: 1.5, justifyContent: 'flex-end' }}>
        <Tooltip title="Start">
          <IconButton size="small" color="success" onClick={(e) => handlePower('start', e)} disabled={server.status === 'running'}>
            <StartIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Stop">
          <IconButton size="small" color="warning" onClick={(e) => handlePower('stop', e)} disabled={server.status === 'offline'}>
            <StopIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Restart">
          <IconButton size="small" color="info" onClick={(e) => handlePower('restart', e)} disabled={server.status === 'offline'}>
            <RestartIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}
