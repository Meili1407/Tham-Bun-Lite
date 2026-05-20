# Tham Bun API Contract

## Get case

GET /api/cases/:id

Response:

```json
{
  "id": "case_001",
  "title": "Emergency treatment for injured stray dog",
  "providerName": "Happy Paw Vet Clinic",
  "providerWallet": "0x...",
  "amountNeeded": 3200,
  "amountRaised": 500,
  "trustScore": 87,
  "fraudRisk": "low",
  "status": "FUNDING",
  "animalImageUrl": "/uploads/dog.jpg",
  "billImageUrl": "/uploads/bill.jpg",
  "contractCaseId": 1,
  "contractAddress": "0x...",
  "fundedTxHash": "0x..."
}
```

## Simulate donation

POST /api/cases/:id/donate

Body:

```json
{
  "amountThb": 500
}
```

Response:

```json
{
  "success": true,
  "case": {},
  "txHash": "0x..."
}
```

## Verify treatment proof

POST /api/cases/:id/verify-treatment

Body:

```json
{
  "treatmentProofImageUrl": "/uploads/treatment.jpg"
}
```

Response:

```json
{
  "success": true,
  "case": {},
  "txHash": "0x..."
}
```

## LINE webhook

POST /webhook

Used by LINE Messaging API.
Handles:

- /newcase
- /status
- /submit-treatment
- image upload events
