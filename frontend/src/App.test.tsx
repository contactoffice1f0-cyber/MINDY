import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => '[]',
  }) as jest.Mock;
});

test('renders the MINDY focus screen', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'MINDY' })).toBeInTheDocument();
  expect(await screen.findByText('今日はここまで。')).toBeInTheDocument();
});
