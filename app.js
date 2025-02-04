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
const moment = require('moment');

var app = express();

loadConfigFromDotEnv();


const answerSentence = process.env.DEFAULT_ANSWER;
const answerDelayTime = process.env.ANSWER_DELAY_TIME;
const answerLockTime = process.env.ANSWER_LOCK_TIME;
const answerLockTimeShort = process.env.ANSWER_LOCK_TIME_SHORT;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

let threadTimeOutMap = {}
let answerLocker = {}
// skip a message of thread in this map => because it's bot message
let botChatted = {}

login({ appState: JSON.parse(fs.readFileSync('appstate.json', 'utf8')) }, (err, api) => {
  if (err) return console.error(err);

  const myID = getMyIDFromCookie();
  if (!myID) {
    console.error('Failed to load my id!'.bgRed);
    process.exit();
  }

  // Here you can use the api
  api.setOptions({
    listenEvents: true,
    logLevel: 'silent',
    selfListen: true,
  });


  api.listen((err, event) => {
    if (err) return console.error(err);
    const logTime = moment(Date.now() + 25200000).format('dddd HH:mm:ss | MMMM Do YYYY');

    switch (event.type) {
      case 'message': {
        if (event.isGroup) {
          return;
        }
        //handle self event
        if (event.senderID === myID) {
          console.log('\n', (logTime + '').green);
          console.log('Received a message from my self'.bgRed);
          if (botChatted[event.threadID]) {
            console.log('Skip this message because it have just send by bot'.bgRed);
            delete (botChatted[event.threadID]);
            return;
          }

          destroyAnswerTimerAndRemoveLock(event.threadID);
          // we lock auto answer for a short time cause we don't need bot involve after your friend chated
          lockAutoAnswer(event.threadID, answerLockTimeShort);
          return;
        }

        if (answerLocker[event.threadID]) {
          console.log('\n', (logTime + '').green);
          console.log('This thread is being locked auto answer: '.red, event.threadI);
          return;
        }
        console.log('\n', logTime);
        console.log(`Received a message: `.green, event);
        console.log('message threadTimeOutMap'.bgBlue, threadTimeOutMap);
        sendMessageDebounce(api, event.threadID);
        break;
      }
      case 'typ': {// Can not handle my typing event
        console.log('\n', (logTime + '').green);
        console.log(`someone is  typing: `.green, event);
        console.log('typ threadTimeOutMap'.bgBlue, threadTimeOutMap);
        if (event.isTyping && threadTimeOutMap[event.from]) {
          console.log('clear timer to waiting typing end'.red);
          clearTimeout(threadTimeOutMap[event.from]);
        }
        else {
          if (!event.isTyping && threadTimeOutMap[event.from]) {
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
  const logTime = moment(Date.now() + 25200000).format('dddd HH:mm:ss | MMMM Do YYYY');
  console.log('\n', logTime, '| sendMessageDebounce'.green);
  if (threadTimeOutMap[threadID]) {
    console.log('removing old timer for thread '.yellow, threadID);
    removeAnswerTimer(threadID);
  }

  answerTimer = setTimeout(() => {
    fbAPI.sendMessage(answerSentence, threadID);
    console.log('RemoveAnswerTimer because bot has sent a message'.yellow);
    removeAnswerTimer(threadID);

    // After bot answer back Prevent answer for 4 hour(ANSWER LOCK)
    lockAutoAnswer(threadID, answerLockTime);

    botChatted[threadID] = true;

  }, answerDelayTime)

  threadTimeOutMap[threadID] = answerTimer
}

// update or create new auto answer lock
function lockAutoAnswer(threadID, time) {
  // set answerLocker[threadID] to truthy and remove it after a period of time
  console.log('Locked answer for thread '.yellow, threadID);
  clearTimeout(answerLocker[threadID]);
  answerLocker[threadID] = setTimeout(() => {
    const logTime = moment(Date.now() + 25200000).format('dddd HH:mm:ss | MMMM Do YYYY');
    console.log('\n', logTime);
    console.log('Unlocked answer for thread '.yellow, threadID);
    delete (answerLocker[threadID]);
  }, time);
}

//If I answer back or seen => destroy “ANSWER TIMER” (don’t need bot answer anymore) and remove “ANSWER LOCK” for that thread (the bot can be listen and answer back if user not answer in time)
function destroyAnswerTimerAndRemoveLock(threadID) {
  removeAnswerTimer(threadID);
  removeAnswerLock(threadID);

}

function removeAnswerTimer(threadID) {
  if (!threadTimeOutMap[threadID]) return;
  console.log('Remove Answer Timer for thread '.yellow, threadID);
  clearTimeout(threadTimeOutMap[threadID]);
  delete threadTimeOutMap[threadID];
}
function removeAnswerLock(threadID) {
  if (!answerLocker[threadID]) return;
  console.log('Remove Answer Lock for thread '.yellow, threadID);
  clearTimeout(answerLocker[threadID]);
  delete answerLocker[threadID];
}

function getMyIDFromCookie(cookiePath = './appstate.json') {
  const cookieValues = require(cookiePath);

  c_user = cookieValues.find((element) => {
    return element.key === 'c_user';
  })

  return c_user && c_user.value;
}