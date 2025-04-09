-- Test script for the permanently_delete_messages trigger

-- 1. First, check if the trigger and function exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'permanently_delete_messages';

SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_permanently_delete_messages%';

-- 2. Create a test message (if needed)
SELECT 'Creating test message...' as step;
INSERT INTO messages (
  sender_id, 
  receiver_id, 
  content,
  status
) 
VALUES (
  '00000000-0000-0000-0000-000000000001', -- Replace with a valid sender_id
  '00000000-0000-0000-0000-000000000002', -- Replace with a valid receiver_id
  'This is a test message that should be deleted by the trigger',
  'active'
)
RETURNING id, content, is_deleted;

-- 3. Get the ID of the test message
SELECT 'Getting test message ID...' as step;
SELECT id FROM messages 
WHERE content = 'This is a test message that should be deleted by the trigger'
ORDER BY created_at DESC
LIMIT 1;

-- 4. Store the ID in a variable (modify this with the actual ID)
-- Set manually based on output from step 3
\set test_message_id 'actual-message-id-here'  -- PostgreSQL syntax for variables

-- 5. Update the message to set is_deleted = true, which should trigger deletion
SELECT 'Marking test message as deleted...' as step;
UPDATE messages 
SET is_deleted = true 
WHERE content = 'This is a test message that should be deleted by the trigger'
RETURNING id, content, is_deleted;  -- This might not return anything if the trigger works!

-- 6. Verify the message is gone
SELECT 'Verifying message was deleted...' as step;
SELECT COUNT(*) as remaining_count FROM messages 
WHERE content = 'This is a test message that should be deleted by the trigger';

-- 7. Additional test: Create a message already marked as deleted
SELECT 'Testing message created with is_deleted=true...' as step;
INSERT INTO messages (
  sender_id,
  receiver_id,
  content,
  is_deleted
)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- Replace with a valid sender_id
  '00000000-0000-0000-0000-000000000002', -- Replace with a valid receiver_id
  'This message should never be inserted because is_deleted=true',
  true
)
RETURNING id, content;  -- This should not return anything if the trigger works!

-- 8. Verify no message with that content exists
SELECT 'Verifying pre-deleted message was not inserted...' as step;
SELECT COUNT(*) as pre_deleted_count FROM messages 
WHERE content = 'This message should never be inserted because is_deleted=true';

-- Test completed
SELECT 'Test completed' as result; 