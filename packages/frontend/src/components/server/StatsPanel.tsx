import { Box, Typography, LinearProgress, useTheme } from '@mui/material';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface StatsData {
  time: number;
  cpu: number;
  memory: number;
}

interface StatsPanelProps {
  history: StatsData[];
  currentStats: {
    cpuPercent: number;
    memoryBytes: number;
    memoryLimitBytes: number;
    diskBytes: number;
    diskLimitBytes: number;
    networkRxBytes: number;
    networkTxBytes: number;
    uptime: number;
  } | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatRate(bytes: number): string {
  return `${formatBytes(bytes)}/s`;
}

export function StatsPanel({ history, currentStats }: StatsPanelProps) {
  const theme = useTheme();

  const cpuColor = theme.palette.primary.main;
  const memColor = theme.palette.secondary.main;

  const memPercent = currentStats
    ? Math.min((currentStats.memoryBytes / currentStats.memoryLimitBytes) * 100, 100)
    : 0;
  const diskPercent = currentStats
    ? Math.min((currentStats.diskBytes / currentStats.diskLimitBytes) * 100, 100)
    : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* CPU Chart */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            CPU USAGE
          </Typography>
          <Typography variant="caption" fontFamily="'JetBrains Mono', monospace">
            {currentStats?.cpuPercent.toFixed(1) ?? '0.0'}%
          </Typography>
        </Box>
        <Box sx={{ height: 80, bgcolor: 'background.default', borderRadius: 1.5, p: 0.5 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cpuColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={cpuColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{ background: '#1A2233', border: 'none', borderRadius: 8, fontSize: 12 }}
                labelFormatter={() => ''}
                formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, 'CPU']}
              />
              <Area
                type="monotone"
                dataKey="cpu"
                stroke={cpuColor}
                fill="url(#cpuGrad)"
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* Memory Chart */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            MEMORY
          </Typography>
          <Typography variant="caption" fontFamily="'JetBrains Mono', monospace">
            {currentStats ? formatBytes(currentStats.memoryBytes) : '0 B'} /{' '}
            {currentStats ? formatBytes(currentStats.memoryLimitBytes) : '0 B'}
          </Typography>
        </Box>
        <Box sx={{ height: 80, bgcolor: 'background.default', borderRadius: 1.5, p: 0.5 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={memColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={memColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{ background: '#1A2233', border: 'none', borderRadius: 8, fontSize: 12 }}
                labelFormatter={() => ''}
                formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, 'Memory']}
              />
              <Area
                type="monotone"
                dataKey="memory"
                stroke={memColor}
                fill="url(#memGrad)"
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* Network I/O */}
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
          NETWORK I/O
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              ↓ Inbound
            </Typography>
            <Typography variant="body2" fontFamily="'JetBrains Mono', monospace">
              {currentStats ? formatRate(currentStats.networkRxBytes) : '0 B/s'}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              ↑ Outbound
            </Typography>
            <Typography variant="body2" fontFamily="'JetBrains Mono', monospace">
              {currentStats ? formatRate(currentStats.networkTxBytes) : '0 B/s'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Disk Usage */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            DISK USAGE
          </Typography>
          <Typography variant="caption" fontFamily="'JetBrains Mono', monospace">
            {diskPercent.toFixed(1)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={diskPercent}
          color={diskPercent > 90 ? 'error' : diskPercent > 70 ? 'warning' : 'primary'}
          sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}
        />
        <Typography variant="caption" color="text.secondary" mt={0.5}>
          {currentStats ? formatBytes(currentStats.diskBytes) : '0 B'} /{' '}
          {currentStats ? formatBytes(currentStats.diskLimitBytes) : '0 B'}
        </Typography>
      </Box>

      {/* Memory Bar */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            MEMORY BAR
          </Typography>
          <Typography variant="caption" fontFamily="'JetBrains Mono', monospace">
            {memPercent.toFixed(1)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={memPercent}
          color={memPercent > 90 ? 'error' : memPercent > 70 ? 'warning' : 'secondary'}
          sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}
        />
      </Box>
    </Box>
  );
}
