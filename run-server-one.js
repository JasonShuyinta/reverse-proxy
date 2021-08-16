const app = require("./servers/server-one");

var PORT = 9091;
var ADDRESS = "127.0.0.1";

app.listen(PORT, ADDRESS, () =>
  console.info(`Server listening at ${ADDRESS}:${PORT}`)
);

