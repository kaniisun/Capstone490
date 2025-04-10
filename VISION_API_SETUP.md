# Vision API Setup and Troubleshooting

This document explains how to set up and troubleshoot the Vision API integration for the marketplace image analysis feature.

## Overview

The marketplace allows users to upload images of products, which are then analyzed by OpenAI's Vision API to automatically generate product listings. This system requires:

1. A properly configured frontend
2. A running backend server
3. Correct environment variables
4. Proper error handling

## Setup Instructions

### Environment Variables

Create a `.env` file in the project root with these variables:

```
# API Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_DEBUG=false

# Backend Configuration (for server folder)
PORT=3001
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NODE_ENV=development
```

For production, update the `REACT_APP_API_URL` to point to your production backend URL.

### Starting the Backend Server

Make sure the backend server is running before attempting to use the image upload feature:

```bash
# Navigate to server directory
cd server

# Install dependencies if needed
npm install

# Start the server
npm start
```

The server should start on port 3001 (or the port specified in your `.env` file).

## Troubleshooting Connection Issues

If you encounter a "Connection Refused" error:

1. **Check if the server is running**:

   - Verify the backend server is running on the correct port
   - Try `curl http://localhost:3001/api/health-check` to check server status

2. **Check environment variables**:

   - Make sure `REACT_APP_API_URL` points to the correct backend URL
   - For local development, this should be `http://localhost:3001`

3. **Check network connectivity**:

   - Ensure there are no firewall or network issues blocking the connection
   - Check browser console for CORS errors

4. **Debug mode**:
   - Set `REACT_APP_DEBUG=true` in your `.env` file to enable detailed logging
   - Check browser console and server logs for detailed error information

## API Endpoints

The Vision API is accessible through:

- `POST /api/vision/analyze` - Analyzes an image and returns product details

Request body:

```json
{
  "image": "base64_encoded_image_data"
}
```

OR

```json
{
  "image_url": "https://example.com/image.jpg"
}
```

## Common Errors and Solutions

### Connection Refused Error

```
POST http://localhost:3001/api/analyze-image net::ERR_CONNECTION_REFUSED
```

**Solution**: The server is not running or is running on a different port. Start the server and ensure it's listening on the correct port.

### API Key Error

```
Error: OpenAI API key not configured
```

**Solution**: Add your OpenAI API key to the server's `.env` file.

### Image Too Large Error

```
Error: Image exceeds the maximum size
```

**Solution**: Resize the image to be smaller. The maximum allowed size is 10MB.

### Timeout Error

```
Error: Request timed out
```

**Solution**: Try again with a smaller image or check your internet connection.
