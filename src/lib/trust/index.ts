/**
 * Alpha-C trust computation engine.
 * Server-side only — never import from client components.
 *
 * Re-exports the public API for convenience:
 *   import { compute1DegreeScore, checkListingAccess } from "@/lib/trust";
 */

export { compute1DegreeScore } from "./compute-score";
export { compute1DegreeScores } from "./compute-score-batch";
export { computeVouchPower, persistVouchPower } from "./vouch-power";
export { checkListingAccess } from "./check-access";
export {
  computeDegreesOfSeparation,
  computeDegreesOfSeparationBatch,
} from "./degrees";
export type {
  OneDegreeResult,
  TrustPath,
  HydratedConnector,
  DegreesResult,
  BatchDegreesResult,
  ListingAccessResult,
  VouchPowerResult,
  AccessSettings,
  AccessRule,
  AccessType,
  VouchType,
  YearsKnownBucket,
  VisibilityMode,
} from "./types";
export {
  VOUCH_BASE_POINTS,
  YEARS_MULTIPLIER,
  DEFAULT_ACCESS_SETTINGS,
} from "./types";
