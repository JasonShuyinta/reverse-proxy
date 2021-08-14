const http = require("http");
const express = require("express");
const httpProxy = require("http-proxy");
const NodeCache = require("node-cache");
const cors = require("cors");
require("dotenv").config();

const fs = require("fs");
const yaml = require("js-yaml");

var targets = [];
var counter = 0;
var serverOneUsageCounter = 0;
var serverTwoUsageCounter = 0;

//This load balancer strategy chooses one of the servers randomly to serve the request
function randomLoadBalancer() {
  var chosenTarget = targets[Math.floor(Math.random() * targets.length)];
  return chosenTarget;
}

//The Round Robin strategy selectes sequentially the servers, so that each subsequent request is
//served by the next server
function roundRobinBalancer() {
  //the while loop assures that the servers work equally, distributing the incoming requests
  //to the server that has worked less. It is based on the idea of the Least Connection algorithm. 
  while(Math.abs(serverOneUsageCounter - serverTwoUsageCounter) > 1) {
    if(serverOneUsageCounter > serverTwoUsageCounter) chosenTarget = targets[1];
    else chosenTarget = targets[0]
    return chosenTarget;
  }
  var chosenTarget = targets[counter];
  counter++;
  if (counter === targets.length) counter = 0;
  return chosenTarget;
}

//Creating the proxy
const proxy = httpProxy.createProxyServer({});

//Store cache for 5 seconds, then delete it
const myCache = new NodeCache({ stdTTL: 5 });

//The request passes through the proxy before being passed on to one of the servers
proxy.on("proxyReq", function (proxyReq, req, res, options) {
  //If there is request made to the "/getData" endpoint the response is stored
  //in the cache. If a request is made to the same endpoint within 5 seconds from the
  //previous request, the response is taken from the cache instead of querying the server,
  //reducing bandwidth usage and latency.
  if (req.path == "/getData") {
    if (myCache.has("todos")) {
      console.log("Cache hit");
      return res.status(200).send(myCache.get("todos"));
    }
  }

  if (req.body) {
    //In order for the request to pass through the proxy to the server, set the headers of the request
    // so that it can read JSON data
    let bodyData = JSON.stringify(req.body);
    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
});


//Work on the response obtained from the server before passing it back to the client
proxy.on("proxyRes", function (proxyRes, req, res) {
  proxyRes.on("data", function (dataBuffer) {
    var data = dataBuffer.toString("utf8");

    //Counters to keep track of the work load on each server
    if (`http://${JSON.parse(data).serverName}` == targets[0])
      serverOneUsageCounter = JSON.parse(data).counter; 
    if (`http://${JSON.parse(data).serverName}` == targets[1])
      serverTwoUsageCounter = JSON.parse(data).counter;

    //If the request is made to "/getData", store the response in the cache
    if (proxyRes.client._httpMessage.path == "/getData")
      myCache.set("todos", data);
  });
});

const proxyApp = express();
proxyApp.use(express.json());
proxyApp.use(express.urlencoded({ extended: true }));
proxyApp.use(cors());

//The "/parseYaml" endpoint is called only once, on the applications first render.
//It parses the "config.yaml" to obtain addresses and ports of the servers.
proxyApp.get("/parseYaml", (req, res) => {
  try {
    targets = [];
    let data = yaml.load(fs.readFileSync("./config.yaml", "utf8"));
    data.proxy.services[0].hosts.forEach((host) => {
      targets.push(`http://${host.address}:${host.port}`);
    });
    return res.status(200).json({ data });
  } catch (e) {
    console.log(e);
  }
});

//Based on the clients decision, select the load balancing strategy, 
//or directly set the server to respond to the request
proxyApp.use(function (req, res) {
  var chosenStrategy = "";
  switch (req.body.loadBalancer) {
    case "random":
      chosenStrategy = randomLoadBalancer();
      break;
    case "roundrobin":
      chosenStrategy = roundRobinBalancer();
      break;
    case "one":
      chosenStrategy = targets[0];
      break;
    case "two":
      chosenStrategy = targets[1];
      break;
  }
  proxy.web(req, res, {
    target: chosenStrategy,
  });
});

const PORT = 8080;
const ADDRESS = "127.0.0.1"

http
  .createServer(proxyApp)
  .listen(
    PORT,
    ADDRESS,
    () => {
      console.log(
        `Proxy server listening at ${ADDRESS}:${PORT}`
      );
    }
  );
