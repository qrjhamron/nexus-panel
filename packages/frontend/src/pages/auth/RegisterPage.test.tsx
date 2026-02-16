import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';

vi.mock('../../stores/auth.store', () => ({
  useAuthStore: () => ({
    register: vi.fn(),
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

describe('RegisterPage', () => {
  it('renders register form with all fields', () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('renders register button', () => {
    renderWithProviders(<RegisterPage />);

    expect(
      screen.getByRole('button', { name: /create account/i }),
    ).toBeInTheDocument();
  });
});
