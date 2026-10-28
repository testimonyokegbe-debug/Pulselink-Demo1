const seed = require("./data/seed.json");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- state ----------
let activeAlert = null; // the current alert lives here (in memory)
const clients = []; // browsers currently listening for real-time events

function broadcast(event) {
  clients.forEach((res) => res.write(`data: ${JSON.stringify(event)}\n\n`));
}

// ---------- basic routes ----------
app.get("/", (req, res) => {
  res.send("PulseLink API is running");
});

app.get("/api/v1/leaderboard/campus", (req, res) => {
  res.json(seed.leaderboard);
});

// ---------- profile data ----------
app.get("/api/v1/donor/:id", (req, res) => {
  const donor = seed.donors.find((d) => d.id === req.params.id);
  if (!donor) return res.status(404).json({ error: "Donor not found" });
  res.json(donor);
});

app.get("/api/v1/hospital/:id", (req, res) => {
  const hospital = seed.hospitals.find((h) => h.id === req.params.id);
  if (!hospital) return res.status(404).json({ error: "Hospital not found" });
  res.json(hospital);
});

// ---------- emergency flow ----------
app.post("/api/v1/emergency/dispatch", (req, res) => {
  const { bloodType, units, hospitalId } = req.body;

  if (!bloodType || !units || !hospitalId) {
    return res.status(400).json({
      error: "bloodType, units and hospitalId are required",
    });
  }

  activeAlert = {
    alertId: "A101",
    bloodType,
    units,
    hospitalId,
    status: "PENDING",
    donorsEnRoute: [],
    createdAt: new Date().toISOString(),
  };

  broadcast({ type: "ALERT_CREATED", alert: activeAlert });
  res.status(201).json(activeAlert);
});

app.get("/api/v1/emergency/active", (req, res) => {
  res.json(activeAlert || { status: "NONE" });
});

app.post("/api/v1/donor/accept", (req, res) => {
  const { alertId, donorId } = req.body;

  if (!activeAlert || activeAlert.alertId !== alertId) {
    return res.status(404).json({ error: "Alert not found" });
  }

  activeAlert.status = "ACCEPTED";
  activeAlert.qrToken = "PL-TOKEN-9021";
  activeAlert.donorsEnRoute.push({ donorId, etaMin: 8 });

  broadcast({ type: "ALERT_ACCEPTED", alert: activeAlert });
  res.json({ qrPayload: activeAlert.qrToken });
});

app.post("/api/v1/hospital/verify-qr", (req, res) => {
  const { qrCode } = req.body;

  if (!activeAlert || activeAlert.status !== "ACCEPTED") {
    return res.status(400).json({ error: "No accepted alert to verify" });
  }

  if (qrCode !== activeAlert.qrToken) {
    return res.status(400).json({ error: "Invalid QR code" });
  }

  activeAlert.status = "FULFILLED";

  broadcast({
    type: "DONOR_VERIFIED",
    alert: activeAlert,
    sms: "Thank you! Your donation is active.",
  });

  res.json({
    status: "FULFILLED",
    message: "Donor Arrived & Verified",
    sms: "Thank you! Your donation is active.",
  });
});

// ---------- demo helper ----------
app.post("/api/v1/demo/reset", (req, res) => {
  activeAlert = null;
  broadcast({ type: "RESET" });
  res.json({ status: "RESET" });
});

// ---------- real-time (SSE) ----------
app.get("/api/v1/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  clients.push(res);

  req.on("close", () => {
    clients.splice(clients.indexOf(res), 1);
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => console.log("PulseLink API running on port " + PORT));
}

module.exports = app;