# 🩺 Thyro RAG - Complete Setup Guide

## 📁 Project Structure

```
ThyroRAG/
├── frontend/                          # React Frontend
│   ├── public/
│   │   └── index.html                # HTML template
│   ├── src/
│   │   ├── components/               # React components
│   │   │   ├── PredictionForm.js    # Disease prediction form
│   │   │   ├── Chatbot.js           # RAG chatbot interface
│   │   │   └── MessageBubble.js     # Chat message component
│   │   ├── services/
│   │   │   └── api.js               # API service for backend calls
│   │   ├── styles/                   # CSS files
│   │   │   ├── App.css              # Main app styles
│   │   │   ├── PredictionForm.css   # Form styles
│   │   │   └── Chatbot.css          # Chatbot styles
│   │   ├── App.js                   # Main App component
│   │   └── index.js                 # Entry point
│   ├── package.json                  # Dependencies
│   ├── .gitignore
│   └── README.md
├── thyroid-disease-detection.ipynb   # ML Model training
└── thyroidDF (1).csv                 # Dataset
```

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

### Step 2: Configure Backend URL

Open `src/services/api.js` and update the backend URL:

```javascript
const API_BASE_URL = 'http://localhost:8000';  # Change if your backend runs elsewhere
```

### Step 3: Start the Development Server

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## 🎨 Features

### 1. Thyroid Disease Prediction
- **Input Fields:** Age, Sex, Hormone Levels (TSH, T3, TT4, T4U, FTI, TBG)
- **Medical History:** Checkboxes for medications, surgeries, symptoms
- **Real-time Validation:** Form validation before submission
- **Visual Results:** Color-coded predictions with confidence scores
- **Probability Charts:** Visual representation of class probabilities

### 2. RAG Medical Chatbot
- **ChatGPT-style Interface:** Clean, modern chat UI
- **Auto-scroll:** Automatically scrolls to latest messages
- **Typing Indicator:** Shows when AI is thinking
- **Suggested Questions:** Quick-start questions for users
- **Chat History:** Maintains conversation context
- **Clear Chat:** Reset conversation anytime

### 3. Design
- **Olive Green & White Theme:** Professional medical aesthetics
- **Responsive:** Works on desktop, tablet, and mobile
- **Smooth Animations:** Fade-in effects, hover states
- **Loading States:** Spinners and visual feedback
- **Error Handling:** User-friendly error messages

## 🔌 Backend API Requirements

Your FastAPI backend should have these endpoints:

### POST /predict
**Request:**
```json
{
  "age": 45,
  "sex": "F",
  "TSH": 2.5,
  "T3": 1.8,
  "TT4": 110,
  "T4U": 0.95,
  "FTI": 105,
  "TBG": null,
  "on_thyroxine": "No",
  "on_antithyroid_medication": "No",
  "sick": "No",
  "pregnant": "No",
  "thyroid_surgery": "No",
  "I131_treatment": "No",
  "query_hypothyroid": "No",
  "query_hyperthyroid": "No",
  "lithium": "No",
  "goitre": "No",
  "tumor": "No",
  "hypopituitary": "No",
  "psych": "No",
  "TSH_measured": "Yes",
  "T3_measured": "Yes",
  "TT4_measured": "Yes",
  "T4U_measured": "Yes",
  "FTI_measured": "Yes",
  "TBG_measured": "No",
  "referral_source": "other"
}
```

**Response:**
```json
{
  "prediction": "Negative",
  "confidence": 0.987,
  "probabilities": {
    "Hyperthyroid": 0.003,
    "Hypothyroid": 0.010,
    "Negative": 0.987
  }
}
```

### POST /chat
**Request:**
```json
{
  "message": "What are the symptoms of hypothyroidism?",
  "history": []
}
```

**Response:**
```json
{
  "message": "Hypothyroidism symptoms include fatigue, weight gain, cold intolerance...",
  "response": "Hypothyroidism symptoms include fatigue, weight gain, cold intolerance..."
}
```

## 📱 Component Documentation

### App.js
Main component with tab navigation between Prediction and Chatbot sections.

**State:**
- `activeTab`: Tracks which section is active ('prediction' or 'chatbot')

### PredictionForm.js
Comprehensive form for thyroid disease prediction.

**State:**
- `formData`: All input field values
- `loading`: Loading state during API call
- `result`: Prediction results from backend
- `error`: Error messages

**Functions:**
- `handleChange()`: Updates form fields
- `handleSubmit()`: Sends data to /predict endpoint
- `handleReset()`: Clears form

### Chatbot.js
ChatGPT-style chat interface with RAG backend.

**State:**
- `messages`: Array of chat messages
- `inputMessage`: Current user input
- `isLoading`: Shows typing indicator
- `error`: Error messages

**Functions:**
- `handleSendMessage()`: Sends message to /chat endpoint
- `handleClearChat()`: Resets conversation
- `scrollToBottom()`: Auto-scrolls to latest message

**Features:**
- Auto-scroll with useRef and useEffect
- Suggested questions for quick start
- Typing indicator animation
- Enter key to send

### MessageBubble.js
Individual chat message component.

**Props:**
- `message`: Text content
- `sender`: 'user' or 'ai'
- `timestamp`: Message time

## 🎨 Styling Guide

### Color Palette
```css
--primary-color: #556B2F      /* Dark Olive Green */
--primary-light: #6B8E23      /* Olive Drab */
--secondary-color: #90EE90    /* Light Green */
--accent-color: #F0FFF0       /* Honeydew */
--background: #FFFFFF         /* White */
--text-dark: #2C3E1F         /* Dark Green */
```

### Custom Styles
All styles use CSS variables for easy theming. Update `:root` in `App.css` to change colors.

## 🐛 Troubleshooting

### Backend Connection Error
```
Cannot connect to server. Please ensure the backend is running.
```
**Solution:** Make sure your FastAPI backend is running on the correct port (default: 8000)

### CORS Issues
Add CORS middleware to your FastAPI backend:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Module Not Found
```bash
npm install  # Reinstall dependencies
```

## 📦 Production Build

```bash
npm run build
```

Creates optimized production build in `build/` folder.

## 🔒 Security Notes

- This is an educational/demo application
- Add authentication for production use
- Validate all inputs on backend
- Use HTTPS in production
- Add rate limiting to prevent abuse
- Sanitize user inputs to prevent XSS

## 📄 License

This project is for educational purposes. Always consult healthcare professionals for medical advice.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ for Thyroid Disease Detection**
