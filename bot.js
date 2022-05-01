const Megalodon = require('megalodon');
const Config = require('./config');
const Fs = require('fs');
const Https = require('https');

let db = {};
try {
    const dbText = Fs.readFileSync('./db.json', 'utf8');
    db = JSON.parse(dbText);
} catch (e) {}

const flushDb = (cb) => {
    const dbS = JSON.stringify(db);
    const NOFUN = () => {};
    Fs.writeFile('./db.json', dbS, cb || NOFUN);
};

const init = () => {
    const client = new Megalodon.Pleroma(Config.server);
    const lastArg = process.argv.pop();
    if (lastArg === 'init') {
        client.registerApp('independent-fact-checkers', {}).then(appData => {
            db.clientId = appData.clientId;
            db.clientSecret = appData.clientSecret;
            console.log('Make the autorizationer linkey');
            console.log(appData.url);
            flushDb();
        });
    } else {
        client.fetchAccessToken(db.clientId, db.clientSecret, lastArg).then((tokenData) => {
            db.accessToken = tokenData.accessToken;
            db.refreshToken = tokenData.refreshToken;
            console.log('Got teh terkin');
            flushDb();
        }).catch((err) => console.error(err));
    }
};

const stripHtml = (txt) => txt.replace(/<[^>]*>/g, '');

const unfuckHtml = (txt) => {
    txt = txt.replace(/&amp;/g, '&');
    txt = txt.replace(/&quot;/g, '"');
    txt = txt.replace(/&#([0-9]+);/g, (_, x) => String.fromCharCode(Number(x)));
    return txt;
};

const postProcessText = (txt) => {
    txt = txt.replace(/\r/g, '');
    txt = unfuckHtml(txt);
    txt = txt.replace(/"/g, ' ');
    txt = txt.replace(/https:\/\/[^ ]* /, ' ');
    txt = txt.replace(/ +/g, ' ');
    const i = Math.max(txt.lastIndexOf('!'), txt.lastIndexOf('.'), txt.lastIndexOf('?'));
    if (i > -1) {
        txt = txt.slice(0, i + 1);
    }
    const i2 = txt.indexOf('<|endoftext|>');
    if (i2 > -1) {
        txt = txt.slice(0, i2);
    }
    return 'Independent fact checkers say: ' + txt.trim();
};

const requestAI = (txt, cb) => {
    const req = Https.request({
        method: 'POST',
        host: 'api.goose.ai',
        path: '/v1/engines/gpt-neo-20b/completions',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + Config.gooseAiToken,
        }
    }, (resp) => {
        const data = [];
        resp.on('data', (d) => data.push(d));
        resp.on('end', () => {
            const obj = JSON.parse(data.join(''));
            cb(obj);
        });
    });
    req.end(JSON.stringify({
        prompt: txt,
        max_tokens: 70,
    }));
};

const processNotif = (notification) => {
    if (typeof(notification.status) !== 'object') { return; }
    if (typeof(notification.status.content) !== 'string') { return; }
    // console.log(notification);
    // if (typeof(notification.status.mentions) !== 'undefined') {
    //     for (const m of notification.status.mentions) {
    //         console.log(m);
    //     }
    // }
    const txt = unfuckHtml(stripHtml(notification.status.content));
    console.log(txt);
    if (!txt.startsWith('@IndependentFactCheckers ')) {
        console.log('I am not mentioned\n');
    } else if (txt.lastIndexOf('@') !== 0) {
        console.log('Others are mentioned\n');
    } else {
        let lTxt = txt.toLowerCase();
        for (const bw of Config.badWords) {
            if (lTxt.indexOf(bw) > -1) {
                return;
            }
        }
        const txt1 = txt.replace('@IndependentFactCheckers ', '');
        console.log('< ' + txt1);
        requestAI(txt1 + '\n\nIndependent Fact Checkers Say:', (resp) => {
            //console.log(resp);
            const accts = [];
            if (typeof(notification.status.mentions) !== 'undefined') {
                for (const m of notification.status.mentions) {
                    //console.log(m);
                    accts.push('@' + m.acct);
                }
            }
            const respText = accts.join(' ') + ' ' + postProcessText(resp.choices[0].text);
            console.log('> ' + respText);
            console.log();
            const client = new Megalodon.Pleroma(Config.server, db.accessToken);
            client.postStatus(respText, {
                in_reply_to_id: notification.status.id,
                mentions: notification.status.mentions,
            });
        });
        //console.log(txt + '\n\nIndependent Fact Checkers Say:');
    }
};

const main = () => {
    const wsClient = new Megalodon.Pleroma(Config.server.replace('https', 'wss'), db.accessToken);
    const stream = wsClient.userSocket();
    let lastHb = +new Date();
    setInterval(() => {
        if (((+new Date()) - lastHb) > 120000) {
            //console.log("No heartbeat, lost connection");
//            process.exit(100);
        }
    }, 1000);
    stream.on('connect', () => {
        console.log('connect');
    });
    stream.on('notification', (notification) => {
        processNotif(notification);
        //console.log(notification);
    });
    stream.on('close', () => {
        console.log('socket closed');
        process.exit(100);
    });
    stream.on('heartbeat', () => {
        console.log('thump.');
        lastHb = +new Date();
    });
};

if (process.argv.indexOf('init') > -1) {
    init();
} else {
    main();
}