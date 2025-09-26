import { render, screen } from '@testing-library/react';
import React from 'react';
import { App } from './App';

describe('App', () => {
  it('shows the dashboard heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /nexzo myproperty/i })).toBeInTheDocument();
  });
});
