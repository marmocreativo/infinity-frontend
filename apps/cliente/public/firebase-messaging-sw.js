importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCuvyJbhmBTeaf4zDN9K2-KjIK4zIaxYjE",
  authDomain: "infinity-app-e6370.firebaseapp.com",
  projectId: "infinity-app-e6370",
  storageBucket: "infinity-app-e6370.firebasestorage.app",
  messagingSenderId: "527427530860",
  appId: "1:527427530860:web:77284357d9fb512850a849"
});

const messaging = firebase.messaging();
