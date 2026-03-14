/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDEs0axwTl8tSmT61jmxPmiUXd4dQyvdU4',
  authDomain: 'rn-catch-my-hand.firebaseapp.com',
  projectId: 'rn-catch-my-hand',
  messagingSenderId: '625604680970',
  appId: '1:625604680970:web:d315f3d56e3dd4006f2ef3',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.data || {};
  if (title || body) {
    self.registration.showNotification(title || '커피 대장부', {
      body: body || '',
      icon: '/notification-icon.png',
    });
  }
});
