import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Box, CircularProgress } from '@mui/material';
import { AppThemeProvider } from './theme/ThemeProvider';
import { router } from './router';
import { useAuthStore } from './stores/auth.store';

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <AppThemeProvider>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      </AppThemeProvider>
    );
  }

  return (
    <AppThemeProvider>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1A2233',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '14px',
          },
        }}
      />
    </AppThemeProvider>
  );
}
