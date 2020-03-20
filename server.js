const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const path = require('path');
const scanner = require('./index');
const bodyParser = require('body-parser');

app.use(express.static('./'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => res.sendFile(path.join(__dirname + '/index.html')));

app.get('/scan', async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });

    const log = msg => {
        res.write(msg + '</br>')
    };

    log('starting scan...');

    await scanner(req.query.url, req.query.username, req.query.password, log);

    log('scan complete - you can close this window and refresh the other');
    res.end();
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
