import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * Singleton reference to Clerk's getToken function.
 * App.js calls setTokenGetter(getToken) after the Clerk hook is ready.
 */
let _getToken = null;

export function setTokenGetter(fn) {
  _getToken = fn;
}

/** Returns an Authorization header using the current Clerk JWT. */
const getAuthHeaders = async () => {
  if (!_getToken) return {};
  try {
    const token = await _getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

/**
 * Predict thyroid disease from patient data using the FastAPI backend.
 */
export const predictThyroidDisease = async (patientData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/predict`, patientData, { headers });
    return response.data;
  } catch (error) {
    console.error('Prediction API Error:', error);
    throw new Error(error.response?.data?.detail || 'Failed to connect to ML backend');
  }
};

/**
 * Send a chat message to the RAG-powered chatbot.
 */
export const sendChatMessage = async (message, history = []) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/chat`, { message, history }, { headers });
    return response.data;
  } catch (error) {
    console.error('Chat API Error:', error);
    throw new Error(error.response?.data?.detail || 'Failed to connect to RAG chatbot backend');
  }
};

/**
 * Fetch the current user's prediction history.
 */
export const getPredictionHistory = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/predictions/history`, { headers });
    return response.data;
  } catch (error) {
    console.error('History API Error:', error);
    throw new Error(error.response?.data?.detail || 'Failed to fetch prediction history');
  }
};

/**
 * Upload a patient data file (CSV or JSON) to the backend for parsing.
 * Returns { fields: { age, sex, TSH, ... } } to auto-fill the diagnosis form.
 */
export const parseUploadedFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/upload/parse-file`, formData, {
      headers: { ...headers, 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    console.error('File Parse API Error:', error);
    throw new Error(error.response?.data?.detail || 'Failed to parse uploaded file');
  }
};

const apiService = { predictThyroidDisease, sendChatMessage, getPredictionHistory, parseUploadedFile };
export default apiService;

