# Thyro RAG - Frontend

Modern React frontend for Thyroid Disease Detection with RAG-powered Medical Chatbot.

## Features
- 🏥 Thyroid Disease Prediction Form
- 💬 AI-Powered Medical Chatbot (RAG)
- 🎨 Olive Green & White Theme
- 📱 Responsive Design

## Installation

```bash
cd frontend
npm install
```

## Running the App

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Folder Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── PredictionForm.js
│   │   ├── Chatbot.js
│   │   └── MessageBubble.js
│   ├── services/
│   │   └── api.js
│   ├── styles/
│   │   ├── App.css
│   │   ├── PredictionForm.css
│   │   └── Chatbot.css
│   ├── App.js
│   └── index.js
├── package.json
└── README.md
```

## Backend API Requirements

Make sure your FastAPI backend is running with these endpoints:
- POST `/predict` - Thyroid disease prediction
- POST `/chat` - RAG chatbot for medical Q&A

## Configuration

Update the API base URL in `src/services/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:8000';
```
