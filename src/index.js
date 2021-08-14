import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {Button,Grid,TextField,Radio,Table,TableBody,TableCell,TableHead,TableRow, Typography } from "@material-ui/core";
import axios from "axios";

const PROXY_ADDRESS = "127.0.0.1"
const PROXY_PORT = 8080

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);

export default function App() {
  const [serverNameSum, setServerNameSum] = useState("");
  const [serverNameData, setServerNameData] = useState("")
  const [numOne, setNumOne] = useState("");
  const [numTwo, setNumTwo] = useState("");
  const [result, setResult] = useState("");
  const [loadBalancer, setLoadBalancer] = useState("random");
  const [data, setData] = useState([]);
  const [elapsedTime, setElapsedTime] = useState("");

  useEffect(() => {
    axios.get(`http://${PROXY_ADDRESS}:${PROXY_PORT}/parseYaml`)
      .then(res => console.log(res.data.data))
      .catch(err => console.log(err))
  }, [])


  //The reverse proxy is listening at localhost:8080
  const sumNumbers = () => {
    if (numOne !== "" && numTwo !== "") {
      axios
        .post(`http://${PROXY_ADDRESS}:${PROXY_PORT}/sumNumbers`, {
          numOne,
          numTwo,
          loadBalancer,
        })
        .then((res) => {
          //The query returns the result and the server that calculated the result
          setResult(res.data.result);
          setServerNameSum(res.data.serverName);
        })
        .catch((err) => console.log(err));
    } else alert("Fill all the fields")
  };

  const handleLoadBalancer = (e) => {
    setLoadBalancer(e.target.value);
  };

  //function to test the in-memory cache, if there is a cache hit
  //the time elapsed to return a response should be significantly less
  const getData = () => {
    let start_time = new Date().getTime();
    axios
      .post(`http://${PROXY_ADDRESS}:${PROXY_PORT}/getData`, { loadBalancer })
      .then((res) => {
        setData(res.data.data);
        setServerNameData(res.data.serverName)
        setElapsedTime(`${new Date().getTime() - start_time} milliseconds`);
      })
      .catch((err) => console.log(err));
  };

  return (
    <div style={{textAlign: "center"}}>
      <Typography variant="h4">REVERSE PROXY </Typography>
      <Grid container>
        <Grid item xs={12} style={{textAlign: "center"}}>
          <Typography variant="h6">Choose load balancing strategy</Typography>
          <label>Random</label>
          <Radio
            checked={loadBalancer === "random"} onChange={handleLoadBalancer}
            value="random" name="radio-load-balancer" />
          <label>Round Robin</label>
          <Radio
            checked={loadBalancer === "roundrobin"} onChange={handleLoadBalancer}
            value="roundrobin" name="radio-load-balancer" />
        </Grid>
        <Grid item xs={12}  style={{textAlign: "center"}}>
          <Typography variant="h6">Or manually choose a server</Typography>
          <label>Server One</label>
          <Radio
            checked={loadBalancer === "one"} onChange={handleLoadBalancer}
            value="one" name="radio-load-balancer" />
          <label>Server Two</label>
          <Radio
            checked={loadBalancer === "two"} onChange={handleLoadBalancer}
            value="two" name="radio-load-balancer" />
        </Grid>
        <Grid item xs={6} style={{textAlign: "center", padding: "1rem"}}>
          <Typography variant="h5">Sum Numbers</Typography>
          <TextField value={numOne} onChange={(e) => setNumOne(e.target.value)} type="number" label="First number" variant="outlined" />
          &nbsp;
          <TextField value={numTwo} onChange={(e) => setNumTwo(e.target.value)} type="number" label="Second number" variant="outlined" />
          <br /> <br />
          <Button variant="contained" onClick={sumNumbers}> Sum</Button>
          <Typography variant="subtitle2">Result: {result}</Typography>
          <Typography variant="subtitle2">Delivered by server : {serverNameSum} </Typography>
        </Grid>

        <Grid item xs={6} style={{textAlign: "center"}}>
          <Typography variant="h5">Get Random Data</Typography>
          <Typography variant="subtitle1">Time elapsed: {elapsedTime} </Typography>
          <Typography variant="subtitle1">Delivered by server: {serverNameData}</Typography>
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
