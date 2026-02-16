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

export function useServerWebSocket(serverUuid: string): UseServerWebSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [powerState, setPowerState] = useState<PowerState>('offline');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const retriesRef = useRef(0);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;

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
      socket.emit('subscribe', { server: serverUuid });
    });

    socket.on('console output', (line: string) => {
      setConsoleLines((prev) => {
        const next = [...prev, line];
        return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
      });
    });

    socket.on('console history', (lines: string[]) => {
      setConsoleLines(lines.slice(-MAX_LINES));
    });

    socket.on('stats', (data: ServerStats) => setStats(data));
    socket.on('power state', (state: PowerState) => setPowerState(state));

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
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
    socketRef.current?.emit('send command', cmd);
  }, []);

  const sendPowerAction = useCallback((action: string) => {
    socketRef.current?.emit('set state', action);
  }, []);

  return { consoleLines, stats, powerState, connectionStatus, sendCommand, sendPowerAction };
}
