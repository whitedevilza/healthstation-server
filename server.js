var express  = require('express');
var app      = express();
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var cors = require('cors');
var configs = require('./configs');

var databaseConfig = require('./configs');
var router = require('./app/routes');
var logging = require('./app/utils/logging');

var logger = logging.get_logger("default");

// Database
mongoose.Promise = global.Promise;
mongoose.connect(databaseConfig.database_url);

// Request body parser
app.use(bodyParser.urlencoded({ extended: false })); // Parses urlencoded bodies
app.use(bodyParser.json()); // Send JSON responses

app.use(express.static('uploads'))

// CORS
app.use(cors());
// Route
router(app);

// Global unhandle exception
process.on('uncaughtException', function (err) {
    logger.error(`Caught unhandled exception: ${err.message}`);
});

// Start app
app.listen( configs.PORT || 8080);
