const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');

//https://github.com/ITECOMMPAY/paymentpage-sdk-js/
const { Payment, Callback, signer } = require('ecommpay');

// Load .env file https://www.npmjs.com/package/dotenv
require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.static('static'));
app.use(bodyParser.urlencoded({ extended: true}));

// Push new visitors through payment HTMl
app.get('/', (req, res) => {
  res.redirect('/payment.html')
});

// Push new visitors through payment HTMl
app.post('/pay', (req, res) => {
  console.log(req.body);
  const p = new Payment(process.env.ECOMMPAY_PROJECT_ID, process.env.ECOMMPAY_SECRET);

  //
  // https://github.com/ITECOMMPAY/paymentpage-sdk-js/blob/master/src/payment.js
  // set payment details
  p.paymentAmount = req.body.amount;
  p.paymentId = uuid.v4().toString();
  p.paymentCurrency = 'USD';

  const url = p.getUrl();
  res.redirect(url);
});

// Create payment object
app.post('/create-payment', (req, res) => {
  console.log(req.body);
  const p = new Payment(process.env.ECOMMPAY_PROJECT_ID, process.env.ECOMMPAY_SECRET);

  // https://github.com/ITECOMMPAY/paymentpage-sdk-js/blob/master/src/payment.js
  // set payment details
  p.paymentAmount = req.body.amount;
  p.paymentId = uuid.v4().toString();
  p.paymentCurrency = 'USD';

  const signature = signer(p, p.salt);

  // Generate parameters for ECOMM JS SDK
  const obj = {
    payment_id: p.paymentId,
    payment_amount: p.paymentAmount,
    payment_currency: p.paymentCurrency,
    project_id: process.env.ECOMMPAY_PROJECT_ID,
    signature: signature,
  };

  console.log("Created payment parameters", obj);

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
});

app.post('/ecommpay-callback', function(req, res) {
  const callback = new Callback(process.env.ECOMMPAY_SECRET, req.body);
  if (callback.isPaymentSuccess()) {
    const paymentId = callback.getPaymentId();
    // here is your code for success payment
    console.log("Payment ok", paymentId);
  }
  console.warning("Payment failed", callback);
});

app.get('/', (req, res) => res.send('Hello World!'));

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));

