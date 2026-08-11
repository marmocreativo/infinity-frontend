import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// @ts-expect-error Pusher necesita estar en window para que Echo lo detecte
window.Pusher = Pusher;

const API_URL = import.meta.env.VITE_API_URL;

export function createEcho() {
  const token = localStorage.getItem('auth_token');

  return new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT,
    forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
    enabledTransports: ['ws'],
    authEndpoint: `${API_URL}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  });
}
