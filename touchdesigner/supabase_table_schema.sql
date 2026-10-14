-- ============================================================================
-- Libraries Against Loneliness • Reflect & Connect
-- Supabase Database Schema for Kiosk PWA & TouchDesigner Integration
-- Site: RMIT Swanston Library Level 6 Wellbeing Installation
-- ============================================================================

-- 1. Create reflections table
CREATE TABLE IF NOT EXISTS public.reflections (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    kiosk_id TEXT NOT NULL DEFAULT 'rmit-swanston-lvl6-booth-01',
    
    -- 1-10 Scale Ratings
    score_connectedness SMALLINT NOT NULL CHECK (score_connectedness BETWEEN 1 AND 10),
    score_social_energy SMALLINT NOT NULL CHECK (score_social_energy BETWEEN 1 AND 10),
    score_collective_empathy SMALLINT NOT NULL CHECK (score_collective_empathy BETWEEN 1 AND 10),
    
    -- Open-ended reflection content
    prompt_id TEXT NOT NULL,
    prompt_question TEXT NOT NULL,
    response_type TEXT NOT NULL CHECK (response_type IN ('text', 'audio')),
    response_text TEXT CHECK (char_length(response_text) <= 300),
    response_audio_base64 TEXT,
    audio_duration_sec NUMERIC(4, 1) DEFAULT 0.0 CHECK (audio_duration_sec <= 30.0),
    char_count INTEGER DEFAULT 0,
    
    -- Pre-calculated Flat TouchDesigner Visual Parameters (Direct DAT / CHOP Mapping)
    td_star_brightness NUMERIC(4, 3) NOT NULL, -- 0.150 to 1.000 (from empathy)
    td_pulse_rate_hz NUMERIC(4, 2) NOT NULL,   -- 0.20 to 2.20 Hz
    td_color_hue NUMERIC(4, 3) NOT NULL,       -- 0.000 to 1.000 (from social energy)
    td_color_r NUMERIC(4, 3) NOT NULL,         -- 0.000 to 1.000 (pre-computed RGB)
    td_color_g NUMERIC(4, 3) NOT NULL,         -- 0.000 to 1.000
    td_color_b NUMERIC(4, 3) NOT NULL,         -- 0.000 to 1.000
    td_line_thickness NUMERIC(4, 2) NOT NULL,  -- 0.80 to 6.50 px (from connectedness)
    td_connection_distance INTEGER NOT NULL,    -- 70 to 290 px
    td_star_scale NUMERIC(4, 2) NOT NULL,      -- 0.80 to 2.40
    
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 2. Indexes for high-performance TouchDesigner polling and real-time feeds
CREATE INDEX IF NOT EXISTS idx_reflections_timestamp ON public.reflections (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reflections_kiosk ON public.reflections (kiosk_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Allow anonymous kiosk submissions (INSERT)
CREATE POLICY "Allow anonymous kiosk submissions"
ON public.reflections
FOR INSERT
TO anon
WITH CHECK (true);

-- 5. RLS Policy: Allow anonymous read access for TouchDesigner installation (SELECT)
CREATE POLICY "Allow public read access for TouchDesigner visual installation"
ON public.reflections
FOR SELECT
TO anon
USING (true);

-- 6. Optional: Create storage bucket for audio recordings if storing media blobs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-reflections', 'audio-reflections', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow anonymous audio uploads"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'audio-reflections');

CREATE POLICY "Allow public audio access"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'audio-reflections');
