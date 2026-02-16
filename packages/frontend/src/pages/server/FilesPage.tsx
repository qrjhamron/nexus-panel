import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Breadcrumbs,
  Link,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  Edit as RenameIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Archive as CompressIcon,
  Unarchive as DecompressIcon,
  CreateNewFolder as NewFolderIcon,
} from '@mui/icons-material';
import { filesApi } from '../../api/files';
import { FileEditor } from '../../components/files/FileEditor';
import { UploadZone } from '../../components/files/UploadZone';

interface FileEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
  mimetype?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FilesPage() {
  const { uuid = '' } = useParams<{ uuid: string }>();
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ path: string; content: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ anchor: HTMLElement; file: FileEntry } | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const loadFiles = useCallback(async () => {
    try {
      const { data } = await filesApi.list(uuid, currentPath);
      setFiles(data.data || []);
      setSelected(new Set());
    } catch { /* noop */ }
  }, [uuid, currentPath]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const pathParts = currentPath.split('/').filter(Boolean);

  const handleNavigate = (index: number) => {
    if (index < 0) {
      setCurrentPath('/');
    } else {
      setCurrentPath('/' + pathParts.slice(0, index + 1).join('/'));
    }
  };

  const handleFileClick = async (file: FileEntry) => {
    if (file.isDirectory) {
      setCurrentPath(currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`);
    } else {
      try {
        const filePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
        const { data } = await filesApi.contents(uuid, filePath);
        setEditing({ path: filePath, content: typeof data === 'string' ? data : data.data || '' });
      } catch { /* noop */ }
    }
  };

  const handleDelete = async () => {
    const file = contextMenu?.file;
    setContextMenu(null);
    if (!file) return;
    await filesApi.delete(uuid, currentPath, [file.name]);
    loadFiles();
  };

  const handleCopy = async () => {
    const file = contextMenu?.file;
    setContextMenu(null);
    if (!file) return;
    const filePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
    await filesApi.copy(uuid, filePath);
    loadFiles();
  };

  const handleDownload = async () => {
    const file = contextMenu?.file;
    setContextMenu(null);
    if (!file) return;
    const filePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
    const { data } = await filesApi.getDownloadUrl(uuid, filePath);
    window.open(data.data?.url || data.url, '_blank');
  };

  const handleCompress = async () => {
    const file = contextMenu?.file;
    setContextMenu(null);
    if (!file) return;
    if (file.name.endsWith('.tar.gz') || file.name.endsWith('.zip')) {
      await filesApi.decompress(uuid, currentPath, file.name);
    } else {
      await filesApi.compress(uuid, currentPath, [file.name]);
    }
    loadFiles();
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await filesApi.createDirectory(uuid, currentPath, newFolderName.trim());
      setNewFolderName('');
      setNewFolderOpen(false);
      loadFiles();
    }
  };

  const handleUpload = async (fileList: FileList) => {
    const { data } = await filesApi.getUploadUrl(uuid);
    const uploadUrl = data.data?.url || data.url;
    const formData = new FormData();
    Array.from(fileList).forEach((f) => formData.append('files', f));
    await fetch(uploadUrl, { method: 'POST', body: formData });
    loadFiles();
  };

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === files.length) setSelected(new Set());
    else setSelected(new Set(files.map((f) => f.name)));
  };

  if (editing) {
    return (
      <FileEditor
        serverUuid={uuid}
        filePath={editing.path}
        initialContent={editing.content}
        onClose={() => setEditing(null)}
      />
    );
  }

  const sorted = [...files].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Breadcrumbs>
          <Link
            component="button"
            underline="hover"
            color={pathParts.length === 0 ? 'text.primary' : 'inherit'}
            onClick={() => handleNavigate(-1)}
            sx={{ cursor: 'pointer' }}
          >
            /home
          </Link>
          {pathParts.map((part, i) => (
            <Link
              key={i}
              component="button"
              underline="hover"
              color={i === pathParts.length - 1 ? 'text.primary' : 'inherit'}
              onClick={() => handleNavigate(i)}
              sx={{ cursor: 'pointer' }}
            >
              {part}
            </Link>
          ))}
        </Breadcrumbs>

        <Button
          size="small"
          startIcon={<NewFolderIcon />}
          onClick={() => setNewFolderOpen(true)}
        >
          New Folder
        </Button>
      </Box>

      <UploadZone onUpload={handleUpload} />

      <Table size="small" sx={{ mt: 2, '& td, & th': { borderColor: 'divider' } }}>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                checked={selected.size === files.length && files.length > 0}
                indeterminate={selected.size > 0 && selected.size < files.length}
                onChange={toggleSelectAll}
                size="small"
              />
            </TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Size</TableCell>
            <TableCell>Modified</TableCell>
            <TableCell width={48} />
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((file) => (
            <TableRow
              key={file.name}
              hover
              sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selected.has(file.name)}
                  onChange={() => toggleSelect(file.name)}
                  size="small"
                  onClick={(e) => e.stopPropagation()}
                />
              </TableCell>
              <TableCell onClick={() => handleFileClick(file)}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {file.isDirectory ? (
                    <FolderIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  ) : (
                    <FileIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  )}
                  <Typography variant="body2">{file.name}</Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary" fontFamily="'JetBrains Mono', monospace">
                  {file.isFile ? formatBytes(file.size) : '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(file.modifiedAt)}
                </Typography>
              </TableCell>
              <TableCell>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextMenu({ anchor: e.currentTarget, file });
                  }}
                >
                  <MoreIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Context Menu */}
      <Menu
        anchorEl={contextMenu?.anchor}
        open={Boolean(contextMenu)}
        onClose={() => setContextMenu(null)}
      >
        <MenuItem onClick={handleCopy}>
          <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Copy</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDownload}>
          <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCompress}>
          <ListItemIcon>
            {contextMenu?.file?.name.endsWith('.tar.gz') || contextMenu?.file?.name.endsWith('.zip')
              ? <DecompressIcon fontSize="small" />
              : <CompressIcon fontSize="small" />
            }
          </ListItemIcon>
          <ListItemText>
            {contextMenu?.file?.name.endsWith('.tar.gz') || contextMenu?.file?.name.endsWith('.zip')
              ? 'Decompress'
              : 'Compress'
            }
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { /* rename dialog would go here */ setContextMenu(null); }}>
          <ListItemIcon><RenameIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onClose={() => setNewFolderOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Folder Name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewFolderOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateFolder}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
