import { describe, it, expect, beforeEach } from 'vitest';
import { matchService } from '../matchService';

describe('matchService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates and persists a new match successfully', async () => {
    const categoryId = 'cat-100';
    const matchData = {
      opponent: 'Club Atlético Temperley',
      matchDate: '2026-10-31T15:30:00.000Z',
      homeOrAway: 'Home' as const,
      notes: 'Fecha 9 torneo apertura',
    };

    const created = await matchService.createMatch(categoryId, matchData);
    expect(created.id).toBeDefined();
    expect(created.opponent).toBe('Club Atlético Temperley');
    expect(created.homeOrAway).toBe('Home');

    const matches = await matchService.getMatches([categoryId]);
    expect(matches).toHaveLength(1);
    expect(matches[0].opponent).toBe('Club Atlético Temperley');
  });

  it('rejects match creation if opponent is missing', async () => {
    await expect(
      matchService.createMatch('cat-100', {
        opponent: '  ',
        matchDate: '2026-10-31T15:30:00.000Z',
        homeOrAway: 'Home',
      }),
    ).rejects.toThrow('El nombre del rival u oponente es obligatorio.');
  });

  it('seeds demo matches if local storage is empty', () => {
    matchService.seedDemoMatchesIfEmpty([{ id: 'cat-demo', name: 'Primera División' }]);
    const raw = localStorage.getItem('protraining_season_matches_v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.length).toBeGreaterThanOrEqual(1);
    expect(parsed[0].opponent).toBe('Club San Martín');
  });
});
