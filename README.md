# Tham Bun Protocol MVP

A LINE-based AI charity escrow product for transparent Thai social donations.

Tham Bun Protocol helps donors fund verified medical treatment cases without sending money to an anonymous requester. A rescuer submits evidence through LINE, the system validates the bill, creates a public campaign page, accepts test donations, and releases escrow funds only to a verified service provider wallet.

Built for the SEABW 2026 hackathon as a real working MVP, not a slide-only concept.

## Working Ownership

| Area | Owner | Files |
| --- | --- | --- |
| Backend API | Codex | `apps/api/src/routes/cases.ts` |
| Case storage | Codex | `apps/api/src/services/caseStore.ts` |
| OCR/AI validator | Codex | `apps/api/src/services/validator.ts` |
| Provider registry | Codex | `apps/api/src/services/providerRegistry.ts` |
| Smart contract | Codex | `contracts/`, `scripts/`, `apps/api/src/services/escrow.ts` |
| LINE webhook flow | Antigravity | `apps/api/src/routes/lineWebhook.ts`, `apps/api/src/services/lineClient.ts` |
| Donor campaign page | Antigravity | `apps/web/` |
| UI components | Antigravity | `apps/web/src/components/` |
| README/pitch polish | Human or Antigravity | `README.md`, slides |

Only shared application type file: `apps/api/src/types/case.ts`.

## Problem

Thai social media has many urgent donation requests for stray animals, medical bills, and emergency care. Many are legitimate, but donors often hesitate because they cannot easily verify whether the bill is real, whether the photo is current, whether the requester is trustworthy, whether the money will actually reach the clinic or hospital, and whether the case is using a personal or mule account.

The core problem is not lack of generosity. The core problem is lack of trust.

## Solution

Tham Bun Protocol creates a trust layer between donors, requesters, and service providers.

Instead of sending money directly to a person, donors fund a verified treatment case. The funds are locked in an escrow smart contract and released only to a registered provider wallet after the treatment evidence is verified.

```txt
Requester submits proof through LINE
        -> AI/OCR validator checks bill and evidence
        -> Verified campaign page is created
        -> Donors fund the case
        -> Funds are locked in testnet escrow
        -> Treatment proof is submitted
        -> Escrow releases funds to verified clinic wallet
```

The requester never directly receives the donation money.

## MVP Scope

What is real in this MVP:

- Real LINE bot flow
- Real backend webhook
- Real image upload handling
- Real AI/OCR-based bill validation
- Real provider registry check
- Real public campaign page
- Real donation state update
- Real testnet smart contract escrow
- Real transaction hash display
- Real release to verified provider wallet on testnet

What is simulated honestly:

- PromptPay payment confirmation
- Fiat-to-crypto settlement
- Clinic KYC onboarding
- Nationwide fraud database

For this hackathon, PromptPay is represented by a payment confirmation simulator. In production, this event would come from a licensed payment provider. The verification and escrow logic are functional.

## Main Demo Flow

1. Requester creates a case in LINE with `/newcase`.
2. Requester uploads a vet bill or treatment estimate.
3. Requester uploads an animal photo.
4. Backend validates the bill, provider, amount, date, and photo presence.
5. LINE bot returns a trust score and campaign link.
6. Donor opens the campaign page and simulates donation.
7. Backend records donation and mirrors value into testnet escrow.
8. Requester submits treatment proof through LINE.
9. Backend verifies treatment proof and releases escrow to the provider wallet.

Final pitch line:

```txt
The requester never touches the money. Donors fund verified treatment, and the clinic receives payment directly.
```

## Architecture

```txt
[Requester on LINE]
        |
        v
[LINE Official Account]
        |
        v
[LINE Messaging API Webhook]
        |
        v
[Node.js / Express Backend]
        |
        |-- stores case data
        |-- downloads LINE images
        |-- runs OCR/AI validation
        |-- checks provider registry
        |-- creates campaign page
        |-- calls escrow smart contract
        |
        v
[AI/OCR Validator]
        |
        v
[Trust Score JSON]
        |
        v
[Campaign Web Page]
        |
        v
[Testnet Smart Contract Escrow]
        |
        v
[Verified Clinic Wallet]
```

## Tech Stack

- Backend: Node.js, Express, TypeScript
- AI/OCR validator: Tesseract.js or Gemini upgrade path, plus rule-based scoring
- Frontend: web campaign page owned by Antigravity
- Web3: Solidity escrow contract, EVM testnet, ethers.js

## Environment Variables

Create a `.env` file:

```env
PORT=3000

LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

VALIDATOR_MODE=tesseract
GEMINI_API_KEY=optional_if_using_gemini

RPC_URL=your_testnet_rpc_url
PRIVATE_KEY=your_backend_oracle_private_key
ESCROW_CONTRACT_ADDRESS=your_deployed_escrow_contract

APP_BASE_URL=https://your-app.vercel.app
```

## How to Run

```bash
npm install
npm run dev:api
```

Expose the local backend for LINE with a tunnel such as ngrok or Cloudflare Tunnel:

```bash
ngrok http 3000
```

Set the LINE webhook URL to:

```txt
https://your-tunnel-url/webhook
```

## License

MIT
