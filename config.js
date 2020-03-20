module.exports = {
    localTimeOptions: {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    },
    // INBOX_PATH: 'exampleSMS/inbox/',
    // ARCHIVE_PATH: 'exampleSMS/archive/',
    INBOX_PATH: "/home/pi/sms/inbox/",
    ARCHIVE_PATH: "/home/pi/sms/archive/",
    MY_EMAIL: 'yangthere@gmail.com',
    TOKEN_PATH: 'token.json',
    CREDENTIALS_PATH: 'credentials.json',
    SCOPES: 'https://www.googleapis.com/auth/gmail.send',
    CHECK_INTERVAL: 10000,
    FILTER: /退订/,
}