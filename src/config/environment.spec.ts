import { validateEnvironment } from "./environment";

describe("validateEnvironment", () => {
  it("applies safe local defaults", () => {
    expect(validateEnvironment({})).toMatchObject({
      NODE_ENV: "development",
      PORT: 3001,
      CORS_ORIGIN: "http://localhost:3000",
    });
  });

  it("rejects an invalid CORS origin", () => {
    expect(() => validateEnvironment({ CORS_ORIGIN: "not-a-url" })).toThrow();
  });
});
