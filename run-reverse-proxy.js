const modules = require("./servers/reverse-proxy");
const http = require("http");

const PORT = 8080;
const ADDRESS = "127.0.0.1";

http.createServer(modules.proxyApp).listen(PORT, ADDRESS, () => {
  console.log(`Proxy server listening at ${ADDRESS}:${PORT}`);
});
