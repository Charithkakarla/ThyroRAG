-- Feedback checks for ThyroRAG chat responses
-- Run these in Supabase SQL Editor.

-- 0) Ensure feedback columns exist on queries table
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS feedback_rating TEXT;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS feedback_text TEXT;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS feedback_created_at TIMESTAMPTZ;

-- 1) Latest feedback rows (detailed)
SELECT
  id,
  user_id,
  question,
  answer,
  feedback_rating,
  feedback_text,
  feedback_created_at,
  created_at
FROM public.queries
WHERE feedback_rating IS NOT NULL
ORDER BY COALESCE(feedback_created_at, created_at) DESC
LIMIT 100;

-- 2) Feedback count by rating
SELECT
  feedback_rating,
  COUNT(*) AS total
FROM public.queries
WHERE feedback_rating IN ('up', 'down')
GROUP BY feedback_rating
ORDER BY feedback_rating;

-- 3) Daily feedback trend
SELECT
  DATE(COALESCE(feedback_created_at, created_at)) AS day,
  COUNT(*) FILTER (WHERE feedback_rating = 'up') AS thumbs_up,
  COUNT(*) FILTER (WHERE feedback_rating = 'down') AS thumbs_down,
  COUNT(*) AS total,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE feedback_rating = 'up') / NULLIF(COUNT(*), 0),
    2
  ) AS up_rate_pct
FROM public.queries
WHERE feedback_rating IN ('up', 'down')
GROUP BY DATE(COALESCE(feedback_created_at, created_at))
ORDER BY day DESC;

-- 4) Most downvoted question patterns
SELECT
  LEFT(question, 120) AS question_snippet,
  COUNT(*) AS downvotes
FROM public.queries
WHERE feedback_rating = 'down'
GROUP BY LEFT(question, 120)
ORDER BY downvotes DESC
LIMIT 20;

-- 5) User-level feedback quality
SELECT
  user_id,
  COUNT(*) FILTER (WHERE feedback_rating = 'up') AS thumbs_up,
  COUNT(*) FILTER (WHERE feedback_rating = 'down') AS thumbs_down,
  COUNT(*) AS total_feedback,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE feedback_rating = 'up') / NULLIF(COUNT(*), 0),
    2
  ) AS up_rate_pct
FROM public.queries
WHERE feedback_rating IN ('up', 'down')
GROUP BY user_id
ORDER BY total_feedback DESC
LIMIT 50;

-- 6) Quick health check: rows missing feedback timestamp
SELECT
  COUNT(*) AS missing_feedback_timestamp
FROM public.queries
WHERE feedback_rating IS NOT NULL
  AND feedback_created_at IS NULL;
