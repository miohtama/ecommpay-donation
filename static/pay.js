"use strict";

window.EP_HOST = 'https://paymentpage.ecommpay.com';

let payButton;
let containerDonate;
let containerPay;

/**
 * Setup the orchestra
 */
function init() {
  console.log("Initializing example");
  payButton = document.querySelector("#btn-pay");
  containerDonate = document.querySelector("#container-donate");
  containerPay = document.querySelector("#container-pay");
}

/**
 * Let's make some payments.
 */
async function onPay() {

  payButton.setAttribute("disabled", "disabled");

  const amount = document.querySelector("#amount").value;
  const email = document.querySelector("#email").value;

  const data = {
    amount,
    email
  }

  // Create payment database row on the server side
  // and get signed payment parameters
  const resp = await fetch("/create-payment", {
    method: 'POST',
    headers: {
      //'Content-Type': 'application/json'
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: JSON.stringify(data)
  });

  const parameters = await resp.json();

  //
  // Initialize ECOMMPAY widget
  // https://developers.ecommpay.com/en/en_PP_method_Embedded.html
  parameters.target_element = "ecommpay-widget";
  // parameters.payment_methods_options={"card": {"redirect_window_height": 1200, "redirect_window_width": 1200}};

  EPayWidget.run(parameters, 'post');

  payButton.removeAttribute("disabled");
  containerDonate.style.display = "none";
  containerPay.style.display = "block";
}

/**
 * Main entry point.
 */
window.addEventListener("load", async () => {
  init();
  document.querySelector("#btn-pay").addEventListener("click", onPay);
});
