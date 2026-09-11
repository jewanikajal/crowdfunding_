# Channel 1 UI Backend

## Install and run

```bash
npm install
npm start
```

## API endpoints

- POST /startup/register
- POST /startup/validate
- GET /startup/:id
- POST /investor/register
- POST /investor/validate
- GET /investor/:id
- POST /project/create
- POST /project/approve
- GET /project/:id
- POST /fund

This backend talks to cip-main-channel and cipcc using the wallets and gateways generated in the repo root.
