import { useCallback, useState } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';

interface UploadZoneProps {
  onUpload: (files: FileList) => Promise<void>;
}

export function UploadZone({ onUpload }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        setUploading(true);
        setProgress(0);
        const interval = setInterval(() => setProgress((p) => Math.min(p + 10, 90)), 200);
        try {
          await onUpload(e.dataTransfer.files);
          setProgress(100);
        } finally {
          clearInterval(interval);
          setTimeout(() => {
            setUploading(false);
            setProgress(0);
          }, 500);
        }
      }
    },
    [onUpload],
  );

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      sx={{
        border: '2px dashed',
        borderColor: dragOver ? 'primary.main' : 'divider',
        borderRadius: 2,
        p: 3,
        textAlign: 'center',
        bgcolor: dragOver ? 'action.selected' : 'transparent',
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}
    >
      <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
      <Typography variant="body2" color="text.secondary">
        Drag and drop files here to upload
      </Typography>
      {uploading && <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, borderRadius: 1 }} />}
    </Box>
  );
}
