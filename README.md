A donation app using ECOMMPAY payment gatewaay.

# Prerequisites

* Node v0.12

# Install

```sh
npm install
```

Creata a `.env` file with the contents:

```ini
ECOMMPAY_PROJECT_ID = "..."

ECOMMPAY_SECRET = "..."
```

# Run

```sh
node src/server.js
```

# Developmnet

Run Express in development mode:

```sh
npm install -g nodemon
nodemon src/server.js
```

# ECOMMPay reference manual

https://developers.ecommpay.com/en/en_PP_method_Embedded.html

# Other

- [Firebase database starter](https://riptutorial.com/firebase/example/22139/hello-world-firebase-realtime-database-in-node)

- [Where to find database URL in Firebase console](https://stackoverflow.com/a/40168644/315168)