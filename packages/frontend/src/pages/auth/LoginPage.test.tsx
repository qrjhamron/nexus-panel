import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

vi.mock('../../stores/auth.store', () => ({
  useAuthStore: () => ({
    login: vi.fn(),
  }),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        {ui}
      </ThemeProvider>
    </BrowserRouter>,
  );
};

describe('LoginPage', () => {
  it('renders login form with email and password fields', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders login button', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows link to register page', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute(
      'href',
      '/register',
    );
  });
});
