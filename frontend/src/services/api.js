import axios from 'axios';

// API Base URL - Update this if your backend runs on a different port
const API_BASE_URL = 'http://localhost:8000';

/**
 * Predict thyroid disease from patient data using the FastAPI backend
 * @param {Object} patientData - Patient information and test results
 * @returns {Promise} - Prediction results
 */
export const predictThyroidDisease = async (patientData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/predict`, patientData);
    return response.data;
  } catch (error) {
    console.error('Prediction API Error:', error);
    throw new Error(error.response?.data?.detail || 'Failed to connect to ML backend');
  }
};

/**
 * Send a chat message to the RAG-powered chatbot
 * @param {string} message - User's message
 * @param {Array} history - Chat history (optional)
 * @returns {Promise} - AI response
 */
export const sendChatMessage = async (message, history = []) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/chat`, {
      message: message,
      history: history
    });
    return response.data;
  } catch (error) {
    console.error('Chat API Error:', error);
    throw new Error(error.response?.data?.detail || 'Failed to connect to RAG chatbot backend');
  }
};

const apiService = { predictThyroidDisease, sendChatMessage };
export default apiService;

