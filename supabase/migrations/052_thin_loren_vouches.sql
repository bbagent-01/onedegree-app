-- ============================================================
-- Migration 052: vary Loren's connection degrees in the demo graph
-- ============================================================
-- B7 (continued). Migrations 050+051 left Loren reciprocally
-- vouched with all 30 demo users — which made everyone visible
-- as 1° from his POV (and made every demo user see Loren as 1°).
-- That hides the trust-degree variety the UI is built to show.
--
-- This migration thins Loren↔demo vouches down to 8 hand-picked
-- "1° friends" — bridges across eras and disciplines so the rest
-- of the graph naturally falls to 2°/3°/4° via existing demo↔demo
-- chains. Mutual pairs preserved (deletes both directions when
-- removing a non-friend connection).
--
-- Inter-demo vouches and the demo↔demo graph density are NOT
-- touched in this pass.
-- ============================================================

BEGIN;

DO $$
DECLARE
  loren_id    uuid;
  friend_ids  uuid[];
BEGIN
  SELECT id INTO loren_id FROM users
    WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV';

  SELECT ARRAY(
    SELECT id FROM users WHERE clerk_id IN (
      'seed_president_lincoln',
      'seed_president_t_roosevelt',
      'seed_famous_e_roosevelt',
      'seed_famous_twain',
      'seed_famous_einstein',
      'seed_famous_keller',
      'seed_famous_churchill',
      'seed_famous_hemingway'
    )
  ) INTO friend_ids;

  IF loren_id IS NULL THEN
    RAISE EXCEPTION 'Loren account not found by clerk_id';
  END IF;

  IF cardinality(friend_ids) <> 8 THEN
    RAISE EXCEPTION 'Expected 8 friend ids, got %', cardinality(friend_ids);
  END IF;

  -- Delete every vouch involving Loren EXCEPT the mutual pairs with
  -- the 8 friends. (Both directions caught.)
  DELETE FROM vouches
   WHERE (voucher_id = loren_id  AND vouchee_id <> ALL(friend_ids))
      OR (vouchee_id = loren_id  AND voucher_id <> ALL(friend_ids));
END $$;

DO $$
DECLARE
  remaining int;
BEGIN
  SELECT COUNT(*) INTO remaining FROM vouches v
    JOIN users u ON v.voucher_id = u.id OR v.vouchee_id = u.id
    WHERE u.clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV';
  RAISE NOTICE 'B7-052 complete: % vouches now involve Loren (expected 16: 8 outbound + 8 inbound)', remaining;
END $$;

COMMIT;
