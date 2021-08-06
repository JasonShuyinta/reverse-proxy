const express = require('express')
const cors = require("cors");
const { default: axios } = require('axios');

const app = express()

const port = 9092

app.use(express.json());
app.use(cors());

app.post('/sumNumbers', (req,res) => {
    var numOne = parseInt(req.body.numOne)
    var numTwo = parseInt(req.body.numTwo)
    return res.status(200).json({ result: numOne + numTwo, serverName: port })
})

app.post('/getData', (req, res) => {
    //Mock API to get random data
    axios.get("https://jsonplaceholder.typicode.com/todos")
    .then(response => { 
        console.log("Server Two Responded!");
        return res.status(200).json({ data: response.data}) })
    .catch(err => console.log(err));
})


app.listen(port, () => console.info(`Server listening on port ${port}`))