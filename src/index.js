import React, { useState } from "react";
import ReactDOM from "react-dom";
import {Button,Grid,TextField,Radio,Table,TableBody,TableCell,TableHead,TableRow } from "@material-ui/core";
import axios from "axios";

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);

export default function App() {
  const [serverName, setServerName] = useState("");
  const [numOne, setNumOne] = useState("");
  const [numTwo, setNumTwo] = useState("");
  const [result, setResult] = useState("");
  const [loadBalancer, setLoadBalancer] = useState("random");
  const [data, setData] = useState([]);
  const [elapsedTime, setElapsedTime] = useState("");

  //The reverse proxy is listening at localhost:5000 
  const sumNumbers = () => {
    if (numOne !== "" && numTwo !== "") {
      axios
        .post("http://localhost:5000/sumNumbers", {
          numOne,
          numTwo,
          loadBalancer,
        })
        .then((res) => {
          //The query returns the result and the server that calculated the result
          setResult(res.data.result);
          setServerName(`http://localhost:${res.data.serverName}`);
        })
        .catch((err) => console.log(err));
    }
  };

  const handleLoadBalancer = (e) => {
    setLoadBalancer(e.target.value);
  };

  //function to test the in-memory cache, if there is a cache hit
  //the time elapsed to return a respond should be significantly less
  const getData = () => {
    let start_time = new Date().getTime();
    axios
      .post("http://localhost:5000/getData", {})
      .then((res) => {
        setData(res.data.data);
        setElapsedTime(`${new Date().getTime() - start_time} milliseconds`);
      })
      .catch((err) => console.log(err));
  };

  return (
    <div style={{textAlign: "center"}}>
      <h1>REVERSE PROXY </h1>
      <Grid container>
        <Grid item xs={6} style={{textAlign: "center"}}>
          <h3>Sum Numbers</h3>
          <label>Random</label>
          <Radio
            checked={loadBalancer === "random"} onChange={handleLoadBalancer}
            value="random" name="radio-load-balancer" />
          <label>Round Robin</label>
          <Radio
            checked={loadBalancer === "roundrobin"} onChange={handleLoadBalancer}
            value="roundrobin" name="radio-load-balancer" />
          <br />
          <TextField value={numOne} onChange={(e) => setNumOne(e.target.value)} type="number" label="First number" variant="outlined" />
          &nbsp;
          <TextField value={numTwo} onChange={(e) => setNumTwo(e.target.value)} type="number" label="Second number" variant="outlined" />
          <br /> <br />
          <Button variant="contained" onClick={sumNumbers}> Sum</Button>
          <p>Result: {result}</p>
          <p>Delivered by server : {serverName} </p>
        </Grid>

        <Grid item xs={6} style={{textAlign: "center"}}>
          <h3>Get Random Data</h3>
          <p>Time elapsed: {elapsedTime} </p>
          <Button variant="contained" onClick={getData}> Get Data</Button>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>UserId</TableCell>
                <TableCell align="right">Id</TableCell>
                <TableCell align="right">Title</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data &&
                data.map((element, index) => (
                  <TableRow key={index}>
                    <TableCell component="th" scope="row"> {element.userId} </TableCell>
                    <TableCell align="right">{element.id}</TableCell>
                    <TableCell align="right">{element.title}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Grid>
      </Grid>
    </div>
  );
}
