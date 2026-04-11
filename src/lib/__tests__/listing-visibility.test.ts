import { describe, it, expect } from 'vitest';
import { getListingAccess, ListingAccessInput } from '../listing-visibility';

const BASE: ListingAccessInput = {
  viewerId: 'viewer-1',
  hostId: 'host-1',
  previewVisibility: 'anyone',
  fullVisibility: 'vouched',
  minTrustScore: 50,
  specificUserIds: [],
  viewerVouchCount: 0,
  viewerScoreVsHost: 0,
  hostHasInnerCircledViewer: false,
};

function input(overrides: Partial<ListingAccessInput>): ListingAccessInput {
  return { ...BASE, ...overrides };
}

describe('getListingAccess', () => {
  // ── Host always sees own listing ──
  it('host can always see their own listing', () => {
    const result = getListingAccess(input({
      viewerId: 'host-1',
      hostId: 'host-1',
      previewVisibility: 'specific',
      fullVisibility: 'specific',
      specificUserIds: [],
    }));
    expect(result).toEqual({ canSeePreview: true, canSeeFull: true });
  });

  // ── "anyone" tier ──
  it('anyone tier: all viewers see preview and full', () => {
    const result = getListingAccess(input({
      previewVisibility: 'anyone',
      fullVisibility: 'anyone',
    }));
    expect(result).toEqual({ canSeePreview: true, canSeeFull: true });
  });

  // ── "vouched" tier ──
  it('vouched tier: viewer with 0 vouches denied', () => {
    const result = getListingAccess(input({
      previewVisibility: 'vouched',
      fullVisibility: 'vouched',
      viewerVouchCount: 0,
    }));
    expect(result).toEqual({ canSeePreview: false, canSeeFull: false });
  });

  it('vouched tier: viewer with 1 vouch allowed', () => {
    const result = getListingAccess(input({
      previewVisibility: 'vouched',
      fullVisibility: 'vouched',
      viewerVouchCount: 1,
    }));
    expect(result).toEqual({ canSeePreview: true, canSeeFull: true });
  });

  it('vouched tier: viewer with many vouches allowed', () => {
    const result = getListingAccess(input({
      previewVisibility: 'vouched',
      fullVisibility: 'vouched',
      viewerVouchCount: 10,
    }));
    expect(result).toEqual({ canSeePreview: true, canSeeFull: true });
  });

  // ── "trusted" tier ──
  it('trusted tier: score below threshold denied', () => {
    const result = getListingAccess(input({
      previewVisibility: 'trusted',
      fullVisibility: 'trusted',
      minTrustScore: 50,
      viewerScoreVsHost: 49,
    }));
    expect(result).toEqual({ canSeePreview: false, canSeeFull: false });
  });

  it('trusted tier: score exactly at threshold allowed', () => {
    const result = getListingAccess(input({
      previewVisibility: 'trusted',
      fullVisibility: 'trusted',
      minTrustScore: 50,
      viewerScoreVsHost: 50,
    }));
    expect(result).toEqual({ canSeePreview: true, canSeeFull: true });
  });

  it('trusted tier: score above threshold allowed', () => {
    const result = getListingAccess(input({
      previewVisibility: 'trusted',
      fullVisibility: 'trusted',
      minTrustScore: 50,
      viewerScoreVsHost: 80,
    }));
    expect(result).toEqual({ canSeePreview: true, canSeeFull: true });
  });

  it('trusted tier: minTrustScore 0 allows anyone with any score', () => {
    const result = getListingAccess(input({
      fullVisibility: 'trusted',
      minTrustScore: 0,
      viewerScoreVsHost: 0,
    }));
    expect(result.canSeeFull).toBe(true);
  });

  // ── "inner_circle" tier ──
  it('inner_circle tier: host has inner-circled viewer → allowed', () => {
    const result = getListingAccess(input({
      previewVisibility: 'inner_circle',
      fullVisibility: 'inner_circle',
      hostHasInnerCircledViewer: true,
    }));
    expect(result).toEqual({ canSeePreview: true, canSeeFull: true });
  });

  it('inner_circle tier: host has NOT inner-circled viewer → denied', () => {
    const result = getListingAccess(input({
      previewVisibility: 'inner_circle',
      fullVisibility: 'inner_circle',
      hostHasInnerCircledViewer: false,
    }));
    expect(result).toEqual({ canSeePreview: false, canSeeFull: false });
  });

  // ── "specific" tier ──
  it('specific tier: viewer in list → allowed', () => {
    const result = getListingAccess(input({
      previewVisibility: 'specific',
      fullVisibility: 'specific',
      specificUserIds: ['viewer-1', 'other-2'],
    }));
    expect(result).toEqual({ canSeePreview: true, canSeeFull: true });
  });

  it('specific tier: viewer NOT in list → denied', () => {
    const result = getListingAccess(input({
      previewVisibility: 'specific',
      fullVisibility: 'specific',
      specificUserIds: ['other-1', 'other-2'],
    }));
    expect(result).toEqual({ canSeePreview: false, canSeeFull: false });
  });

  it('specific tier: empty list → denied', () => {
    const result = getListingAccess(input({
      previewVisibility: 'specific',
      fullVisibility: 'specific',
      specificUserIds: [],
    }));
    expect(result).toEqual({ canSeePreview: false, canSeeFull: false });
  });

  // ── Mixed tiers (preview looser than full) ──
  it('mixed: preview=anyone, full=inner_circle → preview yes, full no', () => {
    const result = getListingAccess(input({
      previewVisibility: 'anyone',
      fullVisibility: 'inner_circle',
      hostHasInnerCircledViewer: false,
    }));
    expect(result).toEqual({ canSeePreview: true, canSeeFull: false });
  });

  it('mixed: preview=vouched, full=trusted → vouched viewer sees preview only', () => {
    const result = getListingAccess(input({
      previewVisibility: 'vouched',
      fullVisibility: 'trusted',
      viewerVouchCount: 3,
      viewerScoreVsHost: 20,
      minTrustScore: 50,
    }));
    expect(result).toEqual({ canSeePreview: true, canSeeFull: false });
  });
});
