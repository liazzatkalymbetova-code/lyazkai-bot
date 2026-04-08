// InfoLady API Configuration
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `${window.location.protocol}//localhost:3000`
    : 'https://api.infolady.online';
// export default API_URL; // if using modules, but global is simpler for existing scripts
