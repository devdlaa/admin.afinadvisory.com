-- search vector column
ALTER TABLE "Task"
ADD COLUMN search_vector tsvector;

-- generated title vector
ALTER TABLE "Task"
ADD COLUMN title_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('simple', title)
) STORED;

-- indexes
CREATE INDEX task_search_vector_gin
ON "Task"
USING GIN (search_vector);

CREATE INDEX task_title_vector_gin
ON "Task"
USING GIN (title_vector);

-- trigger function (copied from production)
CREATE FUNCTION task_search_vector_update()
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
CREATE TRIGGER task_search_vector_trigger
BEFORE INSERT OR UPDATE
ON "Task"
FOR EACH ROW
EXECUTE FUNCTION task_search_vector_update();