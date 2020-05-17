const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const assert = require('assert');
const firebase = require('firebase');
const admin = require('firebase-admin');
const validate = require("validate.js");

// const winston = require('winston');
const log4js = require('log4js');


//https://github.com/ITECOMMPAY/paymentpage-sdk-js/
const { Payment, Callback, signer } = require('ecommpay');

// Load .env file https://www.npmjs.com/package/dotenv
require('dotenv').config();


// Use JSON logging for log files
log4js.configure({
  appenders: { 'out': { type: 'stdout' } },
  categories: { default: { appenders: ['out'], level: 'debug' } }
});

const logger = log4js.getLogger();

const serviceAccount = require('../secrets/firebase.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const db = admin.firestore();

const app = express();
const port = 3000;


app.use(express.static('static'));
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());

// Push new visitors through payment HTMl
app.get('/', (req, res) => {
  res.redirect('/payment.html')
});

// Push new visitors through payment HTMl
app.post('/pay', (req, res) => {

  const baseUrl = req.protocol + '://' + req.get('host');
  logger.debug("Incoming pay", baseUrl, req.body);

  const p = new Payment(process.env.ECOMMPAY_PROJECT_ID, process.env.ECOMMPAY_SECRET);

  const id = uuid.v4().toString();

  let amount = parseFloat(req.body.amount);
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

  p.paymentAmount = req.body.amount;
  p.paymentId = id;
  p.paymentCurrency = 'USD';
  p.customerEmail = email;
  p.customerFirstName = req.body.customerFirstName;
  p.customerLastName = req.body.customerLastName;
  p.customerState = req.body.customerState;
  p.billingPostal = req.body.billingPostal;
  p.billingAddress = req.body.billingAddress;
  p.billingCity = req.body.billingCity;
  p.billingCountry = req.body.billingCountry;

  // https://github.com/ITECOMMPAY/paymentpage-sdk-js/blob/master/src/payment.js
  // https://developers.ecommpay.com/en/en_PP_Parameters.html
  p.redirect = false;
  p.redirectSuccessUrl = baseUrl + "/ecommpay-success";
  p.redirectFailUrl = baseUrl + "/ecommpay-failure";

  // const ref = db.ref();  //Set the current directory you are working in

  const url = p.getUrl();
  const collectionName = process.env.COLLECTION;

  const data = {
    email: req.body.email,
    amount: req.body.amount,
    id: id,
    customerEmail: p.params.customer_email,
    customerFirstName: p.params.customer_first_name,
    customerLastName: p.params.customer_last_name,
    customerState: p.params.customer_state,
    billingPostal: p.params.billing_postal,
    billingAddress: p.params.billing_address,
    billingCity: p.params.billing_city,
    billingCountry: p.params.billing_country,
    ecommURL: url,
  };

  logger.info("Adding new payment in", collectionName, id, data);

  const ref = db.collection(collectionName).doc(id);
  ref.set(data);

  logger.info("Constructed ECOMMPay URL", url);
  res.redirect(url);
});


app.get('/ecommpay-success', (req, res) => {
  logger.info("Payment success", req.body);

  const callback = new Callback(process.env.ECOMMPAY_SECRET, req.body);
  if (callback.isPaymentSuccess()) {
    const paymentId = callback.getPaymentId();
    // here is your code for success payment
    logger.info("Payment ok", paymentId);
  }
});

app.get('/ecommpay-failure', (req, res) => {
  console.log("Failure");
  console.log(req.body);
});

/**
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

app.get('/', (req, res) => res.send('ECOMMPAY service'));

// Error handler
// https://stackoverflow.com/a/56221138/315168
app.use(function (err, req, res, next) {
  logger.error("Error in Express.js");
  logger.error(err);
  res.status(500).send('Something broke!');
});

app.listen(port, () => logger.info(`Example app listening at http://localhost:${port}`));

