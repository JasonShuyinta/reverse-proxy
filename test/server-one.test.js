const request = require("supertest");
const app = require("../servers/server-one");

describe("POST /sumNumbers", () => {
    test("Response should have a 200 status code", async () => {
      const response = await request(app).post("/sumNumbers").send({
        numOne: "1",
        numTwo: "2",
      });
      expect(response.statusCode).toBe(200);
    });

    test("Response should be the sum of 1 and 2", async () => {
      const response = await request(app).post("/sumNumbers").send({
        numOne: "1",
        numTwo: "2",
      });
      expect(response.body.result).toBe(3);
    });

    test("Response should contain the correct server name", async () => {
      const response = await request(app).post("/sumNumbers").send({
        numOne: "1",
        numTwo: "2",
      });
      expect(response.body.serverName.split(":")[0]).toBe("127.0.0.1");
    });

    test("Response should specify JSON in the content type header", async () => {
      const response = await request(app).post("/sumNumbers").send({
        numOne: "1",
        numTwo: "2",
      });
      expect(response.headers["content-type"]).toEqual(
        expect.stringContaining("json")
      );
    });
});

describe("POST /getData", () => {
    test("Response should have a 200 status code", async () => {
      const response = await request(app).post("/getData").send();
      expect(response.statusCode).toBe(200);
    });

    test("Response should contain the correct server name", async () => {
      const response = await request(app).post("/getData").send();
      expect(response.body.serverName.split(":")[0]).toBe("127.0.0.1");
    });
});
