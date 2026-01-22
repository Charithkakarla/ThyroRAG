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
 * Chatbot functionality - Currently disabled as per prototype requirements
 */
export const sendChatMessage = async (message, history = []) => {
  return {
    message: "Chatbot will be developed soon.",
    response: "Chatbot will be developed soon."
  };
};

const apiService = { predictThyroidDisease, sendChatMessage };
export default apiService;

