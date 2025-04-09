# Spartan Marketplace

## Table of Contents

- [General Info](#general-info)
- [Technologies](#technologies)
- [Setup](#setup)
- [Marketplace Assistant](#marketplace-assistant)
- [Project Status](#project-status)
- [AI Product Creator](#ai-product-creator)

## General Info

Spartan Marketplace is an exclusive online marketplace designed specifically for students at UNC Greensboro. Accessible only to users with a valid UNCG email address, this platform provides a secure and student-focused space for buying, selling, and engaging with the campus community. These all could be assisted with the help of our AI Chatbot, Marketplace Assistant.

## Technologies

- React
- NodeJS
- HTML
- CSS
- Javascript
- Supabase
- OpenAI

## Setup

- "npm install"
- open two terminals
- in the root directory terminal, do "npm start"
- in one terminal, do "cd server", and then "nodemon server.js"

# Marketplace Assistant

A smart chat assistant for a college marketplace platform that helps users find products, list items for sale, and interact naturally with the marketplace.

## 🚀 Features

- Natural language product search
- Guided selling process
- Post-listing follow-up conversations
- Product recommendations
- OpenAI-powered chat interface
- Supabase for authentication and database

## 🌐 Deployment

Live Demo: [Spartan Marketplace](https://spartan-marketplace.onrender.com)

The application is deployed using Render:

- Frontend: https://spartan-marketplace.onrender.com
- Backend API: https://marketplace-backend-8tag.onrender.com

Note for Reviewers:

- The site currently contains demo/sample data for evaluation purposes
- You can explore the basic UI and landing page without signing up
- To test features like the AI-powered chat assistant, you'll need to create an account
- While you can sign up and interact with the interface, please note this is a demo environment with sample data

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

## Project Status

Project is: _Incomplete_

## AI Product Creator

The AI Product Creator is an integrated feature of our Marketplace Assistant chatbot that uses OpenAI Vision API to automatically generate product listings from images. Users can upload a photo of an item directly in the chat interface, and the AI will analyze it to generate a product title, description, suggested price, condition, and category.

### Using the Image Analysis Feature

1. Open the Marketplace Assistant chat interface in the app
2. Click the camera icon in the chat input field
3. Upload a product image
4. The AI will analyze the image and generate product details
5. Edit the details if needed and click "Create Listing"

This seamless integration allows users to create listings without leaving the chat interface, making the selling process faster and more intuitive. The feature requires OpenAI API access to the `gpt-4-turbo` model.
