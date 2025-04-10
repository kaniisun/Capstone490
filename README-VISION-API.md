# OpenAI Vision API Integration

This document explains how to use and maintain the OpenAI Vision API integration for image analysis in our application.

## Current Configuration

The application uses GPT-4 Turbo with vision capabilities (`gpt-4-turbo`) for analyzing product images. This model replaces the deprecated `gpt-4-vision-preview` model.

## Environment Variables

The OpenAI model version is configurable through environment variables:

- Server-side: `OPENAI_MODEL_VERSION` (defaults to "gpt-4-turbo")
- Client-side: `REACT_APP_OPENAI_MODEL_VERSION` (defaults to "gpt-4-turbo")

## Error Handling

The system is designed to handle common Vision API errors gracefully, including:

- Network connectivity issues
- Timeouts
- Model-related errors (model_not_found, etc.)
- Invalid input data

When a model-specific error occurs (like `model_not_found`), users will see a helpful message: "The image processing model was recently updated. We're fixing it. Please try again later."

## How Vision API Works

The application uses the following approach to analyze images:

1. **Frontend**: User uploads an image or provides an image URL
2. **API Request**: The image is sent to our backend (either as base64 or URL)
3. **Processing**: Our server calls OpenAI's Vision API with the standardized prompt
4. **Response**: The API returns product details in JSON format
5. **Error Handling**: Any failures are caught and displayed with user-friendly messages

## Request Format Example

Below is an example of how the current API call is structured:

```javascript
const result = await openai.chat.completions.create({
  model: "gpt-4-turbo", // Configurable via environment variables
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Analyze this image and create a marketplace listing. Return a JSON object with these fields ONLY: name, description, price, condition, category.",
        },
        {
          type: "image_url",
          image_url: {
            url: "https://example.com/image.jpg", // or data:image/jpeg;base64,ABC123...
          },
        },
      ],
    },
  ],
  max_tokens: 500,
  temperature: 0.3,
  response_format: { type: "json_object" },
});
```

## Testing Locally

To test the Vision API integration locally:

1. Copy `.env.example` to `.env` and add your OpenAI API key
2. Start the development server: `npm run dev`
3. In the frontend application, use the image upload feature to test

## Troubleshooting

If you encounter issues with the Vision API:

1. Check the server logs for detailed error messages
2. Verify your OpenAI API key has access to `gpt-4-turbo`
3. Ensure the image format is supported (JPEG, PNG, etc.)
4. Check that the image file size is under the limit (20MB after base64 encoding)

## Updating the Model in Future

If OpenAI updates their models again, simply change the environment variable:

```
OPENAI_MODEL_VERSION=new-model-name
```

This will take effect without requiring code changes.

## Official Documentation

For the latest information on OpenAI's models, refer to:
[https://platform.openai.com/docs/models/gpt-4](https://platform.openai.com/docs/models/gpt-4)
