import { useState } from 'react';
import {
  InputBase,
  Paper,
  Popper,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  ClickAwayListener,
} from '@mui/material';
import { Search as SearchIcon, Dns as ServerIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../../api/search';

interface SearchResult {
  uuid: string;
  name: string;
  type: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const navigate = useNavigate();

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      return;
    }
    try {
      const { data } = await searchApi.global(value);
      setResults(data.data || []);
    } catch {
      setResults([]);
    }
  };

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setResults([]);
    if (result.type === 'server') navigate(`/server/${result.uuid}/console`);
  };

  return (
    <ClickAwayListener onClickAway={() => setResults([])}>
      <Box sx={{ position: 'relative' }}>
        <Paper
          ref={setAnchorEl}
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            py: 0.5,
            bgcolor: 'action.hover',
            borderRadius: 2,
            width: { xs: 200, md: 320 },
          }}
          elevation={0}
        >
          <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
          <InputBase
            placeholder="Search servers..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            sx={{ flex: 1, fontSize: 14 }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
            ⌘K
          </Typography>
        </Paper>
        <Popper open={results.length > 0} anchorEl={anchorEl} placement="bottom-start" sx={{ zIndex: 1300, width: anchorEl?.clientWidth }}>
          <Paper sx={{ mt: 0.5, maxHeight: 300, overflow: 'auto' }}>
            <List dense>
              {results.map((r) => (
                <ListItemButton key={r.uuid} onClick={() => handleSelect(r)}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <ServerIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={r.name} secondary={r.type} />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
