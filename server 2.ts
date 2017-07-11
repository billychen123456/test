const secret = "c3fd7501c81675fee9f83b817ed2e73f"; // 您的 Channel Secret
const id = "1516369885"; // 您的 Channel ID
const mid = "Ude1f633015c75a4dd9d32eabae1baa8b"; // 您的 MID 
const weather_key = "16b8c42d665cb0410dab109736c1c20d"; // openweathermap API key

var http = require('http');
var bodyParser = require('body-parser');
var express = require('express');
var request = require('request');

var port = process.env.port || 1337
var app = express();
app.use(bodyParser.json());

// 接聽來自Line伺服器中的訊息，交由Function receiver處理
app.post('/callback', function (req, res) {
    receiver(req, res);
});

// 開啟伺服器
http.createServer(app).listen(port);

function getSign(event) {
    var crypto = require('crypto');
    var body = new Buffer(JSON.stringify(event.body), 'utf8');
    // secret 為您的 Channel secret     
    var hash = crypto.createHmac('sha256', secret).update(body).digest('base64');
    return hash
}
function receiver(req, res) {
    var data = req.body;
    if (getSign(req) == req.get("X-LINE-ChannelSignature")) {
        // ChannelSignature 正確，處理訊息
        data.result.forEach(function (result) {
            var type = result.content.contentType;
            if (type == "1") {
                sendTextMessage(result.content.from, "傳送您的位置來獲得天氣訊息");
            }
            else if (type == "8") {
                // 傳送一張隨機貼圖
                sendSticker(result.content.from, 4, getRandom(260, 289));
            }
            else if (type == "7")//location
            {
                // 傳送天氣訊息
                sendWeather(result.content.from, result.content.location.latitude, result.content.location.longitude)
            }

        });
        res.sendStatus(200);
    }
    else
        res.sendStatus(403); //ChannelSignature錯誤，回傳403

}
function sendWeather(recipientId, lat, lng) {
    // 查詢天氣，設定語言為繁體中文，溫度單位為攝氏溫度
    request({
        uri: 'http://api.openweathermap.org/data/2.5/weather',
        qs: {
            appid: weather_key,
            lat: lat,
            lon: lng,
            lang: "zh_tw",
            units: "metric"
        },
        method: 'GET',
    },

        function (error, response, body) {
            //Check for error
            if (error) {
                return console.log('Error:', error);
            }

            //Check for right status code
            if (response.statusCode !== 200) {
                return console.log('Invalid Status Code Returned:', response.statusCode, response.statusMessage);
            }
            var data = JSON.parse(body);
            // 傳送 城市名稱 天氣狀況 溫度
            sendTextMessage(recipientId, data.name + " " + data.weather[0].description + " 溫度:" + data.main.temp)
            // 傳送和天氣有關的貼圖
            var icon = data.weather[0].icon[0] + data.weather[0].icon[1];
            if (icon == "01" || icon == "02") //晴天
                sendSticker(recipientId, 4, 263);
            else if (icon == "03" || icon == "04") //多雲
                sendSticker(recipientId, 4, 264);
            else //雨天
                sendSticker(recipientId, 4, 266);

        }


    );
}
function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function sendSticker(recipientId, s_pack, s_id) {
    var messageData = {
        to: [recipientId],
        toChannel: 1383378250,
        eventType: "138311608800106203",
        content: {
            contentType: 8,
            toType: 1,
            contentMetadata: {
                STKID: s_id + '',
                STKPKGID: s_pack + ''
            }
        }
    };

    toLine(messageData);
}
function sendTextMessage(recipientId, messageText) {
    var messageData = {
        to: [recipientId],
        toChannel: 1383378250,
        eventType: "138311608800106203",
        content: {
            contentType: 1,
            toType: 1,
            text: messageText
        }
    };
    toLine(messageData);
}
function toLine(messageData) {
    request({
        uri: 'https://trialbot-api.line.me/v1/events',
        headers: {
            "Content-type": "application/json; charser=UTF-8",
            "X-Line-ChannelID": id,
            "X-Line-ChannelSecret": secret,
            "X-Line-Trusted-User-With-ACL": mid
        },
        method: 'POST',
        json: messageData
    },
        function (error, response, body) {
            //Check for error
            if (error) {
                return console.log('Error:', error);
            }

            //Check for right status code
            if (response.statusCode !== 200) {
                return console.log('Invalid Status Code Returned:', response.statusCode, response.statusMessage);
            }

            //All is good. Print the body
            console.log(body); // Show the HTML for the Modulus homepage.

        }


    );
}
