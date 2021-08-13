const http = require("http");
const express = require("express");
const httpProxy = require("http-proxy");
const NodeCache = require("node-cache");
const cors = require("cors");
require('dotenv').config()

const fs = require('fs')
const yaml = require('js-yaml')


//Addresses of the 2 servers that can handle client requests.
//There can be more than 2 servers.
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

      //If there is request made to the "/getData" endpoint the response is stored
      //in the cache. If a request is made to the same endpoint within 5 seconds from the 
      //previous request, the response is taken from the cache instead of querying the server, 
      //reducing bandwidth usage and latency.
      //After 5 seconds the caches are emptied.
      if(req.path == "/getData") {
        if (myCache.has("todos")) {
          console.log("Cache hit");
          return res.status(200).send(myCache.get("todos"));
        }
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
    var responseData = JSON.parse(dataBuffer.toString("utf8"))

    console.log(
      `Server: ${responseData.serverName} has counter ${responseData.counter}`
      )

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

proxyApp.get('/parseYaml', (req,res) => {
  try {
      targets = []
      let data = yaml.load(fs.readFileSync('./config.yaml', 'utf8'));
      data.proxy.services[0].hosts.forEach(host => {
        targets.push(`http://${host.address}:${host.port}`)
      });
      return res.status(200).json({data})
  } catch (e) {
      console.log(e);
  }
})

proxyApp.use(function (req, res) {
  proxy.web(req, res, {
    //Based on the user's choice, it is possible to choose between 2 load balancing strategies
    target: isRandom ? randomLoadBalancer() : roundRobinBalancer(),
  });
});

http.createServer(proxyApp)
  .listen(process.env.REACT_APP_PROXY_PORT, process.env.REACT_APP_PROXY_ADDRESS, 
  () => { console.log(`Proxy server listening at ${process.env.REACT_APP_PROXY_ADDRESS}:${process.env.REACT_APP_PROXY_PORT}`);
});
