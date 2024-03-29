const express = require("express");
const httpProxy = require("http-proxy");
const NodeCache = require("node-cache");
const cors = require("cors");
var modifyResponse = require('node-http-proxy-json');
const fs = require("fs");
const yaml = require("js-yaml");

var targets = [];
var counter = 0;
var serverOneUsageCounter = 0;
var serverTwoUsageCounter = 0;
var chosenTarget = "";

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

//Set cache storing time to 5 seconds
const myCache = new NodeCache({ stdTTL: 5 });

//The request passes through the proxy before being passed on to one of the servers
proxy.on("proxyReq", function (proxyReq, req, res, options) {
  //If there is request made to the "/getData" endpoint the response is stored
  //in the cache. If a request is made to the same endpoint within 5 seconds from the
  //previous request, the response is taken from the cache instead of querying the server,
  //reducing bandwidth usage and latency.
  if (req.path == "/getData") {
    if (myCache.has("todos")) 
      return res.status(200).send(myCache.get("todos"));
  }

  if (req.body) {
    //In order for the request to pass through the proxy to the server, set the headers of the request
    // so that it can read JSON data and set the Host to the chosen server address
    let bodyData = JSON.stringify(req.body);
    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    proxyReq.setHeader("Host", chosenTarget)
    proxyReq.write(bodyData);
  }
});


//Work on the response obtained from the server before passing it back to the client
proxy.on("proxyRes", function (proxyRes, req, res) {
  proxyRes.on("data", function (dataBuffer) {
    var data = dataBuffer.toString("utf8");

    //Counters to keep track of the work load on each server
    if(JSON.parse(data).serverName == targets[0]) serverOneUsageCounter = JSON.parse(data).counter
    if(JSON.parse(data).serverName == targets[1]) serverTwoUsageCounter = JSON.parse(data).counter

    //If the request is made to "/getData", store the response in the cache
    if (proxyRes.client._httpMessage.path == "/getData")
      myCache.set("todos", data);
  });

  //Modify the response received from the server, adding the server usage percentage to the 
  //body of the response before passing it back to the client
  //To do this, the 'node-http-proxy-json' library has been used.
  //**Note from the library documentation**: 
  //"Usually the server will compress the data. So before using this repository, 
  //confirm your server compression format, currently only supports gzip、deflate and uncompressed."
    modifyResponse(res, proxyRes, function (body) {
      if (body) {
          var totalUsage = serverOneUsageCounter + serverTwoUsageCounter;
          body.serverOneUsage = Math.floor((serverOneUsageCounter / totalUsage) * 100)
          body.serverTwoUsage = Math.floor((serverTwoUsageCounter / totalUsage) * 100)
          delete body.version;
      }
      return body;
  })
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

//Based on the clients decision either select the load balancing strategy, 
//or directly set the server to respond to the request
proxyApp.use(function (req, res) {
  
  switch (req.body.loadBalancer) {
    case "random":
      chosenTarget = randomLoadBalancer(); break;
    case "roundrobin":
      chosenTarget = roundRobinBalancer(); break;
    case "one":
      chosenTarget = targets[0]; break;
    case "two":
      chosenTarget = targets[1]; break;
  }

  proxy.web(req, res, { target: chosenTarget });
});

//Export for testing purposes
module.exports = { proxyApp, randomLoadBalancer, roundRobinBalancer };

