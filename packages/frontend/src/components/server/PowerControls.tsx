import { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  RestartAlt as RestartIcon,
  PowerSettingsNew as KillIcon,
} from '@mui/icons-material';

interface PowerControlsProps {
  powerState: string;
  onPowerAction: (action: string) => void;
}

const stateColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  running: 'success',
  starting: 'warning',
  stopping: 'warning',
  offline: 'default',
};

export function PowerControls({ powerState, onPowerAction }: PowerControlsProps) {
  const [killConfirm, setKillConfirm] = useState(false);

  const isRunning = powerState === 'running';
  const isOffline = powerState === 'offline';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Chip
        label={powerState.toUpperCase()}
        color={stateColors[powerState] ?? 'default'}
        size="small"
        variant="outlined"
        sx={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
      />

      <ButtonGroup size="small" variant="outlined">
        <Button
          color="success"
          startIcon={<StartIcon />}
          onClick={() => onPowerAction('start')}
          disabled={isRunning || powerState === 'starting'}
        >
          Start
        </Button>
        <Button
          color="warning"
          startIcon={<StopIcon />}
          onClick={() => onPowerAction('stop')}
          disabled={isOffline}
        >
          Stop
        </Button>
        <Button
          color="info"
          startIcon={<RestartIcon />}
          onClick={() => onPowerAction('restart')}
          disabled={isOffline}
        >
          Restart
        </Button>
        <Button
          color="error"
          startIcon={<KillIcon />}
          onClick={() => setKillConfirm(true)}
          disabled={isOffline}
        >
          Kill
        </Button>
      </ButtonGroup>

      <Dialog open={killConfirm} onClose={() => setKillConfirm(false)}>
        <DialogTitle>Kill Server?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will forcefully stop the server. Unsaved data may be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKillConfirm(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              onPowerAction('kill');
              setKillConfirm(false);
            }}
          >
            Kill Server
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
