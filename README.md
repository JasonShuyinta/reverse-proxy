# reverse-proxy
## Usage
In order to run the program:
1. Create a new folder and clone the repository using the following commands on a git shell:
- git init
- git clone https://github.com/JasonShuyinta/reverse-proxy.git
2. Once the repository is downloaded, navigate to the main folder with the following command:
- cd reverse-proxy
3. Install all the necessary dependencies with the npm command:
- npm install
4. Once the installation is finished, open 4 terminals, navigate with each of them to the reverse-proxy folder and run the following commands:
- node run-server-one.js
- node run-server-two.js
- node run-reverse-proxy.js
- npm start


If the steps are done correctly, a web page should open at http://localhost:8080

# Test
To run the tests, open a new terminal and navigate to the reverse-proxy folder and run the following command:
- npm test


## Documentation
This example of a reverse proxy has been done using [NodeJs](https://nodejs.org/en/) and [ExpressJs](https://expressjs.com). 
The reason for using this framework is that it is simple to configure and it has a lot of documentation over the web with an active community.

### Servers 
First of all, the 2 servers were created: they are identical, running on different ports (the addresses
are the same, but changing them will not affect the functionality of the program). There are just
two simple operations done by the servers: “sumNumbers” and “getData”.

- /sumNumbers: it is a POST operation, that takes as input two numbers and returns the
sum of these values. Plus, it returns the server address that computed this calculation, in
order for the client to check which server was involved.

```javascript
app.post("/sumNumbers", (req, res) => {
  counter++;
  return res.status(200).json({
    result: parseInt(req.body.numOne) + parseInt(req.body.numTwo),
    serverName: req.headers.host,
    counter,
  });
});
```
- /getData: it is a POST operation as well, and what it does is simply retrieve some random
data taken from a mock [API](https://jsonplaceholder.typicode.com/). This operation was
implemented to test the caching in the proxy.

```javascript
app.post("/getData", (req, res) => {
  //Mock API to get random data
  axios
    .get("https://jsonplaceholder.typicode.com/todos")
    .then((response) => {
      counter++;
      return res.status(200).json({
        data: response.data,
        serverName: req.headers.host,
        counter,
      });
    })
    .catch((err) => console.log(err));
});
```

### Reverse Proxy
After these two servers were done, I have implemented the reverse proxy. 
Every request done by the client has to pass first through the proxy before reaching on the target servers. In this proxy
many operations could be done, both on the requests and the responses. 
For example: when the “sumNumbers” request is called, the proxy verifies which load balancing strategy to use in order
to choose which server will handle the operation. Two strategies are implemented: Random and
Round Robin. 


The first one just randomly picks one of the servers from the array and passes on the
request, the latter picks sequentially a server from the array for subsequent requests that arrive to
the proxy: in case one of the servers has served more requests than the other one, a while loop is implemented in order to keep track of
each servers usage, in this way requests are forwarded to the server that has provided less responses. This was implemented to
maintain a balance between the two servers so that they each respond to roughly 50% of the requests when the Round Robin is active.
It resembles the mechanism of the Least Connection algorithm, where requests are passed to the server that has the least active connections.

```javascript
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
```

It was also implemented the possibility to directly choose the server instead of passing through a load balancing strategy just to verify
that the Round Robin effectively conveys to the 50% usage on both of the servers.

```javascript
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
```

In all cases, headers are set, so that the server is able to read JSON data coming from the POST requests and the Host header property is 
also set with the chosen target given by the load balancing strategy.

```javascript
  if (req.body) {
    //In order for the request to pass through the proxy to the server, set the headers of the request
    // so that it can read JSON data and set the Host to the chosen server address
    let bodyData = JSON.stringify(req.body);
    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    proxyReq.setHeader("Host", chosenTarget)
    proxyReq.write(bodyData);
  }
```

The proxy even gets the responses from the server before passing it back to the client.
In particular for the “getData” operation the proxy can store the response in the cache. The cache remains
stored for only 5 seconds, so that if the same request is done within this timeframe, there is no
need to query the server, it simply takes the stored response from the cache and returns it back to
the client, saving bandwidth usage and reducing latency.
Caching could also be done on the client side, saving them directly into the browser, avoiding the
need to reach the proxy, reducing even more the response time.

```javascript
//Set cache storing time to 5 seconds
const myCache = new NodeCache({ stdTTL: 5 });

//[omitted code here...]

//If there is request made to the "/getData" endpoint the response is stored
//in the cache. If a request is made to the same endpoint within 5 seconds from the
//previous request, the response is taken from the cache instead of querying the server,
//reducing bandwidth usage and latency.
if (req.path == "/getData") {
  if (myCache.has("todos")) 
    return res.status(200).send(myCache.get("todos"));
}
```

Before passing on the response to the client a simple operation is done to calculate the usage percentage of each server: on each
API call a counter was incremented and returned in the response. In the proxy this counter is used to get the server usage percentage out of all the calls made
to every server. The total number of calls is mantained only in the proxy, so each server only knows its own usage, ignoring the usage of its peers.
The usage property is then added to the response body through a library called "node-http-proxy-json". It is important to clarify that the library 
at the moment only supports the gzip, deflate and uncompressed formats, and so assure that the servers use one of these compression formats. 

```javascript
modifyResponse(res, proxyRes, function (body) {
  if (body) {
      var totalUsage = serverOneUsageCounter + serverTwoUsageCounter;
      body.serverOneUsage = Math.floor((serverOneUsageCounter / totalUsage) * 100)
      body.serverTwoUsage = Math.floor((serverTwoUsageCounter / totalUsage) * 100)
      delete body.version;
  }
  return body;
})
```

On the app first run, there is an API call made by the client to the "/parseYaml" endpoint. What it does is simply parse the 
"config.yaml" file into a JSON object (through the "js-yaml" library) and it uses this data to link the proxy to the active servers. 
So in case there is a need to link more servers to the proxy, it is simply necessary to add the address and port number of the server 
to the YAML file and reload the webpage, in this way the proxy will automatically include the new server between the choices for the target servers.

```javascript
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
```

ReactJs was used for the frontend, just to simplify dynamic rendering, and Material-UI as the UI framework for quick-to-use table.
What follows is the list of the libraries that have been used for the assignment:

- axios v.0.21.1
- cors v.2.8.5
- express v.4.17.1
- http-proxy v.1.18.1
- js-yaml v.4.1.0
- node-cache v.5.1.2
- react v.17.0.2
- nodemon v.2.0.12
- node-http-proxy-json v.0.1.9

## Testing
To test the software, 2 libraries were used: "jest" and "supertest". Tests were done on the return values the servers are supposed to give, 
and on the status codes and headers expected. There are tests for the reverse-proxy file, and the on the 2 servers.



Useful links:

Server Cache in Node Js – YouTube https://www.youtube.com/watch?v=ipIGWZwxC7w&t=499s

http-proxy – Github Repository https://github.com/http-party/node-http-proxy#readme

Mock API - https://jsonplaceholder.typicode.com

Measuring response time: https://dzone.com/articles/properly-measuring-http-request-time-with-nodejs

Jest - https://jestjs.io

Supertest - https://github.com/visionmedia/supertest#readme

node-http-proxy-json - https://github.com/langjt/node-http-proxy-json#readme



## Author:
### Jason Shuyinta
