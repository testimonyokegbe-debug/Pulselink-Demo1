import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "./server.js";

beforeEach(async () => {
  await request(app).post("/api/v1/demo/reset");
});

describe("basic routes", () => {
  it("root says the API is running", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toBe("PulseLink API is running");
  });

  it("leaderboard returns 3 departments", async () => {
    const res = await request(app).get("/api/v1/leaderboard/campus");
    expect(res.body).toHaveLength(3);
    expect(res.body[0].department).toBe("Engineering");
  });
});

describe("seed data routes", () => {
  it("finds donor D502", async () => {
    const res = await request(app).get("/api/v1/donor/D502");
    expect(res.status).toBe(200);
    expect(res.body.bloodType).toBe("O-");
  });

  it("unknown donor gives 404", async () => {
    const res = await request(app).get("/api/v1/donor/X999");
    expect(res.status).toBe(404);
  });

  it("finds hospital H1", async () => {
    const res = await request(app).get("/api/v1/hospital/H1");
    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
  });

  it("unknown hospital gives 404", async () => {
    const res = await request(app).get("/api/v1/hospital/X999");
    expect(res.status).toBe(404);
  });
});

describe("emergency flow", () => {
  it("starts with no active alert", async () => {
    const res = await request(app).get("/api/v1/emergency/active");
    expect(res.body.status).toBe("NONE");
  });

  it("rejects dispatch with missing fields", async () => {
    const res = await request(app)
      .post("/api/v1/emergency/dispatch")
      .send({ bloodType: "O-", hospitalId: "H1" });
    expect(res.status).toBe(400);
  });

  it("dispatch creates a PENDING alert", async () => {
    const res = await request(app)
      .post("/api/v1/emergency/dispatch")
      .send({ bloodType: "O-", units: 2, hospitalId: "H1" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("PENDING");

    const active = await request(app).get("/api/v1/emergency/active");
    expect(active.body.alertId).toBe("A101");
  });

  it("accept fails when there is no alert", async () => {
    const res = await request(app)
      .post("/api/v1/donor/accept")
      .send({ alertId: "A101", donorId: "D502" });
    expect(res.status).toBe(404);
  });

  it("verify fails before a donor accepts", async () => {
    const res = await request(app)
      .post("/api/v1/hospital/verify-qr")
      .send({ qrCode: "PL-TOKEN-9021" });
    expect(res.status).toBe(400);
  });

  it("full flow: dispatch, accept, reject wrong QR, verify", async () => {
    await request(app)
      .post("/api/v1/emergency/dispatch")
      .send({ bloodType: "O-", units: 2, hospitalId: "H1" });

    const wrongAlert = await request(app)
      .post("/api/v1/donor/accept")
      .send({ alertId: "WRONG", donorId: "D502" });
    expect(wrongAlert.status).toBe(404);

    const accept = await request(app)
      .post("/api/v1/donor/accept")
      .send({ alertId: "A101", donorId: "D502" });
    expect(accept.body.qrPayload).toBe("PL-TOKEN-9021");

    const accepted = await request(app).get("/api/v1/emergency/active");
    expect(accepted.body.status).toBe("ACCEPTED");
    expect(accepted.body.donorsEnRoute).toHaveLength(1);

    const wrongQr = await request(app)
      .post("/api/v1/hospital/verify-qr")
      .send({ qrCode: "WRONG" });
    expect(wrongQr.status).toBe(400);

    const verify = await request(app)
      .post("/api/v1/hospital/verify-qr")
      .send({ qrCode: "PL-TOKEN-9021" });
    expect(verify.body.status).toBe("FULFILLED");
    expect(typeof verify.body.sms).toBe("string");

    const done = await request(app).get("/api/v1/emergency/active");
    expect(done.body.status).toBe("FULFILLED");
  });

  it("reset clears the alert", async () => {
    await request(app)
      .post("/api/v1/emergency/dispatch")
      .send({ bloodType: "O-", units: 2, hospitalId: "H1" });
    await request(app).post("/api/v1/demo/reset");
    const res = await request(app).get("/api/v1/emergency/active");
    expect(res.body.status).toBe("NONE");
  });
});