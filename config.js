module.exports = {
    localTimeOptions: {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    },
    inboxPath: "exampleSMS/inbox/",
    archivePath: "exampleSMS/archive/",
    // inboxPath: "/home/pi/sms/inbox/",
    // archivePath: "/home/pi/sms/archive/",
    myEmail: 'yangthere@gmail.com',
    TOKEN_PATH :'token.json',
    CREDENTIALS_PATH: 'credentials.json',
    SCOPES:'https://www.googleapis.com/auth/gmail.send',
    checkInterval: 10000
    

}