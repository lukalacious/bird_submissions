const path = require('path');

module.exports = {
  birdDatabasePath: process.env.BIRD_DATABASE_PATH ||
    path.join(__dirname, '../../../Bird Species Database.xlsx')
};
