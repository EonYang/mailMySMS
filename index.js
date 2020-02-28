const fs = require('fs');
const path = require('path');
const readline = require('readline');
const waitSync = require('wait-sync');
const MIMEText = require('mimetext')
const config = require('./config');
const {
    google
} = require('googleapis');
const {
    TOKEN_PATH,
    CREDENTIALS_PATH,
    SCOPES,
    myEmail,
    localTimeOptions,
    checkInterval
} = config

let inboxPath = path.resolve(config.inboxPath);
let archivePath = path.resolve(config.archivePath);

let gmail;

fs.readFile(CREDENTIALS_PATH, (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Gmail API.
    authorize(JSON.parse(content), (oAuth2Client) => {
        // create Gmail object
        gmail = google.gmail({
            version: 'v1',
            auth: oAuth2Client
        })

        // start the main loop
        setInterval(() => {
            checkNewSMSAndSend(gmail);
        }, checkInterval);

    });
})


function authorize(credentials, callback) {
    const {
        client_secret,
        client_id,
        redirect_uris
    } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

function sendMessageToMe(base64EncodedEmail, gmail) {
    gmail.users.messages.send({
            'userId': 'me',
            'resource': {
                'raw': base64EncodedEmail
            }
        }).then(function (result) {
            console.log(result)
        })
        .catch(function (err) {
            console.log(err)
        })
}

function checkNewSMSAndSend(gmail) {
    fs.readdir(inboxPath, function (err, inbox) {
        if (err) return console.log(err);
        if (inbox.length == 0) console.log(`No new SMS, ${new Date(Date.now()).toLocaleDateString('en-US', localTimeOptions)}`)
        else {
            for (var i = 0; i < inbox.length; i++) {
                let fn = inbox[i];
                fs.readFile(path.resolve(inboxPath, fn), 'utf8', (err, data) => {
                    if (err) return console.log(err)
                    sendMessageToMe(createMessageBody(fn, data), gmail);
                    // move sms sent to archive
                    fs.rename(path.resolve(inboxPath, fn), path.resolve(archivePath, fn), (err) => {
                        if (err) throw err;
                        console.log(`Archived ${fn}`);
                    })
                    waitSync(3)
                })
            }
        }
    });
}

function createMessageBody(filename, content) {
    // compose the email subject, using sender and timestamp
    let name = filename.replace(/\D/g, '')
    let t = new Date(
        name.substring(0, 4),
        name.substring(4, 6) - 1,
        name.substring(6, 8),
        name.substring(8, 10),
        name.substring(10, 12),
        name.substring(12, 14))
    t = t.toLocaleDateString('en-US', localTimeOptions);
    let sender = name.substring(16, name.length - 2);
    let subject = `${t}, from ${sender}`;
    // construct the encoded email body
    const message = new MIMEText()
    message.setSender(myEmail)
    message.setRecipient(myEmail)
    message.setSubject(subject)
    message.setMessage(content)
    return message.asEncoded()
}