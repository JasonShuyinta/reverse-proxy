const http = require("http");
const express = require("express");
const httpProxy = require("http-proxy");
const NodeCache = require("node-cache");
const cors = require("cors");

const myCache = new NodeCache({ stdTTL: 5 });
const targets = ["http://localhost:9091", "http://localhost:9092"];
var counter = 0;

function randomLoadBalancer() {
  var chosenTarget = targets[Math.floor(Math.random() * targets.length)];
  return chosenTarget;
}

function roundRobinBalancer() {
  var chosenTarget = targets[counter];
  counter++;
  if (counter === targets.length) counter = 0;
  return chosenTarget;
}

const proxy = httpProxy.createProxyServer({});
var isRandom = false;

// Restream parsed body before proxying
proxy.on("proxyReq", function (proxyReq, req, res, options) {
  if (req.body) {
    if (req.body.loadBalancer) {
      if (req.body.loadBalancer === "random") isRandom = true;
      isRandom = false;
    } else {
      if (myCache.has("todos")) {
        console.log("Cache hit");
        return res.status(200).send(myCache.get("todos"));
      }
    }
    let bodyData = JSON.stringify(req.body);
    // In case if content-type is application/x-www-form-urlencoded -> we need to change to application/json
    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    // Stream the content
    proxyReq.write(bodyData);
  }
});

proxy.on("proxyRes", function (proxyRes, req, res) {
  proxyRes.on("data", function (dataBuffer) {
    if (proxyRes.client._httpMessage.path == "/getData") {
      var data = dataBuffer.toString("utf8");
      myCache.set("todos", data);
    }
  });
});

const proxyApp = express();
proxyApp.use(express.json());
proxyApp.use(express.urlencoded({ extended: true }));
proxyApp.use(cors());

proxyApp.use(function (req, res) {
  proxy.web(req, res, {
    target: isRandom ? randomLoadBalancer() : roundRobinBalancer(),
  });
});

http.createServer(proxyApp).listen(5000, "localhost", () => {
  console.log("Proxy server listening on 5000");
});
