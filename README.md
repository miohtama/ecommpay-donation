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

