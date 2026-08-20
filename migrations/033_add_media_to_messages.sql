-- Add media support to messages table
-- Allows messages to include images and videos

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS media_types TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS messages_with_media_idx ON public.messages
  WHERE array_length(media_urls, 1) > 0;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.messages TO anon, authenticated;
