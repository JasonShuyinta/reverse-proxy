//Each endpoint has a counter to keep track of the server
//usage, so that the Round Robin Load Balancing strategy can 
//distribute equally the requests between the servers.

const express = require("express");
const cors = require("cors");
const { default: axios } = require("axios");

const app = express();

app.use(express.json());
app.use(cors());

var counter = 0;

app.post("/sumNumbers", (req, res) => {
  counter++;
  return res.status(200).json({
    result: parseInt(req.body.numOne) + parseInt(req.body.numTwo),
    serverName: req.headers.host,
    counter,
  });
});

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

module.exports = app;
