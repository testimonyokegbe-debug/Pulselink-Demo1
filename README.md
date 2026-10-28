OBJECTIVE & ENGINEERING PHILOSOPHY

The goal of this MVP is to deliver a slick, high-urgency interactive prototype for the Cowrywise innovative challenge pitch. We
are prioritizing flawless User Experience (UX), high-fidelity UI, and realistic flow simulation over complex backend
infrastructure.
The backend will serve structured mock data and lightweight state transitions to give the demo realtime responsiveness

PulseLink-DEMO API

Base URL: http://localhost:5000

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | /api/v1/emergency/dispatch | { bloodType, units, hospitalId } | alert (status PENDING) |
| GET | /api/v1/emergency/active | none | current alert, or { status: "NONE" } |
| POST | /api/v1/donor/accept | { alertId, donorId } | { qrPayload } |
| POST | /api/v1/hospital/verify-qr | { qrCode } | { status, message, sms } |
| GET | /api/v1/leaderboard/campus | none | list of departments |
| GET | /api/v1/donor/:id | none | donor profile |
| GET | /api/v1/hospital/:id | none | hospital info |
| POST | /api/v1/demo/reset | none | { status: "RESET" } |

## Real-time events (SSE)
const source = new EventSource("http://localhost:5000/api/v1/events");
Event types: ALERT_CREATED, ALERT_ACCEPTED, DONOR_VERIFIED, RESET

## Alert status flow
PENDING -> ACCEPTED -> FULFILLED

## Test values
alertId: A101, donorId: D502, hospitalId: H1, bloodType: "O-", qrCode: PL-TOKEN-9021

## Run
npm install
npm run dev
