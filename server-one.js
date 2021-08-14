const express = require("express");
const cors = require("cors");
const { default: axios } = require("axios");

const app = express();

app.use(express.json());
app.use(cors());

var PORT = 9091
var ADDRESS = "127.0.0.1"
var counter = 0;

app.post("/sumNumbers", (req, res) => {
  var numOne = parseInt(req.body.numOne);
  var numTwo = parseInt(req.body.numTwo);
  counter++;
  console.log(`counter: ${counter}`);
  return res.status(200).json({
    result: numOne + numTwo,
    serverName: `${req.hostname}:${PORT}`,
    counter,
  });
});

app.post("/getData", (req, res) => {
  //Mock API to get random data
  axios
    .get("https://jsonplaceholder.typicode.com/todos")
    .then((response) => {
      counter++;
      console.log(`counter: ${counter}`);
      return res.status(200).json({
        data: response.data,
        serverName: `${req.hostname}:${PORT}`,
        counter,
      });
    })
    .catch((err) => console.log(err));
});

app.listen(PORT, ADDRESS, () =>
  console.info(
    `Server listening at ${ADDRESS}:${PORT}`
  )
);
