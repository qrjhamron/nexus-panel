import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

interface ServerStats {
  cpuPercent: number;
  memoryBytes: number;
  memoryLimitBytes: number;
  diskBytes: number;
  diskLimitBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
  uptime: number;
}

type PowerState = 'running' | 'starting' | 'stopping' | 'offline';
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseServerWebSocketReturn {
  consoleLines: string[];
  stats: ServerStats | null;
  powerState: PowerState;
  connectionStatus: ConnectionStatus;
  sendCommand: (cmd: string) => void;
  sendPowerAction: (action: string) => void;
}

const MAX_LINES = 2000;

function mapGrpcState(state: string | number): PowerState {
  const n = typeof state === 'number' ? state : parseInt(state, 10);
  // Proto enum: 0=offline, 1=starting, 2=running, 3=stopping, 4=unknown
  if (n === 2) return 'running';
  if (n === 1) return 'starting';
  if (n === 3) return 'stopping';
  if (n === 0 || n === 4) return 'offline';
  // Fallback for string values
  const s = String(state).toLowerCase();
  if (s === 'running') return 'running';
  if (s === 'starting') return 'starting';
  if (s === 'stopping') return 'stopping';
  return 'offline';
}

export function useServerWebSocket(serverUuid: string): UseServerWebSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [powerState, setPowerState] = useState<PowerState>('offline');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const retriesRef = useRef(0);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const token = localStorage.getItem('accessToken') || '';

    const socket = io(wsUrl, {
      path: '/ws',
      query: { server: serverUuid },
      transports: ['websocket'],
      withCredentials: true,
      reconnection: false,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      retriesRef.current = 0;
      // Authenticate and subscribe using the backend protocol
      socket.emit('auth', { token, serverUuid });
      socket.emit('subscribe_console', {});
      socket.emit('subscribe_stats', {});
    });

    // Backend sends all events on the 'message' channel with a type field
    socket.on('message', (msg: { type: string; [key: string]: unknown }) => {
      switch (msg.type) {
        case 'console_output':
          if (typeof msg.line === 'string') {
            setConsoleLines((prev) => {
              const next = [...prev, msg.line as string];
              return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
            });
          }
          break;
        case 'console_history':
          if (Array.isArray(msg.lines)) {
            setConsoleLines((msg.lines as string[]).slice(-MAX_LINES));
          }
          break;
        case 'stats_update': {
          const raw = msg.stats as Record<string, unknown> | undefined;
          if (raw) {
            // gRPC ServerStatusResponse: { uuid, state, resources: { cpuPercent, memoryBytes, ... } }
            const r = (raw.resources ?? raw) as Record<string, unknown>;
            setStats({
              cpuPercent: (r.cpuPercent ?? 0) as number,
              memoryBytes: (r.memoryBytes ?? 0) as number,
              memoryLimitBytes: (r.memoryLimit ?? r.memoryLimitBytes ?? 0) as number,
              diskBytes: (r.diskBytes ?? 0) as number,
              diskLimitBytes: (r.diskLimit ?? r.diskLimitBytes ?? 0) as number,
              networkRxBytes: (r.networkRxBytes ?? 0) as number,
              networkTxBytes: (r.networkTxBytes ?? 0) as number,
              uptime: (r.uptime ?? 0) as number,
            });
            if (raw.state !== undefined) {
              setPowerState(mapGrpcState(raw.state as string));
            }
          }
          break;
        }
        case 'power_state':
          if (msg.state !== undefined) {
            setPowerState(mapGrpcState(msg.state as string));
          }
          break;
        case 'auth_success':
          break;
        case 'error':
          break;
      }
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      setPowerState('offline');
      const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
      retriesRef.current += 1;
      setTimeout(() => socket.connect(), delay);
    });

    socket.on('connect_error', () => {
      setConnectionStatus('error');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [serverUuid]);

  const sendCommand = useCallback((cmd: string) => {
    socketRef.current?.emit('send_command', { command: cmd });
  }, []);

  const sendPowerAction = useCallback((action: string) => {
    socketRef.current?.emit('send_power_action', { action });
  }, []);

  return { consoleLines, stats, powerState, connectionStatus, sendCommand, sendPowerAction };
}
