var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const route = require('./routes');
const colors = require('colors');

const fs = require("fs");
const login = require("facebook-chat-api");
// You can find your project ID in your Dialogflow agent settings
const projectId = 'newagent-c8d13'; //https://dialogflow.com/docs/agents#settings
const sessionId = 'fbBot-session-id';
const languageCode = 'en-US';

// Instantiate a DialogFlow client.
const dialogflow = require('dialogflow');
const sessionClient = new dialogflow.SessionsClient({
  keyFilename: './dialogflowKey.json'
});

// Define session path
const sessionPath = sessionClient.sessionPath(projectId, sessionId);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

login({ appState: JSON.parse(fs.readFileSync('appstate.json', 'utf8')) }, (err, api) => {
  if (err) return console.error(err);
  // Here you can use the api
  api.listen((err, event) => {
    if (err) return console.error(err);

    switch (event.type) {
      case 'message': {
        console.log(`Received a message: `.green, event.body);
        // The text query request.
        const request = {
          session: sessionPath,
          queryInput: {
            text: {
              text: event.body,
              languageCode: languageCode,
            },
          },
        };
        // Send request and log result
        sessionClient
          .detectIntent(request)
          .then(responses => {
            console.log('Detected intent');
            const result = responses[0].queryResult;
            console.log(`  Query: ${result.queryText}`);
            console.log(`  Response: ${result.fulfillmentText}`);
            api.sendMessage(result.fulfillmentText, event.threadID);
            if (result.intent) {
              console.log(`  Intent: ${result.intent.displayName}`);
            } else {
              console.log(`  No intent matched.`);
            }
          })
          .catch(err => {
            console.error('ERROR:'.bgred, err);
          });
      }
      default: {
        console.log(event);
      }
    }
  })
});

route(app);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
