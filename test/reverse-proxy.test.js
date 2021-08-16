const request = require("supertest");
const modules = require("../servers/reverse-proxy");

const proxyApp = modules.proxyApp;
const randomLoadBalancer = modules.randomLoadBalancer;
const roundRobinBalancer = modules.roundRobinBalancer;

describe("GET /parseYaml", () => {
  describe("get the parse yaml file", () => {
    test("Response should have a 200 status code", async () => {
      const response = await request(proxyApp).get("/parseYaml").send();
      expect(response.statusCode).toBe(200);
    });
  });

  describe("get the json object of the parsed yaml", () => {
    test("Response should have a 200 status code", async () => {
      const response = await request(proxyApp).get("/parseYaml").send();
      expect(response.body).toEqual({
        data: {
          proxy: {
            listen: {
              address: "127.0.0.1",
              port: 8080,
            },
            services: [
              {
                name: "my-service",
                domain: "my-service.my-company.com",
                hosts: [
                  { address: "127.0.0.1", port: 9091 },
                  { address: "127.0.0.1", port: 9092 },
                ],
              },
            ],
          },
        },
      });
    });
  });
});

test("Get the addresses of one of the 2 servers", () => {
  expect(
    randomLoadBalancer() == "http://127.0.0.1:9091" ||
    randomLoadBalancer() == "http://127.0.0.1:9092"
  ).toBe(true);
});

test("Get the addresses of one of the 2 servers", () => {
  expect(
    roundRobinBalancer() == "http://127.0.0.1:9091" ||
    roundRobinBalancer() == "http://127.0.0.1:9092"
  ).toBe(true);
});
