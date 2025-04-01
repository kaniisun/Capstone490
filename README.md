# Marketplace Assistant

A smart chat assistant for a college marketplace platform that helps users find products, list items for sale, and interact naturally with the marketplace.

## 🚀 Features

- Natural language product search
- Guided selling process
- Post-listing follow-up conversations
- Product recommendations
- OpenAI-powered chat interface
- Supabase for authentication and database

## 📋 Requirements

- Node.js 16+
- React 18+
- OpenAI API key
- Supabase account

## 🔧 Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory based on `.env.example`
4. Add your OpenAI API key and Supabase credentials:
   ```
   REACT_APP_OPENAI_API_KEY=your-api-key-goes-here
   REACT_APP_SUPABASE_URL=your-supabase-url
   REACT_APP_SUPABASE_KEY=your-supabase-anon-key
   ```
5. Start the development server:
   ```
   npm start
   ```

## 🧠 AI Implementation

The application uses OpenAI's API for:

- Natural language understanding of search queries
- Extracting product information during the selling process
- Analyzing user intent in post-listing interactions
- Providing contextual responses based on conversation history

The API integration is implemented in `src/services/openaiService.js` and includes:

- Function calling capabilities to extract structured data
- Error handling and fallbacks
- Context-aware responses

## 📦 Structure

- `/src/services/openaiService.js` - OpenAI API integration
- `/src/ui/components/ChatSearch/ChatInterface.js` - Main chat interface
- `/public` - Static assets
- `/src/models` - Data models and types
- `/src/services` - API service modules
- `/src/contexts` - React context providers

## 📝 Usage

Users can:

1. Search for products using natural language
2. List items for sale through a guided chat flow
3. Browse product recommendations
4. Contact sellers about products
5. Manage their listings

## 💡 Future Improvements

- Add streaming responses for better user experience
- Implement message history persistence
- Enhance product recommendations with collaborative filtering
- Add multi-modal capabilities for image understanding
- Implement fine-tuning for domain-specific improvements

## 📄 License

MIT
