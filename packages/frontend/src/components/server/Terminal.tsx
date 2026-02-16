import { useEffect, useRef, useCallback } from 'react';
import { Box } from '@mui/material';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  lines: string[];
  onCommand?: (cmd: string) => void;
}

export function Terminal({ lines, onCommand }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const writtenRef = useRef(0);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerminal({
      theme: {
        background: '#0A0E14',
        foreground: 'rgba(255,255,255,0.85)',
        cursor: '#00E5FF',
        selectionBackground: 'rgba(0,229,255,0.2)',
        black: '#0A0E14',
        red: '#FF5252',
        green: '#00E676',
        yellow: '#FFAB00',
        blue: '#40C4FF',
        magenta: '#7C4DFF',
        cyan: '#00E5FF',
        white: '#FFFFFF',
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      scrollback: 5000,
      convertEol: true,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;
    writtenRef.current = 0;

    // Auto-scroll detection
    term.onScroll(() => {
      const buffer = term.buffer.active;
      const atBottom = buffer.viewportY >= buffer.baseY;
      autoScrollRef.current = atBottom;
    });

    // Command input
    let commandBuffer = '';
    term.onKey(({ key, domEvent }) => {
      if (domEvent.key === 'Enter') {
        if (onCommand && commandBuffer.trim()) {
          onCommand(commandBuffer);
        }
        commandBuffer = '';
        term.write('\r\n');
      } else if (domEvent.key === 'Backspace') {
        if (commandBuffer.length > 0) {
          commandBuffer = commandBuffer.slice(0, -1);
          term.write('\b \b');
        }
      } else if (key.length === 1 && !domEvent.ctrlKey && !domEvent.altKey) {
        commandBuffer += key;
        term.write(key);
      }
    });

    const handleResize = () => fitAddon.fit();
    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      term.dispose();
      termRef.current = null;
    };
  }, [onCommand]);

  // Write new lines
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    const newLines = lines.slice(writtenRef.current);
    if (newLines.length > 0) {
      newLines.forEach((line) => term.writeln(line));
      writtenRef.current = lines.length;
      if (autoScrollRef.current) {
        term.scrollToBottom();
      }
    }
  }, [lines]);

  const fitTerminal = useCallback(() => fitAddonRef.current?.fit(), []);

  useEffect(() => {
    window.addEventListener('resize', fitTerminal);
    return () => window.removeEventListener('resize', fitTerminal);
  }, [fitTerminal]);

  return (
    <Box
      ref={containerRef}
      sx={{
        flex: 1,
        bgcolor: '#0A0E14',
        borderRadius: 2,
        overflow: 'hidden',
        p: 1,
        minHeight: 300,
        '& .xterm': { height: '100%' },
      }}
    />
  );
}
