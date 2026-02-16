import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Box, Button, Typography, IconButton, Chip } from '@mui/material';
import {
  Save as SaveIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit,
  Close as CloseIcon,
} from '@mui/icons-material';
import { filesApi } from '../../api/files';

interface FileEditorProps {
  serverUuid: string;
  filePath: string;
  initialContent: string;
  onClose: () => void;
}

const extLanguageMap: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rb: 'ruby',
  java: 'java',
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  xml: 'xml',
  html: 'html',
  css: 'css',
  scss: 'scss',
  md: 'markdown',
  sh: 'shell',
  bash: 'shell',
  sql: 'sql',
  php: 'php',
  go: 'go',
  rs: 'rust',
  toml: 'toml',
  ini: 'ini',
  conf: 'ini',
  properties: 'ini',
  txt: 'plaintext',
  log: 'plaintext',
};

function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return extLanguageMap[ext] || 'plaintext';
}

export function FileEditor({ serverUuid, filePath, initialContent, onClose }: FileEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [modified, setModified] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await filesApi.save(serverUuid, filePath, content);
      setModified(false);
    } finally {
      setSaving(false);
    }
  }, [serverUuid, filePath, content]);

  const language = getLanguage(filePath);
  const fileName = filePath.split('/').pop() || filePath;

  return (
    <Box
      sx={{
        position: fullscreen ? 'fixed' : 'relative',
        inset: fullscreen ? 0 : undefined,
        zIndex: fullscreen ? 1300 : undefined,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        height: fullscreen ? '100vh' : 'calc(100vh - 200px)',
        borderRadius: fullscreen ? 0 : 2,
        overflow: 'hidden',
        border: fullscreen ? 'none' : '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontWeight={600} fontFamily="'JetBrains Mono', monospace">
            {fileName}
          </Typography>
          {modified && <Chip label="Modified" size="small" color="warning" sx={{ height: 20, fontSize: 11 }} />}
          <Chip label={language} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving || !modified}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <IconButton size="small" onClick={() => setFullscreen((f) => !f)}>
            {fullscreen ? <FullscreenExit fontSize="small" /> : <FullscreenIcon fontSize="small" />}
          </IconButton>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1 }}>
        <Editor
          height="100%"
          language={language}
          value={content}
          theme="vs-dark"
          onChange={(value) => {
            setContent(value || '');
            setModified(true);
          }}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: false },
            padding: { top: 12 },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            smoothScrolling: true,
          }}
        />
      </Box>
    </Box>
  );
}
