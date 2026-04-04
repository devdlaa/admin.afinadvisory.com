-- search vector column
ALTER TABLE "Task"
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- generated title vector
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Task' AND column_name = 'title_vector'
  ) THEN
    ALTER TABLE "Task"
    ADD COLUMN title_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('simple', title)
    ) STORED;
  END IF;
END $$;

-- indexes
CREATE INDEX IF NOT EXISTS task_search_vector_gin
ON "Task"
USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS task_title_vector_gin
ON "Task"
USING GIN (title_vector);

-- function
CREATE OR REPLACE FUNCTION task_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'B');
  RETURN NEW;
END
$$;

-- trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'task_search_vector_trigger'
  ) THEN
    CREATE TRIGGER task_search_vector_trigger
    BEFORE INSERT OR UPDATE
    ON "Task"
    FOR EACH ROW
    EXECUTE FUNCTION task_search_vector_update();
  END IF;
END $$;