const express = require('express')
const cors = require("cors")
const { default: axios } = require('axios');
require('dotenv').config()

const app = express()

app.use(express.json());
app.use(cors());

var counter = 0

app.post('/sumNumbers', (req,res) => {
    var numOne = parseInt(req.body.numOne)
    var numTwo = parseInt(req.body.numTwo)
    counter++;
    console.log(`counter: ${counter}`);
    return res.status(200).json({ 
        result: numOne + numTwo, 
        serverName: `${req.hostname}:${process.env.SERVER_ONE_PORT}`,
        counter })
})

app.post('/getData', (req, res) => {
    //Mock API to get random data
    axios.get("https://jsonplaceholder.typicode.com/todos")
     .then(response => { 
        counter++;
        console.log(`counter: ${counter}`);
        return res.status(200).json({ 
            data: response.data, 
            serverName: `${req.hostname}:${process.env.SERVER_ONE_PORT}`,
            counter }) })
     .catch(err => console.log(err));
 })

app.listen(process.env.SERVER_ONE_PORT, process.env.SERVER_ONE_ADDRESS, 
    () => console.info(`Server listening at ${process.env.SERVER_ONE_ADDRESS}:${process.env.SERVER_ONE_PORT}`))