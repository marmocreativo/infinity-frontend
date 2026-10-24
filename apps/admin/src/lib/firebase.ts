import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { api } from './api';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export async function setupPushNotifications() {
  const supported = await isSupported();
  if (!supported) {
    console.warn('Push notifications no soportadas en este navegador.');
    return;
  }

  const messaging = getMessaging(app);

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permiso de notificaciones denegado.');
      return;
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      await api.post('/device-tokens', { token, platform: 'web' });
    }

    onMessage(messaging, (payload) => {
      if (payload.notification) {
        new Notification(payload.notification.title ?? 'Infinity App', {
          body: payload.notification.body,
          icon: '/icon-192.png',
        });
      }
    });
  } catch (err) {
    console.error('Error configurando push notifications:', err);
  }
}