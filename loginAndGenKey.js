const fs = require("fs");
const login = require("facebook-chat-api");

login({email: process.env.email, password: process.env.pass || process.env.password}, (err, api) => {
    if(err) return console.error(err);

    fs.writeFileSync('appstate.json', JSON.stringify(api.getAppState()));
});