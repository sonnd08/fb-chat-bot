
loadConfigFromDotEnv = () => {
  require('dotenv').config();

  if (!process.env.DEFAULT_ANSWER) {
    console.error(`Can't load DEFAULT_ANSWER!~`, process.env.DEFAULT_ANSWER);
    process.exit();
  }
  
  if (!process.env.ANSWER_DELAY_TIME) {
    console.error(`Can't load ANSWER_DELAY_TIME!~`);
    process.exit();
  }
  
  if (!process.env.ANSWER_LOCK_TIME) {
    console.error(`Can't load ANSWER_LOCK_TIME!~`);
    process.exit();
  }
  console.log('Configs loaded!'.green);
}

module.exports = {
  loadConfigFromDotEnv,
}

