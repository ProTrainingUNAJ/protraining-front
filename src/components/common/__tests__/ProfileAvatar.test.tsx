import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ProfileAvatar } from '../ProfileAvatar';

describe('ProfileAvatar Component', () => {
  it('renders initials when no src is provided', () => {
    render(<ProfileAvatar name="Lucas Fernández" />);
    expect(screen.getByText('LF')).toBeDefined();
  });

  it('renders img element when src is provided', () => {
    render(
      <ProfileAvatar
        name="Lucas Fernández"
        src="http://localhost:8080/identidad/api/v1/users/me/photo"
      />,
    );
    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('http://localhost:8080/identidad/api/v1/users/me/photo');
  });

  it('falls back to initials when img onError fires', () => {
    render(<ProfileAvatar name="Lucas Fernández" src="http://localhost:8080/broken-image.webp" />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(screen.getByText('LF')).toBeDefined();
  });

  it('renders single initial for single-word name', () => {
    render(<ProfileAvatar name="Boca" shape="rounded" />);
    expect(screen.getByText('B')).toBeDefined();
  });
});
