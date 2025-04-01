# Admin Server

This server provides secure API endpoints for admin operations that require the Supabase service role key.

## Purpose

The admin server handles operations that cannot be performed directly from the client for security reasons:

1. Updating user roles in Supabase Auth
2. Enforcing account status (banning/unbanning users)
3. Other privileged operations that require the service role key

## API Endpoints

### 1. Update User Role

```
POST /api/update-user-role
```

Updates a user's role in both the database and Supabase Auth metadata.

**Request Body:**

```json
{
  "userId": "uuid",
  "role": "admin" | "user",
  "isAdmin": true | false
}
```

### 2. Enforce Account Status

```
POST /api/enforce-account-status
```

Enforces a user's account status by updating the banned status in Supabase Auth.

**Request Body:**

```json
{
  "userId": "uuid",
  "accountStatus": "active" | "inactive" | "suspended"
}
```

## Setup

1. Create a `.env` file in this directory with the following variables:

   ```
   PORT=3001
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the server:
   ```
   npm run dev
   ```

## Security Considerations

- The server should ideally be deployed behind a secure proxy or API gateway
- Implement proper authentication for API endpoints in production
- Keep the service role key secure and never expose it to the client
- Log all admin operations for auditing purposes
- Consider implementing rate limiting to prevent abuse

## Dependencies

- express: Web server framework
- @supabase/supabase-js: Supabase client library
- dotenv: Environment variable management
- cors: Cross-Origin Resource Sharing middleware
- chalk: Terminal styling for better logs
- nodemon: Development server with auto-restart (dev dependency)
