import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { PowerControls } from './PowerControls';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        {ui}
      </ThemeProvider>
    </BrowserRouter>,
  );
};

describe('PowerControls', () => {
  it('renders all power control buttons', () => {
    renderWithProviders(
      <PowerControls powerState="offline" onPowerAction={vi.fn()} />,
    );

    const buttons = screen.getAllByRole('button');
    const buttonTexts = buttons.map((b) => b.textContent);
    expect(buttonTexts).toContain('Start');
    expect(buttonTexts).toContain('Stop');
    expect(buttonTexts).toContain('Restart');
    expect(buttonTexts).toContain('Kill');
  });

  it('shows current power state', () => {
    renderWithProviders(
      <PowerControls powerState="running" onPowerAction={vi.fn()} />,
    );

    expect(screen.getByText('RUNNING')).toBeInTheDocument();
  });
});
