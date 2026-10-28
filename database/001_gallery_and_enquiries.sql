-- Run once against your Postgres database:
--   psql "$DATABASE_URL" -f database/001_gallery_and_enquiries.sql
-- Safe to run more than once.

-- Photos and videos from rallies, outreach events, workshops and partner activities.
-- The file itself lives in media_library; this table says where and how to show it.
CREATE TABLE IF NOT EXISTS gallery_items (
  id            SERIAL PRIMARY KEY,
  media_id      INTEGER NOT NULL REFERENCES media_library(id) ON DELETE CASCADE,
  title         TEXT,
  caption       TEXT,
  album         TEXT,                       -- e.g. "Women's rally, Nairobi"
  event_date    DATE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_by    INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gallery_items_album_idx ON gallery_items (album);
CREATE INDEX IF NOT EXISTS gallery_items_status_idx ON gallery_items (status, sort_order, event_date DESC);

-- Contact form, partnership enquiries and newsletter sign-ups.
CREATE TABLE IF NOT EXISTS enquiries (
  id            SERIAL PRIMARY KEY,
  name          TEXT,
  organization  TEXT,
  email         TEXT NOT NULL,
  phone         TEXT,
  topic         TEXT,
  message       TEXT,
  consent       BOOLEAN NOT NULL DEFAULT false,
  source        TEXT NOT NULL DEFAULT 'contact',   -- contact | partner | newsletter
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS enquiries_status_idx ON enquiries (status, created_at DESC);
