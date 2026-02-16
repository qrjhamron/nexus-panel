import { useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Card, CardContent, TextField, InputAdornment, IconButton, Typography } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { useServerWebSocket } from '../../hooks/useServerWebSocket';
import { Terminal } from '../../components/server/Terminal';
import { StatsPanel } from '../../components/server/StatsPanel';
import { PowerControls } from '../../components/server/PowerControls';

interface StatsData {
  time: number;
  cpu: number;
  memory: number;
}

export function ConsolePage() {
  const { uuid = '' } = useParams<{ uuid: string }>();
  const { consoleLines, stats, powerState, connectionStatus, sendCommand, sendPowerAction } =
    useServerWebSocket(uuid);
  const [commandInput, setCommandInput] = useState('');
  const statsHistoryRef = useRef<StatsData[]>([]);

  // Build sliding window stats history
  if (stats) {
    const now = Date.now();
    statsHistoryRef.current = [
      ...statsHistoryRef.current.filter((s) => now - s.time < 60000),
      {
        time: now,
        cpu: stats.cpuPercent,
        memory: stats.memoryLimitBytes > 0
          ? (stats.memoryBytes / stats.memoryLimitBytes) * 100
          : 0,
      },
    ];
  }

  const handleSend = useCallback(() => {
    if (commandInput.trim()) {
      sendCommand(commandInput);
      setCommandInput('');
    }
  }, [commandInput, sendCommand]);

  return (
    <Box sx={{ display: 'flex', gap: 2.5, height: 'calc(100vh - 120px)', flexDirection: { xs: 'column', lg: 'row' } }}>
      {/* Terminal Section */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <PowerControls powerState={powerState} onPowerAction={sendPowerAction} />
          <Typography variant="caption" color={connectionStatus === 'connected' ? 'success.main' : 'text.secondary'}>
            ● {connectionStatus}
          </Typography>
        </Box>

        <Terminal lines={consoleLines} onCommand={sendCommand} />

        <TextField
          fullWidth
          placeholder="Type a command..."
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleSend} edge="end" color="primary">
                    <SendIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: 13 },
            },
          }}
          sx={{ mt: 1.5 }}
        />
      </Box>

      {/* Stats Sidebar */}
      <Card sx={{ width: { xs: '100%', lg: 320 }, flexShrink: 0, overflow: 'auto' }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={600} mb={2}>
            Server Statistics
          </Typography>
          <StatsPanel history={statsHistoryRef.current} currentStats={stats} />
        </CardContent>
      </Card>
    </Box>
  );
}
