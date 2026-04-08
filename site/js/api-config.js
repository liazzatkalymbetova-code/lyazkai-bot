// ═══════════════════════════════════════════════════════════════
// API Configuration - Frontend
// ═══════════════════════════════════════════════════════════════

// Determine API base URL
function getApiBaseUrl() {
    // In development: use local backend
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    
    // In production on same domain (e.g., api.infolady.online)
    const hostname = window.location.hostname;
    if (hostname.includes('infolady.online')) {
        return 'https://api.infolady.online';
    }
    
    // Fallback: try to use relative path (works if API is on same domain)
    return '';
}

const API_BASE_URL = getApiBaseUrl();

// API Endpoints
const API = {
    GPT_CHAT: `${API_BASE_URL}/api/gpt-chat`,
    PAYMENT_INTENT: `${API_BASE_URL}/api/payment-intent`,
};

console.log('[API Config] Base URL:', API_BASE_URL);
console.log('[API Config] GPT Chat URL:', API.GPT_CHAT);
