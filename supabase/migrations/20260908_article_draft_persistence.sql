-- Persist user-editable article drafts without changing existing generation fields.
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS content_html TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS featured_preset JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Existing articles retain their generated source in `content`; the editor stores
-- its rendered draft in `content_html` when a user saves edits.
CREATE OR REPLACE FUNCTION set_articles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articles_set_updated_at ON articles;
CREATE TRIGGER articles_set_updated_at
BEFORE UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION set_articles_updated_at();

CREATE INDEX IF NOT EXISTS articles_user_updated_at_idx
  ON articles (user_id, updated_at DESC);
