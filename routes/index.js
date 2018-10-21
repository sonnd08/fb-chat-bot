const fbWebhookRouter = require('./fbWebhookRouter')

function route(app){
  app.get('/', (req, res, next) =>{
    res.send("Server is running fine!")
  })

  app.use('/v1/api/webhook', fbWebhookRouter)
}

module.exports = route;
