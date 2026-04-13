-- Migration 006: Add default_availability_status to listings
-- This sets the visual default for calendar days that have no explicit range

ALTER TABLE listings ADD COLUMN IF NOT EXISTS default_availability_status TEXT
  CHECK (default_availability_status IN ('available', 'possibly_available', 'blocked'));
