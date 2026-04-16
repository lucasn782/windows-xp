import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Windows XP boot screen', () => {
  render(<App />);
  expect(screen.getByText(/windows/i)).toBeInTheDocument();
  expect(screen.getByText(/xp/i)).toBeInTheDocument();
});
