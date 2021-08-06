const http = require("http");
const express = require("express");
const httpProxy = require("http-proxy");
const NodeCache = require("node-cache");
const cors = require("cors");


//Addresses of the 2 servers that can handle client requests.
//There can be more than 2 servers.
const targets = ["http://localhost:9091", "http://localhost:9092"];

var counter = 0;

//This load balancer strategy chooses one of the servers randomly to serve the request
function randomLoadBalancer() {
  var chosenTarget = targets[Math.floor(Math.random() * targets.length)];
  return chosenTarget;
}

//The Round Robin strategy selectes sequentially the servers, so that each subsequent request is 
//served by the next server
function roundRobinBalancer() {
  var chosenTarget = targets[counter];
  counter++;
  if (counter === targets.length) counter = 0;
  return chosenTarget;
}

//Creating the proxy
const proxy = httpProxy.createProxyServer({});

//Store cache for 5 seconds, then delete it
const myCache = new NodeCache({ stdTTL: 5 });

var isRandom = false;

//The request passes through the proxy before being passed on to one of the servers
proxy.on("proxyReq", function (proxyReq, req, res, options) {
  //If it's a post request
  if (req.body) {
    if (req.body.loadBalancer) {
      //Set the load balancing strategy
      if (req.body.loadBalancer === "random") isRandom = true;
      else isRandom = false;
    } else {

      //If there is request made to the "/getData" endpoint within 5 seconds to the 
      //previous request, the response is stored in the cache of the proxy. 
      //Use this result instead of querying the server, reducing bandwidth usage and latency.
      if (myCache.has("todos")) {
        console.log("Cache hit");
        return res.status(200).send(myCache.get("todos"));
      }
    }
    
    //In order for the request to pass through the proxy to the server, set the headers of the request
    // so that it can read JSON data
    let bodyData = JSON.stringify(req.body);
    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    // Stream the content
    proxyReq.write(bodyData);
  }
});

//Before passing the response from the server back to the client
//let's store it in the cache
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
    //Based on the user's choice, it is possible to choose between 2 load balancing strategies
    target: isRandom ? randomLoadBalancer() : roundRobinBalancer(),
  });
});

http.createServer(proxyApp).listen(5000, "localhost", () => {
  console.log("Proxy server listening on 5000");
});
