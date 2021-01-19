const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const admin = require('firebase-admin');
const validate = require("validate.js");
const https = require('https');
const fetch = require('node-fetch');
const log4js = require('log4js');

//https://github.com/ITECOMMPAY/paymentpage-sdk-js/
const { Payment, Callback, signer } = require('ecommpay');

// Load .env file https://www.npmjs.com/package/dotenv
require('dotenv').config();


// Configure logging
log4js.configure({
  appenders: {
    'out': { type: 'stdout' },
    'logFile': { type: 'file', filename: 'log4js.log' },
  },
  categories: { default: { appenders: ['out'], level: 'debug' } }
});

const logger = log4js.getLogger();

// Initialize firebase
const serviceAccount = require('../secrets/firebase.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// Database
const db = admin.firestore();

// Telegram notification details
//
// https://stackoverflow.com/questions/64990028/how-to-send-a-message-to-telegram-from-zapier
//
// Add the bot to a chat
// In chat type: /start to make the bot to recognise the chat
// Get chat it by calling TG getUpdates API in terminal and picking
// the chat id from the output by hand
//
//  curl https://api.telegram.org/bot$TG_API_TOKEN/getUpdates | jq
//
const telegramToken = process.env.TELEGRAM_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;
const telegramServerId = process.env.TELEGRAM_SERVER_ID;

// Allow API access to the server data with this key
const apiKey = process.env.API_KEY;

// Where do we store paymetn data
// - we can switch between production and test collection
const collectionName = process.env.COLLECTION;

// Web server
const app = express();
const port = (process.env.PORT && parseInt(process.env.PORT)) || 3000; // Allow configure the port on productoin

// Some Express.js initialization
app.use(express.static('static'));
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());


/**
 * Send a Telegram notification on a new payment
 */
async function notifyAdmins(message) {

  if(!telegramToken || !telegramChatId) {
    logger.debug("Telegram notifications disabled");
    return;
  }

  async function postData(url, data) {
    // Default options are marked with *
    const response = await fetch(url, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify(data) // body data type must match "Content-Type" header
    });
    return response.json(); // parses JSON response into native JavaScript objects
  }

  logger.debug("Sending to TG", message);

  // Create sendMessage payload
  const payload = { chat_id: telegramChatId, text: message, disable_notification: false };

  // Which endpoint we are calling
  const endpoint = `https://api.telegram.org/bot${telegramToken}/sendMessage`;

  // Call Telegram HTTP API
  const resp = await postData(endpoint, payload);

  logger.debug("TG response", resp);
}

// Push new visitors through payment HTMl
app.get('/', (req, res) => {
  res.redirect('/payment.html')
});

// Push new visitors through payment HTMl
app.post('/pay', async (req, res) => {

  const baseUrl = req.protocol + '://' + req.get('host');
  logger.debug("Incoming pay", baseUrl, req.body);

  const p = new Payment(process.env.ECOMMPAY_PROJECT_ID, process.env.ECOMMPAY_SECRET);

  const id = uuid.v4().toString();

  let amount = parseFloat(req.body.amount.trim());
  if(amount < 1 || amount > 9999) {
    throw new Error("Invalid amount");
  }

  // Needs to be in cents
  amount *= 100;

  // TODO: Mandatory fiels
  // billing.address (string)
  // billing.city (string)
  // billing.country (string, alfa-2 ISO format)
  // billing.postal (string)
  // customer.email (string, email format)
  // customer.first_name (string)
  // customer.last_name (string)
  // customer.state (string)

  email = req.body.email;
  const error = validate.single(email, {presence: true, email: true});
  if(error) {
    throw new Error(error);
  }

  // ECOMMPay success redirect does not pass the parameter correctly back if the key contains +
  const key = (email + "@" + id).replace("+", "-");

  p.paymentAmount = amount;
  p.paymentId = key;
  p.paymentCurrency = 'USD';
  p.customerEmail = email;
  p.customerFirstName = req.body.customerFirstName;
  p.customerLastName = req.body.customerLastName;

  // No postal
  // p.customerState = req.body.customerState;
  // p.billingPostal = req.body.billingPostal;

  // Plus in a phone number is encoded in the URL and currently Ecommpay cannot handle this.
  // Normalise all phone number pluses as zero zero.
  p.customerPhone = req.body.customerPhone.replace("+", "00");

  p.billingAddress = req.body.billingAddress;
  p.billingCity = req.body.billingCity;
  p.billingCountry = req.body.billingCountry;

  // Please be advised that your integration has been updated from Card to Card-partner. Same was communicated to you back in October.
  // force_payment_method=card-partner
  p.forcePaymentMethod = "card-partner";

  // https://github.com/ITECOMMPAY/paymentpage-sdk-js/blob/master/src/payment.js
  // https://developers.ecommpay.com/en/en_PP_Parameters.html
  p.redirect = false;
  p.redirectSuccessUrl = baseUrl + "/ecommpay-success";
  p.redirectFailUrl = baseUrl + "/ecommpay-failure";

  // const ref = db.ref();  //Set the current directory you are working in

  const url = p.getUrl();

  // https://stackoverflow.com/a/60139054/315168
  const createdAt = admin.firestore.Timestamp.fromDate(new Date());

  const data = {
    createdAt,
    email: req.body.email,
    amount: amount,
    id: id,
    customerEmail: p.params.customer_email,
    customerFirstName: p.params.customer_first_name,
    customerLastName: p.params.customer_last_name,
    customerState: p.params.customer_state|| null,
    billingPostal: p.params.billing_postal || null,
    billingAddress: p.params.billing_address,
    billingCity: p.params.billing_city,
    billingCountry: p.params.billing_country,
    customerPhone: p.params.customer_phone,
    ecommURL: url,
    ipAddress: req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress || null,
    ipCountry: req.headers['cf-ipcountry'] || null,
  };

  logger.info("Adding new payment in", collectionName, key, data);

  const ref = db.collection(collectionName).doc(key);
  ref.set(data);

  const dollars = amount / 100.0;
  await notifyAdmins(`🚦 User starting payment process\nServer:${telegramServerId}\nEmail: ${data.email}\nName:${data.customerFirstName} ${data.customerLastName}\nCountry:${data.billingCountry}\nAmount:${dollars} USD\nCountry of IP address:${data.ipCountry}`);

  logger.info("Constructed ECOMMPay URL", url);
  res.redirect(url);
});


