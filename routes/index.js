const fbChatAPI = require('./fbChatAPI')

function route(app){
  app.get('/', (req, res, next) =>{
    res.status(200).send('Server is running fined');
  });

  app.use('/v1/api', fbChatAPI)

}

module.exports = route;
