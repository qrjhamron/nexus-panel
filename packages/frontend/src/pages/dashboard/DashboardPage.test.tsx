import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';

vi.mock('../../api/servers', () => ({
  serversApi: {
    list: vi.fn(() => Promise.resolve({ data: { data: [] } })),
  },
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

describe('DashboardPage', () => {
  it('renders dashboard title', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText(/your servers/i)).toBeInTheDocument();
  });

  it('renders welcome message', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });
});
