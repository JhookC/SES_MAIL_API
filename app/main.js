/*
--------------------------------------------Dependencies--------------------------------------------
*/
const express     = require('express');
const bodyParser  = require('body-parser');
const config      = require('./config/config');
const cors        = require('cors');
const winston     = require('winston');
const winston_ts  = require('winston-daily-rotate-file');
var fs            = require('fs');
var buf = new Buffer(1024);

var templates = [];

/*
---------------------------------------------Constants----------------------------------------------
*/
const   env     = process.env.NODE_ENV || config.environment;
const   port    = process.env.PORT || config.serverPort;
const   logDir  = config.logPath;

/*
 ---------------------------------------------Templates----------------------------------------------
 */

fs.readdir(__dirname + '/config/templates', function(err, files){
    if (err) {
        return console.error(err);
    }
    files.forEach( function (file){
        fs.open(__dirname + '/config/templates/' + file, 'r+', function(error, fd){
            if (error) {
                return error;
            }
            console.log('Template ' + file + ' load successfully');
            fs.read(fd, buf, 0, buf.length, 0, function(errr, bytes){
                if (errr){
                    console.log(errr);
                }
                console.log(bytes + " bytes read");

                // Print only read bytes to avoid junk.
                if(bytes > 0){
                    var template = null;
                    template = {
                        fileName: file,
                        content: buf.slice(0, bytes).toString()
                    };

                    templates.push(template);
                }
            });
        });
    });
});

exports.templates = templates;

/*
 ---------------------------------------------Logging----------------------------------------------
 */

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const tsFormat = function () {
    return new Date().toLocaleTimeString();
};

const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: tsFormat,
            colorize: true,
            level: 'info'
        }),
        new (winston_ts)({
            filename: logDir + '/trace.log',
            datePattern: '.yyyy-MM-dd',
            localTime: true,
            timestamp: tsFormat,
            level: env === 'development' ? 'debug' : 'info'
        })
    ]
});

exports.logger = logger;

/*
-----------------------------------------------Setup------------------------------------------------
*/
const app = express();
const server = require('http').Server(app);

app.use(bodyParser.urlencoded({ extended: true, limit: config.transactionLimit }));
app.use(bodyParser.json({limit: config.transactionLimit}));

/*
 __________________________________Prefixes___________________________________
 */
app.use('/api', require('./routes/api'));
app.use('/api/mail', require('./routes/mail'));

/*
-------------------------------------------Start Server--------------------------------------------
*/
server.listen(port, function(){
    logger.info({component: 'Server', status: 'Running ', port: port});
});