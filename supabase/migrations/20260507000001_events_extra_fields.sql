-- Add website URL, social media URL, and PDF attachment to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS socmed_url  TEXT,
  ADD COLUMN IF NOT EXISTS pdf_url     TEXT;
