A donation app using ECOMMPAY payment gatewaay.

# Prerequisites

* Node v0.12

* Firebase account

* Firebase database

# Install

```sh
npm install
```

Creata a `.env` file with the contents:

```ini
ECOMMPAY_PROJECT_ID = "..."

ECOMMPAY_SECRET = "..."

COLLECTION = "test_payments"

NODE_ENV = "local"

SUCCESS_REDIRECT = "https://google.com"

FAILURE_REDIRECT = "https://google.com"
```

Drop your Firebase service account .json file as `secrets/firebase.json`.

# Development

Run Express in development mode:

```sh
npm install -g nodemon
nodemon src/server.js
```

## Test card details

```
4314220000000056 success
5413330000000019 success
4314220000000072 decline
5413330000000035 decline
4314220000000098 decline
5413330000000092 decline
```

# Run

```sh
node src/server.js
```

On the production run Node in port 80/443.

To run and install with Let's Encrypt.


```bash
sudo apt-get update -y
sudo apt-get install -y certbot
certbot certonly
```

Then edit production `.env` file:

```ini
COLLECTION = "payments"
HTTPS_DOMAIN = "donate.ignitecovid19response.com"
THANK_YOU_PAGE_URL = "https://ignitecovid19response.com/thank-you-for-the-payment"
```


# Database backups

To get a backup for the Firebase Cloud Storage:

```sh
node src/backup.js > backup-`date +%Y-%m-%d`.json
```

# ECOMMPay reference manual

https://developers.ecommpay.com/en/en_PP_method_Embedded.html

# Other

- [Firebase database starter](https://riptutorial.com/firebase/example/22139/hello-world-firebase-realtime-database-in-node)

- [Where to find database URL in Firebase console](https://stackoverflow.com/a/40168644/315168)