import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Avatar,
  Divider,
  useMediaQuery,
  useTheme,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Terminal as ConsoleIcon,
  FolderOpen as FilesIcon,
  Storage as DatabaseIcon,
  Schedule as ScheduleIcon,
  Tune as StartupIcon,
  Settings as SettingsIcon,
  People as SubusersIcon,
  AdminPanelSettings as AdminIcon,
  Dns as NodesIcon,
  Egg as EggIcon,
  ManageAccounts as UsersIcon,
  VpnKey as ApiKeysIcon,
  Devices as SessionsIcon,
  ReceiptLong as AuditIcon,
  Person as AccountIcon,
  Logout as LogoutIcon,
  DnsOutlined as ServersIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/auth.store';

const DRAWER_WIDTH = 260;
const RAIL_WIDTH = 68;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const location = useLocation();
  const navigate = useNavigate();
  const { uuid } = useParams<{ uuid: string }>();
  const { user, logout } = useAuthStore();

  const isServerPage = location.pathname.startsWith('/server/') && uuid;

  const mainNav: NavItem[] = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { label: 'My Servers', icon: <ServersIcon />, path: '/dashboard' },
  ];

  const serverNav: NavItem[] = uuid
    ? [
        { label: 'Console', icon: <ConsoleIcon />, path: `/server/${uuid}/console` },
        { label: 'Files', icon: <FilesIcon />, path: `/server/${uuid}/files` },
        { label: 'Databases', icon: <DatabaseIcon />, path: `/server/${uuid}/databases` },
        { label: 'Schedules', icon: <ScheduleIcon />, path: `/server/${uuid}/schedules` },
        { label: 'Startup', icon: <StartupIcon />, path: `/server/${uuid}/startup` },
        { label: 'Settings', icon: <SettingsIcon />, path: `/server/${uuid}/settings` },
        { label: 'Subusers', icon: <SubusersIcon />, path: `/server/${uuid}/subusers` },
      ]
    : [];

  const accountNav: NavItem[] = [
    { label: 'Settings', icon: <AccountIcon />, path: '/account/settings' },
    { label: 'API Keys', icon: <ApiKeysIcon />, path: '/account/api-keys' },
    { label: 'Sessions', icon: <SessionsIcon />, path: '/account/sessions' },
  ];

  const adminNav: NavItem[] = user?.isAdmin
    ? [
        { label: 'Overview', icon: <AdminIcon />, path: '/admin/dashboard' },
        { label: 'Locations', icon: <LocationIcon />, path: '/admin/locations' },
        { label: 'Nodes', icon: <NodesIcon />, path: '/admin/nodes' },
        { label: 'Servers', icon: <DashboardIcon />, path: '/admin/servers' },
        { label: 'Users', icon: <UsersIcon />, path: '/admin/users' },
        { label: 'Eggs', icon: <EggIcon />, path: '/admin/eggs' },
        { label: 'Audit Log', icon: <AuditIcon />, path: '/admin/audit-log' },
      ]
    : [];

  const collapsed = isTablet && !open;
  const drawerWidth = collapsed ? RAIL_WIDTH : DRAWER_WIDTH;

  const handleNavigate = (path: string) => {
    navigate(path);
    if (!isDesktop) onClose();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderSection = (title: string, items: NavItem[]) => {
    if (items.length === 0) return null;
    return (
      <Box sx={{ mb: 1 }}>
        {!collapsed && (
          <Typography
            variant="overline"
            sx={{ px: 3, py: 1, display: 'block', color: 'text.secondary', fontSize: 11 }}
          >
            {title}
          </Typography>
        )}
        <List disablePadding>
          {items.map((item) => {
            const active = location.pathname === item.path;
            const btn = (
              <ListItemButton
                key={item.path}
                selected={active}
                onClick={() => handleNavigate(item.path)}
                sx={{
                  minHeight: 40,
                  px: collapsed ? 2.5 : 2,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  '&.Mui-selected': {
                    bgcolor: 'action.selected',
                    '&:hover': { bgcolor: 'action.selected' },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 0 : 36,
                    color: active ? 'primary.main' : 'text.secondary',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 400 }}
                  />
                )}
              </ListItemButton>
            );
            return collapsed ? (
              <Tooltip key={item.path} title={item.label} placement="right">
                {btn}
              </Tooltip>
            ) : (
              btn
            );
          })}
        </List>
      </Box>
    );
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: collapsed ? 1.5 : 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 14,
            color: 'primary.contrastText',
            flexShrink: 0,
          }}
        >
          N
        </Box>
        {!collapsed && (
          <Box>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
              NEXUS
            </Typography>
            <Typography variant="caption" color="text.secondary" lineHeight={1}>
              v0.1.0
            </Typography>
          </Box>
        )}
      </Box>
      <Divider sx={{ mx: collapsed ? 1 : 2 }} />

      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {renderSection('Main', mainNav)}
        {isServerPage && renderSection('Server', serverNav)}
        {renderSection('Account', accountNav)}
        {adminNav.length > 0 && renderSection('Administration', adminNav)}
      </Box>

      <Divider sx={{ mx: collapsed ? 1 : 2 }} />
      <Box sx={{ p: collapsed ? 1 : 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          src={user?.avatarUrl}
          sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 13 }}
        >
          {user?.username?.charAt(0).toUpperCase()}
        </Avatar>
        {!collapsed && (
          <Box overflow="hidden" sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {user?.username}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.email}
            </Typography>
          </Box>
        )}
        <Tooltip title="Logout">
          <IconButton size="small" onClick={handleLogout} sx={{ color: 'text.secondary' }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  if (!isDesktop) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          transition: theme.transitions.create('width', { duration: 200 }),
          overflowX: 'hidden',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
