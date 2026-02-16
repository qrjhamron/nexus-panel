import { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
  Button,
  Divider,
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { notificationsApi } from '../../api/notifications';

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export function NotificationsDropdown() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    notificationsApi.unreadCount().then(({ data }) => setUnreadCount(data.data?.count ?? data.count ?? 0)).catch(() => {});
  }, []);

  const handleOpen = async (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    try {
      const { data } = await notificationsApi.list({ perPage: 10 });
      setNotifications(data.data || []);
    } catch { /* noop */ }
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ color: 'text.secondary' }}>
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 420 } } }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />
        <List dense sx={{ py: 0 }}>
          {notifications.length === 0 ? (
            <Box py={4} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            notifications.map((n) => (
              <ListItemButton
                key={n.id}
                sx={{ opacity: n.read ? 0.6 : 1 }}
                onClick={async () => {
                  if (!n.read) {
                    await notificationsApi.markRead(n.id);
                    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                    setUnreadCount((c) => Math.max(0, c - 1));
                  }
                }}
              >
                <ListItemText
                  primary={n.title}
                  secondary={n.body}
                  primaryTypographyProps={{ fontSize: 13, fontWeight: n.read ? 400 : 600 }}
                  secondaryTypographyProps={{ fontSize: 12, noWrap: true }}
                />
              </ListItemButton>
            ))
          )}
        </List>
      </Popover>
    </>
  );
}
