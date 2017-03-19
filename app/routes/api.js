/*
--------------------------------------------Dependencies--------------------------------------------
*/
const express     = require('express');
const router      = express.Router();
const config      = require('../config/config');

/*
-----------------------------------------------Setup------------------------------------------------
*/
const app = express();
const svr = require('../main');

/*
 ---------------------------------------------Logging----------------------------------------------
 */

var buildLog = function (id, req, res, err, data) {
    var statusCode = res.statusCode;
    var messageCode = 'OK';
    var resData = 'N/A';

    if (err) {
        statusCode = err.status;
        messageCode = err.message;
        resData =  data;
    }

    return {
        idTransaccion: id,
        req: {
            ip: req.connection.remoteAddress,
            protocol: req.protocol,
            method: req.method,
            endpoint: req.originalUrl
        },
        res: {
            status: statusCode,
            message: messageCode,
            data_in: JSON.stringify(resData)
        },
        message: 'Trace'
    };
};

/*
-----------------------------------------------Routes-----------------------------------------------
*/

//Status route
router.get('/status', function(req, res) {
  res.json({ message: 'Mail service running...'});
    svr.logger.info(buildLog(null , req, res));
});


/*
-------------------------------------------Return router--------------------------------------------
*/
module.exports = router;
module.exports.bl = buildLog;