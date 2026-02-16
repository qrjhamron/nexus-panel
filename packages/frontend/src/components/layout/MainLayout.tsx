import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

const DRAWER_WIDTH = 260;
const RAIL_WIDTH = 68;

export function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  const sidebarWidth = isDesktop ? DRAWER_WIDTH : isTablet ? RAIL_WIDTH : 0;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { lg: `calc(100% - ${sidebarWidth}px)` },
          ml: { md: `${isTablet ? RAIL_WIDTH : 0}px`, lg: 0 },
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
