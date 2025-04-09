### Table: users

- userID (uuid, primary key)
- email (varchar)
- firstName (varchar)
- lastName (varchar)
- accountStatus (varchar, default: 'active')
- created_at (timestamp, default: now())
- modified_at (timestamp, default: now())
- role (varchar, default: 'user')

### Table: reviews

- review_id (int4, primary key)
- reviewed_account_id (uuid, foreign key -> users.userID)
- reviewer_id (uuid, foreign key -> users.userID)
- review_message (text)
- rating (int4)
- flag (bool, default: false)
- created_at (timestamp, default: now())
- updated_at (timestamp, default: now())

### Table: reports

- report_id (int4, primary key)
- reporter_id (uuid, foreign key -> users.userID)
- reported_id (uuid, foreign key -> users.userID)
- reported_item (int4)
- report_type (varchar)
- status (varchar, default: 'open')
- report (text)
- created_at (timestamp, default: now())
- updated_at (timestamp, default: now())

### Table: reported_messages

- id (uuid, primary key)
- reported_at (timestamp, default: now())
- message_id (uuid, foreign key -> messages.id)
- reported_by (uuid, foreign key -> users.userID)
- content (text)

### Table: products

- **productID** (`int4`, `primary key`): Unique identifier for each product.
- **name** (`varchar`): Name of the product.
- **price** (`numeric`): Price of the product.
- **description** (`text`): Detailed description of the product.
- **image** (`text`): Public URL of the product image stored in the `product-images` bucket.
- **condition** (`text`): Condition of the product (e.g., new, used).
- **category** (`varchar`): Product category (e.g., electronics, fashion).
- **status** (`varchar`): Product status (`available` or `sold`).
- **is_bundle** (`bool`): Indicates if the product is part of a bundle (default: `false`).
- **flag** (`bool`): Flags a product for moderation or other purposes (default: `false`).
- **created_at** (`timestamp`, `default: now()`): Timestamp when the product was created.
- **modified_at** (`timestamp`, `default: now()`): Timestamp when the product was last modified.
- **userID** (`uuid`, `foreign key -> users.userID`): Foreign key reference to the `users` table.
- **hide** (`bool`, `default: false`): Determines if the product is hidden from public view.
- **moderation_status** (`text`, `default: 'pending'`): Indicates the moderation state of the product.

  - Possible values:
    - `pending`: Product is awaiting admin approval.
    - `approved`: Product has been approved and is visible.
    - `rejected`: Product was rejected by admin.
    - `archived`: Product is hidden but retained for audit.

- **moderation_reason** (`text`, `default: NULL`): Reason for rejecting or archiving a product.
- **is_deleted** (`bool`, `default: false`): Soft delete flag to indicate whether the product is deleted.

### Table: private_chat

- chat_id (int4, primary key)
- buyer_id (uuid, foreign key -> users.userID)
- seller_id (uuid, foreign key -> users.userID)
- product_id (int4)
- created_at (timestamp, default: now())

### Table: open_board_reply

- reply_id (int4, primary key)
- open_board_id (int4, foreign key -> open_board.open_board_id)
- replier_id (uuid, foreign key -> users.userID)
- reply (text)
- created_at (timestamp, default: now())

### Table: open_board

- open_board_id (int4, primary key)
- creator_id (uuid, foreign key -> users.userID)
- title (varchar)
- content (text)
- status (varchar, default: 'active')
- created_at (timestamp, default: now())
- updated_at (timestamp, default: now())
- reply_to (int4, foreign key -> open_board.open_board_id)
- community (int4, foreign key -> communities.community_id)
- score (int4, default: 0) - Net vote score (upvotes minus downvotes)

### Table: messages

- id (uuid, primary key)
- created_at (timestamp, default: now())
- sender_id (uuid, foreign key -> users.userID)
- receiver_id (uuid, foreign key -> users.userID)
- content (text)
- reply_to (uuid, foreign key -> messages.id)
- status (text, default: 'active')
- updated_at (timestamp, default: now())
- is_read (boolean, default: false)
- is_deleted (boolean, default: false)
- Added **conversation_id** (`UUID`, `NOT NULL`, `REFERENCES conversations(conversation_id)`): Links the message to its conversation.

Table: communities

- community_id (int4, Primary Key)
- name (varchar)
- description (text)
- creator_id (uuid)
- created_at (timestamp, default: now())
- updated_at (timestamp, default: now())
- status (varchar, default: 'active')
- is_private (bool, default: false)

Table: board_comments

- comment_id (uuid, Primary Key, default: uuid_generate_v4())
- post_id (int4)
- user_id (uuid)
- content (text)
- created_at (timestamp, default: now())
- updated_at (timestamp, default: now())
- status (varchar, default: 'active')
- reply_to (uuid, nullable) // for nested replies
- score (int4, default: 0) - Net vote score (upvotes minus downvotes)

### Table: user_votes (New)

- vote_id (uuid, Primary Key, default: uuid_generate_v4())
- user_id (uuid, foreign key -> users.userID)
- target_type (varchar) - Either 'thread' or 'comment'
- target_id (varchar) - ID of the thread or comment
- vote_value (int4) - 1 for upvote, -1 for downvote, 0 for no vote
- created_at (timestamp, default: now())
- updated_at (timestamp, default: now())
- UNIQUE constraint on (user_id, target_type, target_id)

### Table: conversations

- **conversation_id** (`UUID`, `PRIMARY KEY`, `DEFAULT uuid_generate_v4()`): Unique identifier for each conversation.
- **participant1_id** (`UUID`, `REFERENCES users(userID)`): The first participant in the conversation.
- **participant2_id** (`UUID`, `REFERENCES users(userID)`): The second participant in the conversation.
- **created_at** (`TIMESTAMP WITH TIME ZONE`, `DEFAULT now()`): When the conversation was created.
- **updated_at** (`TIMESTAMP WITH TIME ZONE`, `DEFAULT now()`): When the conversation was last updated.
- **last_message_at** (`TIMESTAMP WITH TIME ZONE`, `DEFAULT now()`): Timestamp of the most recent message.
- **UNIQUE** constraint on (participant1_id, participant2_id): Ensures only one conversation record exists between any two users.
