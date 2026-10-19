-- ============================================================================
-- Libraries Against Loneliness • Reflect & Connect
-- Supabase Database Schema for Kiosk PWA & TouchDesigner Integration
-- Site: RMIT Swanston Library Level 6 Wellbeing Installation
-- Updated to reflect "To change.md" guidelines:
-- Emotion/Feeling, 1-5 Intensity, 1-5 Openness, 1-5 Mind Busyness,
-- Consent, and Optional Response ('text' | 'audio' | 'none')
-- ============================================================================

-- 1. Create reflections table
CREATE TABLE IF NOT EXISTS public.reflections (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    kiosk_id TEXT NOT NULL DEFAULT 'rmit-swanston-lvl6-booth-01',
    
    -- Q1 Emotion / Feeling (Word + Icon, Not Color Alone)
    feeling_id TEXT NOT NULL,       -- 'happy', 'calm', 'tired', 'anxious', 'sad', 'frustrated'
    feeling_label TEXT NOT NULL,    -- 'Happy', 'Calm', etc.
    
    -- Q2-Q4 1-5 Rating Scores
    score_intensity SMALLINT NOT NULL CHECK (score_intensity BETWEEN 1 AND 5),      -- Star Intensity (1 Barely there - 5 Very strong)
    score_openness SMALLINT NOT NULL CHECK (score_openness BETWEEN 1 AND 5),        -- Scale & Presence (1 Turned inward - 5 Get amongst it!)
    score_mind_busyness SMALLINT NOT NULL CHECK (score_mind_busyness BETWEEN 1 AND 5), -- Rotation/Orientation (1 Very quiet - 5 Racing)
    
    -- Backward-compatible 1-10 aliases for TouchDesigner setups
    score_connectedness SMALLINT DEFAULT 6,
    score_social_energy SMALLINT DEFAULT 6,
    score_collective_empathy SMALLINT DEFAULT 6,
    
    -- Open-ended reflection content & consent
    consent_given BOOLEAN NOT NULL DEFAULT true,
    prompt_id TEXT NOT NULL DEFAULT 'main-library-connection',
    prompt_question TEXT DEFAULT '',
    response_type TEXT NOT NULL CHECK (response_type IN ('text', 'audio', 'none')),
    response_text TEXT CHECK (char_length(response_text) <= 300),
    response_audio_base64 TEXT,
    audio_duration_sec NUMERIC(4, 1) DEFAULT 0.0 CHECK (audio_duration_sec <= 30.0),
    char_count INTEGER DEFAULT 0,
    
    -- Pre-calculated Flat TouchDesigner Visual Parameters (Direct DAT / CHOP Mapping)
    td_star_color TEXT NOT NULL DEFAULT 'calm',
    td_color_hue NUMERIC(4, 3) NOT NULL,          -- 0.000 to 1.000 (from emotion)
    td_color_r NUMERIC(4, 3) NOT NULL,            -- 0.000 to 1.000 (pre-computed RGB)
    td_color_g NUMERIC(4, 3) NOT NULL,            -- 0.000 to 1.000
    td_color_b NUMERIC(4, 3) NOT NULL,            -- 0.000 to 1.000
    td_star_brightness NUMERIC(4, 3) NOT NULL,    -- 0.200 to 1.000 (from intensity)
    td_star_scale NUMERIC(4, 2) NOT NULL,         -- 0.80 to 2.40 (from openness)
    td_line_thickness NUMERIC(4, 2) NOT NULL,     -- 1.00 to 6.00 px (from openness)
    td_connection_distance INTEGER NOT NULL,       -- 70 to 270 px (from openness)
    td_rotation_speed NUMERIC(5, 1) NOT NULL,     -- 4.0 to 75.0 deg/s (from mind busyness)
    td_rotation_angle NUMERIC(5, 1) NOT NULL,     -- -60.0 to +60.0 deg orientation tilt
    td_pulse_rate_hz NUMERIC(4, 2) NOT NULL,      -- 0.30 to 2.20 Hz
    
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 2. Indexes for high-performance TouchDesigner polling and real-time feeds
CREATE INDEX IF NOT EXISTS idx_reflections_timestamp ON public.reflections (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reflections_kiosk ON public.reflections (kiosk_id);
CREATE INDEX IF NOT EXISTS idx_reflections_feeling ON public.reflections (feeling_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Allow anonymous kiosk submissions (INSERT)
DROP POLICY IF EXISTS "Allow anonymous kiosk submissions" ON public.reflections;
CREATE POLICY "Allow anonymous kiosk submissions"
ON public.reflections
FOR INSERT
TO anon
WITH CHECK (true);

-- 5. RLS Policy: Allow anonymous read access for TouchDesigner visual installation (SELECT)
DROP POLICY IF EXISTS "Allow public read access for TouchDesigner visual installation" ON public.reflections;
CREATE POLICY "Allow public read access for TouchDesigner visual installation"
ON public.reflections
FOR SELECT
TO anon
USING (true);

-- 6. Storage bucket for audio recordings (optional upload target)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-reflections', 'audio-reflections', true)
ON CONFLICT (id) DO NOTHING;

-- Safely recreate storage policies
DROP POLICY IF EXISTS "Allow anonymous audio uploads" ON storage.objects;
CREATE POLICY "Allow anonymous audio uploads"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'audio-reflections');

DROP POLICY IF EXISTS "Allow public audio access" ON storage.objects;
CREATE POLICY "Allow public audio access"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'audio-reflections');
