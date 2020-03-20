/* eslint-disable camelcase */
/* eslint-disable no-use-before-define */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const MIMEText = require('mimetext');
const util = require('util');
const {
    google,
} = require('googleapis');
const {
    FILTER,
    INBOX_PATH,
    ARCHIVE_PATH,
    TOKEN_PATH,
    CREDENTIALS_PATH,
    SCOPES,
    MY_EMAIL,
    localTimeOptions,
    CHECK_INTERVAL,
} = require('./config');

const inboxPath = path.resolve(INBOX_PATH);
const archivePath = path.resolve(ARCHIVE_PATH);

const readFile = util.promisify(fs.readFile);
const rename = util.promisify(fs.rename);

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

        checkNewSMSAndSend(gmail);
        // start the main loop
        setInterval(() => {
            checkNewSMSAndSend(gmail);
        }, CHECK_INTERVAL);

    });
})


function authorize(credentials, callback) {
    const {
        client_secret,
        client_id,
        redirect_uris,
    } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0],
    );

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

async function checkNewSMSAndSend(gmail) {
    fs.readdir(inboxPath, async function (err, inbox) {
        if (err) return console.log(err);
        else if (inbox.length === 0) console.log(`No new SMS, ${new Date(Date.now()).toLocaleDateString('en-US', localTimeOptions)}`)
        else {
            let messages = [];
            let isAD = false;
            for (var i = 0; i < inbox.length; i++) {
                let fn = inbox[i];
                await readFile(path.resolve(inboxPath, fn), 'utf8', )
                    .then((data, err) => {
                        if (err) throw err;
                        if (FILTER.test(data)) isAD = true;
                        messages.push({
                            filename: fn,
                            data: data
                        })
                        return isAD;
                    }).catch(console.log.bind(console));
            }

            for (let fn of inbox) {
                let targetPath = path.resolve(archivePath, isAD ? "../ad/" : '', fn);
                // move sms sent to archive
                await rename(path.resolve(inboxPath, fn), targetPath).then(() => {
                    if (err) throw err;
                    console.log(`Archived ${targetPath}`);
                }).catch(console.log.bind(console));

            }

            if (isAD) {
                console.log("AD, aborted");
                return
            }
            console.log(messages);
            const emailEncoded = createMessageBody(messages)
            sendMessageToMe(emailEncoded, gmail);
        }
    });
}

function createMessageBody(messages) {
    const one = messages.length > 1 ? false : true;
    const message = new MIMEText()
    let content = '';
    let subject = '';
    messages.map((file) => {
        let name = file.filename.replace(/\D/g, '')
        let t = new Date(
            name.substring(0, 4),
            name.substring(4, 6) - 1,
            name.substring(6, 8),
            name.substring(8, 10),
            name.substring(10, 12),
            name.substring(12, 14))
        t = t.toLocaleDateString('en-US', localTimeOptions);
        let sender = name.substring(16, name.length - 2);
        subject = one ? `${t}, from ${sender}` : `${t}, ${messages.length} messages`;
        content = one ? file.data : content + `\n \n${t}, from ${sender} \n ${file.data}`
    })

    message.setSender(MY_EMAIL)
    message.setRecipient(MY_EMAIL)
    message.setSubject(subject)
    message.setMessage(content)
    console.log(subject)
    console.log(content)
    return message.asEncoded()
}