// TODO: How to configure?
app.post('/ecommpay-callback', (req, res) => {

  logger.info("Ecommpay callback", req.body);

  const callback = new Callback(process.env.ECOMMPAY_SECRET, req.body);
  if (callback.isPaymentSuccess()) {
    const paymentId = callback.getPaymentId();
    // here is your code for success payment
    logger.info("Payment ok", paymentId);
  }
});

// User completed a payment via a redict
// Note that this cannot be trusted - you need to configure callback for it
app.get('/ecommpay-success', async (req, res) => {
  logger.info("Payment success", req.query);
  const paymentId = req.query.payment_id;

  // Mark that the user completed the process
  const ref = db.collection(collectionName).doc(paymentId);
  const data = {
    userStatus: "success",
    userStatusAt: admin.firestore.Timestamp.fromDate(new Date())
  }

  logger.info("Payment status update", paymentId, data);
  ref.update(data);

  const doc = await ref.get();
  const info = doc.data();

  await notifyAdmins(`✅ Payment OK!\nServer: ${telegramServerId}\nEmail: ${info.email}\nAmount: ${info.amount}`);

  logger.info("Redircting to", process.env.THANK_YOU_PAGE_URL);
  res.redirect(process.env.THANK_YOU_PAGE_URL || "/");
});

// User failed a payment
app.get('/ecommpay-failure', async (req, res) => {
  logger.info("Payment failure", req.query);
  const paymentId = req.query.payment_id;

  // Mark that the user completed the process
  const ref = db.collection(collectionName).doc(paymentId);
  const data = {
    userStatus: "failure",
    userStatusAt: admin.firestore.Timestamp.fromDate(new Date())
  }

  logger.info("Payment failure update", paymentId, data);
  ref.update(data);

  const doc = await ref.get();
  const info = doc.data();

  await notifyAdmins(`🛑 Payment failed\nServer: ${telegramServerId}\nEmail: ${info.email}\nAmount: ${info.amount}`);

  res.redirect(process.env.FAIL_PAGE_URL || "/");
});

/**
 * TODO: How to configure?
 *
 * See https://developers.ecommpay.com/en/en_PP_redirect_modes.html
 */
app.post('/ecommpay-callback', function(req, res) {
  const callback = new Callback(process.env.ECOMMPAY_SECRET, req.body);
  if (callback.isPaymentSuccess()) {
    const paymentId = callback.getPaymentId();
    // here is your code for success payment
    console.log("Payment ok", paymentId);
  }
  console.warning("Payment failed", callback);
});


/**
 * Show last few entries in machine readbale format.
 *
 */
app.get('/diagnose', async function(req, res) {
  const apiKeyInput = req.query.apiKey;

  if(apiKeyInput != apiKey || !apiKey) {
    throw new Error("Mismatching API key");
  }


  const result = [];
  const snapshot = await db.collection(collectionName).orderBy("createdAt", "desc").limit(5).get();
  console.log(snapshot);
  snapshot.forEach(doc => {
    const data = doc.data();
    logger.info("Result", doc.id, data);
    result.push({
      createdAt: data.createdAt._seconds,
      email: data.email,
      amount: data.amount,
      billingCountry: data.billingCountry,
    });
  });

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: "Ok", result }));

});


// Error handler
// https://stackoverflow.com/a/56221138/315168
app.use(function (err, req, res, next) {
  logger.error("Error in Express.js");
  logger.error(err);
  res.status(500).send('Something broke!');
});

// https://itnext.io/node-express-letsencrypt-generate-a-free-ssl-certificate-and-run-an-https-server-in-5-minutes-a730fbe528ca
if(process.env.HTTPS_DOMAIN) {
  const privateKey = fs.readFileSync(`/etc/letsencrypt/live/${process.env.HTTPS_DOMAIN}/privkey.pem`, 'utf8');
  const certificate = fs.readFileSync(`/etc/letsencrypt/live/${process.env.HTTPS_DOMAIN}/cert.pem`, 'utf8');
  const ca = fs.readFileSync(`/etc/letsencrypt/live/${process.env.HTTPS_DOMAIN}/chain.pem`, 'utf8');

  const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca
  };

  const httpsServer = https.createServer(credentials, app);

  httpsServer.listen(443, () => {
    console.log('HTTPS Server running on port 443');
  });

}

app.listen(port, () => logger.info(`Donation app listening at http://localhost:${port}`));
