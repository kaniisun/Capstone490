-- Function to immediately delete messages that are set as is_deleted=true
CREATE OR REPLACE FUNCTION permanently_delete_messages()
RETURNS TRIGGER AS $$
BEGIN
  -- When a message is marked as deleted (is_deleted = true)
  -- This trigger will immediately delete it from the database
  IF NEW.is_deleted = true THEN
    -- Delete the message completely from the database 
    DELETE FROM messages WHERE id = NEW.id;
    
    -- Return NULL to cancel the update operation since we've deleted the row
    RETURN NULL;
  END IF;
  
  -- For all other cases, allow the update to proceed normally
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the messages table
-- This will run before any update that would mark a message as deleted
CREATE OR REPLACE TRIGGER trigger_permanently_delete_messages
BEFORE UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION permanently_delete_messages();

-- Additional trigger to handle the case where a message is inserted with is_deleted=true
CREATE OR REPLACE TRIGGER trigger_permanently_delete_messages_on_insert
BEFORE INSERT ON messages
FOR EACH ROW
WHEN (NEW.is_deleted = true)
EXECUTE FUNCTION permanently_delete_messages();

-- Inform users this script has been executed
SELECT 'Permanent deletion triggers added to messages table' as result;

-- To use this trigger:
-- Instead of deleting messages directly, set is_deleted=true like:
-- UPDATE messages SET is_deleted = true WHERE id = 'message-uuid-here';
-- The trigger will then permanently delete the message from the database 