export type VisibilityTier = 'anyone' | 'vouched' | 'trusted' | 'inner_circle' | 'specific';

export interface ListingAccessInput {
  viewerId: string;
  hostId: string;
  previewVisibility: VisibilityTier;
  fullVisibility: VisibilityTier;
  minTrustScore: number;
  specificUserIds: string[];
  // Viewer attributes (preloaded)
  viewerVouchCount: number;
  viewerScoreVsHost: number;
  hostHasInnerCircledViewer: boolean;
}

export interface ListingAccess {
  canSeePreview: boolean;
  canSeeFull: boolean;
}

export function getListingAccess(input: ListingAccessInput): ListingAccess {
  const { viewerId, hostId } = input;

  // Host always sees their own listing
  if (viewerId === hostId) return { canSeePreview: true, canSeeFull: true };

  const checkTier = (tier: VisibilityTier): boolean => {
    switch (tier) {
      case 'anyone':       return true;
      case 'vouched':      return input.viewerVouchCount >= 1;
      case 'trusted':      return input.viewerScoreVsHost >= input.minTrustScore;
      case 'inner_circle': return input.hostHasInnerCircledViewer;
      case 'specific':     return input.specificUserIds.includes(viewerId);
      default:             return false;
    }
  };

  return {
    canSeePreview: checkTier(input.previewVisibility),
    canSeeFull:    checkTier(input.fullVisibility),
  };
}
