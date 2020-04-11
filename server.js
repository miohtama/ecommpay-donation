const express = require('express');

//
const { Payment } = require('ecommpay');
const bodyParser = require('body-parser');


// Load .env file https://www.npmjs.com/package/dotenv
require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.static('static'));
app.use(bodyParser.urlencoded({ extended: true})); // https://flaviocopes.com/express-forms/

// Push new visitors through payment HTMl
app.get('/', (req, res) => {
  res.redirect('/payment.html')
});

// Push new visitors through payment HTMl
app.post('/pay', (req, res) => {
  console.log(req.body);
  const p = new Payment(process.env.ECOMMPAY_PROJECT_ID, process.env.ECOMMPAY_SECRET);

  // set payment details
  p.paymentAmount = req.body.amount;
  p.paymentId = 'foobar';
  p.paymentCurrency = 'USD';

  const url = p.getUrl();

  res.redirect(url);
});

app.get('/', (req, res) => res.send('Hello World!'));

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));

