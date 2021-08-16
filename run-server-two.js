const app = require("./servers/server-two");

var PORT = 9092;
var ADDRESS = "127.0.0.1";

app.listen(PORT, ADDRESS, () =>
  console.info(`Server listening at ${ADDRESS}:${PORT}`)
);
