var express = require('express');
var router = express.Router();
const colors = require('colors');

/* GET users listing. */
router.get('/', function(req, res, next) {
  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = 'secretCat'
    
  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
  
  console.log(colors.green('Req.query: '), req.query);
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
  
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED'.bgCyan);
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});
router.post('/', function(req, res, next) {
  console.log('An event received: '.green, req.body);
  res.status(200).send();
});

module.exports = router;
