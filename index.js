var https = require('https'),
    url = require('url'),
    _ = require('underscore'),
    Steppy = require('twostep').Steppy;

function curl(options, callback)
{
    Steppy(
        function()
        {
            if(options.url)
                options = _(options).extend(url.parse(options.url));
            
            var req = https.request(options, _(this.slot()).partial(null));
            
            req.end(options.data || '');
            this.pass(req);
        },
        function(err, res, req)
        {
            this.pass(req, res);

            fetchPipe(res, this.slot());
        },
        function(err, req, res, data)
        {
            callback(null, {
                data: data,
                req: req,
                res: res
            });
        },
        callback
    );
}

function fetchPipe(pipe, callback)
{
    var res = '';

    pipe.on('data', function (data) {
        res += data;
    }).on('end', function () {
        callback(null, res);
    }).on('error', function (error) {
        callback(error);
    });
}

module.exports = curl;


function PersistentAgent()
{
    var cookies = {};

    return function(options, callback)
    {
        Steppy(
            function() {
                options.headers = _({'Cookie': renderCookies(cookies)}).extend(options.headers);
                curl(options, this.slot());
            },
            function(err, options) {
                extendCookies(cookies, options.res.headers['set-cookie']);
                callback(null, options);
            },
            callback
        );
    };

    function extendCookies(oldCookies, setCookies)
    {
        (setCookies || []).map(function(setcookie) {
            var cook = setcookie.split(';')[0].split('=');

            oldCookies[cook[0]] = cook[1];

			console.log('Cookie ' + cook[0] + ' set to ' + cook[1]);

            if(cook[1] === 'DELETED')
                delete oldCookies[cook[0]];
        });
    }

    function renderCookies(cookies) {
        return require('underscore')(cookies).keys().map(function(key) {
            return key + '=' + cookies[key];
        }).join('; ');
    }
}

module.exports.PersistentAgent = PersistentAgent;
