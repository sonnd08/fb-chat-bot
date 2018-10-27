var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const route = require('./routes')
const colors = require('colors');
const fs = require("fs");
const login = require("facebook-chat-api");
const { loadConfigFromDotEnv } = require('./utils/untils');

var app = express();


loadConfigFromDotEnv();

const answerSentence = process.env.DEFAULT_ANSWER;
const answerDelayTime = process.env.ANSWER_DELAY_TIME;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var threadTimeOutMap = {}


login({ appState: JSON.parse(fs.readFileSync('appstate.json', 'utf8')) }, (err, api) => {
  if (err) return console.error(err);

  // Here you can use the api
  api.setOptions({
    listenEvents: true,
    logLevel: 'silent'
  });

  api.listen((err, event) => {
    if (err) return console.error(err);

    switch (event.type) {
      case 'message': {
        if (event.isGroup) {
          return;
        }
        console.log(`Received a message: `.green, event);
        console.log('message threadTimeOutMap'.bgBlue, threadTimeOutMap);
        sendMessageDebounce(api, event.threadID);
        break;
      }
      case 'typ': {
        console.log(`someone is  typing: `.green, event);
        console.log('typ threadTimeOutMap'.bgBlue, threadTimeOutMap);
        if (event.isTyping && threadTimeOutMap[event.from]) {
          console.log('clear timer to waiting typing end'.red);
          clearTimeout(threadTimeOutMap[event.from]);
        }
        else {
          if (!event.isTyping) {
            sendMessageDebounce(api, event.from);
          }
        }
        break;
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


function sendMessageDebounce(fbAPI, threadID) {
  if (threadTimeOutMap[threadID]) {
    clearTimeout(threadTimeOutMap[threadID]);
    console.log('cleared old timer for thread '.bgYellow, threadID);
  }

  answerTimer = setTimeout(() => {
    fbAPI.sendMessage(answerSentence, threadID);
    clearTimeout(threadTimeOutMap[threadID]);
    delete threadTimeOutMap[threadID];
  }, answerDelayTime)

  threadTimeOutMap[threadID] = answerTimer
}