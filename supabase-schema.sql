-- Supabase Schema for Got Ya! Game Rooms
-- Run this in your Supabase SQL Editor to set up the database

-- Create the game_rooms table
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(6) UNIQUE NOT NULL,
  state JSONB NOT NULL,
  host_session_id VARCHAR(50),
  last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster room code lookups
CREATE INDEX IF NOT EXISTS idx_game_rooms_room_code ON game_rooms(room_code);

-- Create index for cleanup of old rooms
CREATE INDEX IF NOT EXISTS idx_game_rooms_last_update ON game_rooms(last_update);

-- Enable Row Level Security (optional, for production)
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read rooms (needed for joining)
CREATE POLICY "Anyone can read rooms" ON game_rooms
  FOR SELECT USING (true);

-- Policy: Allow anyone to insert new rooms
CREATE POLICY "Anyone can create rooms" ON game_rooms
  FOR INSERT WITH CHECK (true);

-- Policy: Allow anyone to update rooms (for game state updates)
CREATE POLICY "Anyone can update rooms" ON game_rooms
  FOR UPDATE USING (true);

-- Policy: Allow anyone to delete rooms (for cleanup)
CREATE POLICY "Anyone can delete rooms" ON game_rooms
  FOR DELETE USING (true);

-- Enable Realtime for the game_rooms table
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;

-- Optional: Function to clean up old rooms (older than 2 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rooms()
RETURNS void AS $$
BEGIN
  DELETE FROM game_rooms
  WHERE last_update < NOW() - INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql;

-- Optional: Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-old-rooms', '0 * * * *', 'SELECT cleanup_old_rooms()');
