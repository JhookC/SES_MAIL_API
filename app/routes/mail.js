/*
 --------------------------------------------Dependencies--------------------------------------------
 */
var shortid = require('shortid');
var express = require('express');
var router  = express.Router();
var aws     = require('aws-sdk');
var svr     = require('../main');
var api     = require('./api');
var mailConfig = require('../config/aws-mail');


// Load AWS credentials and try to instantiate the object.
aws.config.loadFromPath(__dirname + '/../config/aws-config.json');

// Instantiate SES.
var ses = new aws.SES();

/*
 ----------------------------------------------Routes-----------------------------------------------
 */


// Verify email addresses.
router.get('/verify/:email', function (req, res) {
    var params = {
        EmailAddress: req.params.email
    };

    ses.verifyEmailAddress(params, function(err, data) {
        if(err) {
            res.send(err);
        }

        res.send(data);
    });
});

// List the verified email addresses.
router.get('/list', function (req, res) {
    ses.listVerifiedEmailAddresses(function(err, data) {
        if(err) {
            res.send(err);
        }
        else {
            res.send(data);
        }
    });
});

// Delete verified email addresses.
router.get('/delete/:email', function (req, res) {
    var params = {
        EmailAddress: req.params.email
    };

    ses.deleteVerifiedEmailAddress(params, function(err, data) {
        if(err) {
            res.send(err);
        }
        else {
            res.send(data);
        }
    });
});

// Sending RAW email including an attachment.
router.post('/send', function (req, res) {
    var transactionID = shortid.generate();
    if (req.body.toMail && req.body.typeMail) {
        var toMail =req.body.toMail;
        var typeMail = req.body.typeMail;
        var subject = null;
        var body = null;
        var bodyTemplate = null;

        for (var i = 0; i < mailConfig.subjects.length; i++){
            if (mailConfig.subjects[i].type == typeMail){
                subject = mailConfig.subjects[i].title;
                bodyTemplate = mailConfig.subjects[i].template;
                svr.logger.info({transactionID: transactionID, step: 'Template loaded', template: typeMail});
            }
        }

        for (var j = 0; j < svr.templates.length; j++) {
            if (svr.templates[j].fileName == bodyTemplate) {
                body = svr.templates[j].content;
                var cont = 0;
                for (var u in req.body){
                    if (u.substring(0, 1) == '{' && u.substring(u.length-1, u.length) == '}'){
                        cont++;
                        body = body.replace(u, req.body[u]);
                        svr.logger.info({transactionID: transactionID, step: 'Template replaced', fields: cont});
                    }
                }
            }
        }

        var ses_mail = "From: '"+ mailConfig.fromTitle +"' <" + mailConfig.fromMail + ">\n";
        ses_mail = ses_mail + "To: " + toMail + "\n";
        ses_mail = ses_mail + "Subject: " + subject + "\n";
        ses_mail = ses_mail + "MIME-Version: 1.0\n";
        ses_mail = ses_mail + "Content-Type: multipart/mixed; boundary=\"NextPart\"\n\n";
        ses_mail = ses_mail + "--NextPart\n";
        ses_mail = ses_mail + "Content-Type: text/html; charset=us-ascii\n\n";
        ses_mail = ses_mail + body + "\n\n";

        if (req.body.attachment == 'true'){
            for (var u in req.body){
                if (u.substring(0, 1) == '-' && u.substring(u.length-1, u.length) == '-'){
                    var nameFile = u.substring(1, u.length-1);
                    console.log(nameFile)
                    ses_mail = ses_mail + "--NextPart\n";
                    ses_mail = ses_mail + "Content-Type: application/pdf;\n";
                    ses_mail = ses_mail + "Content-Disposition: attachment; filename=\"" + nameFile + "\"\n";
                    ses_mail = ses_mail + "Content-Transfer-Encoding: base64\n\n";
                    ses_mail = ses_mail + req.body[u] + "\n\n";
                    ses_mail = ses_mail + "--NextPart\n";
                }
            }
        }else{
            ses_mail = ses_mail + "--NextPart\n";
        }

        var params = {
            RawMessage: { Data: new Buffer(ses_mail) },
            Destinations: [ toMail ],
            Source: "'" + mailConfig.fromTitle + "' <" + mailConfig.fromMail + ">'"
        };

        svr.logger.info({transactionID: transactionID, step: 'Mail composed'});

        ses.sendRawEmail(params, function(err, data) {
            if(err) {
                res.send(err);
                svr.logger.error(api.bl(transactionID, req, res, err));
            }
            res.send(data);
            svr.logger.info(api.bl(transactionID, req, res));
        });
    } else {
        res.json({ error: 'Missing parameters'});
    }
});
 /*
 -------------------------------------------Return router--------------------------------------------
 */
module.exports = router;