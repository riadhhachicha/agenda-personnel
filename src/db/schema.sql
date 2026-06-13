-- SQL schema for Supabase integration

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table agenda_items
CREATE TABLE IF NOT EXISTS agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('task', 'appointment', 'event', 'call')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TEXT NOT NULL, -- Format 'HH:MM'
  end_time TEXT, -- Format 'HH:MM'
  priority TEXT CHECK (priority IN ('low', 'normal', 'urgent')) NOT NULL DEFAULT 'normal',
  status TEXT CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')) NOT NULL DEFAULT 'todo',
  reminder_active BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_time TIMESTAMP WITH TIME ZONE,
  google_calendar_link TEXT,
  google_calendar_id TEXT,
  contact_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table reminder_settings
CREATE TABLE IF NOT EXISTS reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  default_reminder_offset INTEGER NOT NULL DEFAULT 15, -- inside minutes
  sound_active BOOLEAN NOT NULL DEFAULT TRUE,
  browser_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table color_settings
CREATE TABLE IF NOT EXISTS color_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_color TEXT NOT NULL DEFAULT '#E0E7FF',
  task_text_color TEXT NOT NULL DEFAULT '#4338CA',
  appointment_color TEXT NOT NULL DEFAULT '#D1FAE5',
  appointment_text_color TEXT NOT NULL DEFAULT '#065F46',
  event_color TEXT NOT NULL DEFAULT '#FEF3C7',
  event_text_color TEXT NOT NULL DEFAULT '#92400E',
  call_color TEXT NOT NULL DEFAULT '#FFE4E6',
  call_text_color TEXT NOT NULL DEFAULT '#9F1239',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table google_calendar_sync_logs
CREATE TABLE IF NOT EXISTS google_calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sync_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  operation TEXT NOT NULL, -- 'import', 'export', 'sync'
  status TEXT CHECK (status IN ('success', 'warning', 'error')) NOT NULL,
  details TEXT,
  error_message TEXT
);
