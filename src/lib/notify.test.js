import { describe, it, expect } from "vitest";
import { sendRecapLinks } from "./notify";

describe("sendRecapLinks", () => {
  it("sends via SMS to a guest with a phone number", async () => {
    const results = await sendRecapLinks("DL-12345", [{ id: "g1", name: "Alice", phone: "+33612345678", email: "" }]);
    expect(results[0]).toMatchObject({ guestId: "g1", channel: "sms", sent: true });
    expect(results[0].link).toContain("DL-12345");
  });

  it("sends via email when only an email is provided", async () => {
    const results = await sendRecapLinks("DL-12345", [{ id: "g2", name: "Bob", phone: "", email: "bob@test.com" }]);
    expect(results[0]).toMatchObject({ guestId: "g2", channel: "email", sent: true });
  });

  it("does not send anything to a guest with no contact info", async () => {
    const results = await sendRecapLinks("DL-12345", [{ id: "g3", name: "Chloé", phone: "", email: "" }]);
    expect(results[0]).toEqual({ guestId: "g3", channel: null, sent: false });
  });
});
