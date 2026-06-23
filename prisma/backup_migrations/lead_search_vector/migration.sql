-- ─────────────────────────────────────────────
-- 1. Add search_vector column
-- ─────────────────────────────────────────────
ALTER TABLE "Lead"
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- ─────────────────────────────────────────────
-- 2. Add generated title_vector (optional but useful)
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Lead' AND column_name = 'title_vector'
  ) THEN
    ALTER TABLE "Lead"
    ADD COLUMN title_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('simple', coalesce(title, ''))
    ) STORED;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 3. Create GIN indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS lead_search_vector_gin
ON "Lead"
USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS lead_title_vector_gin
ON "Lead"
USING GIN (title_vector);

-- ─────────────────────────────────────────────
-- 4. Create trigger function
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION lead_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');

  RETURN NEW;
END
$$;

-- ─────────────────────────────────────────────
-- 5. Attach trigger
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'lead_search_vector_trigger'
  ) THEN
    CREATE TRIGGER lead_search_vector_trigger
    BEFORE INSERT OR UPDATE
    ON "Lead"
    FOR EACH ROW
    EXECUTE FUNCTION lead_search_vector_update();
  END IF;
END $$;