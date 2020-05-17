const admin = require('firebase-admin');
const firestoreService = require('firestore-export-import');

// Initialize firebase
const serviceAccount = require('../secrets/firebase.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

firestoreService.initializeApp(serviceAccount, "https://covid19-7121c.firebaseio.com/", "covid19");

// Start exporting your data
firestoreService
  .backup('payments')
  .then((data) => console.log(JSON.stringify(data)));