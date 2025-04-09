-- Script to clean up any existing messages that are marked as deleted
-- but haven't been physically removed from the database yet

-- First, count how many messages are marked as deleted
SELECT 'Finding messages marked as deleted...' as operation;
SELECT COUNT(*) as deleted_messages_count
FROM messages 
WHERE is_deleted = true;

-- Show the first few deleted messages (if any)
SELECT 'Showing sample of messages to be deleted:' as operation;
SELECT id, sender_id, receiver_id, content, created_at
FROM messages
WHERE is_deleted = true
ORDER BY created_at DESC
LIMIT 5;

-- Delete messages marked as is_deleted = true
SELECT 'Removing messages marked as deleted...' as operation;
DELETE FROM messages
WHERE is_deleted = true
RETURNING id;

-- Verify no more deleted messages exist
SELECT 'Verifying no more deleted messages exist...' as operation;
SELECT COUNT(*) as remaining_deleted_count
FROM messages
WHERE is_deleted = true;

-- Create an index on is_deleted for better performance
SELECT 'Creating index on is_deleted column for better performance...' as operation;
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages (is_deleted);

-- Done
SELECT 'Cleanup completed' as result; 