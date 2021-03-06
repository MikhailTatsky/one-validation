/*global require*/

var fs = require('fs'),
    path = require('path'),
    punycode = require('punycode');

(function () {
    'use strict';

    var http = require('http'),
        options = {
            host: 'data.iana.org',
            path: '/TLD/tlds-alpha-by-domain.txt',
            method: 'GET'
        },
        tldText = '';

    http.get(options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            tldText += chunk;
        });
        res.on('end', function () {
            var tlds = tldText.trim().split('\n'),
                buckets = {};

            tlds.shift();

            for (var i = 0; i < tlds.length; i++) {
                var first = tlds[i].substring(0, 1),
                    rest = tlds[i].substring(1);

                if (!buckets[first]) {
                    buckets[first] = [];
                }

                buckets[first].push(rest);
            }

            var regexes = [];
            for (var prop in buckets) {
                var chars = [],
                    strings = [],
                    puny = [],
                    idn = [],
                    arr = buckets[prop];

                for (var j = 0; j < arr.length; j++) {
                    if (prop === 'X' && arr[j].substring(0,3) === 'N--') {
                        puny.push(arr[j].substring(3));
                        idn.push(punycode.decode(arr[j].substring(3)));
                    } else if (arr[j].length === 1) {
                        chars.push(arr[j]);
                    } else {
                        strings.push(prop + arr[j]);
                    }
                }

                var results = [];
                if (chars.length)   { results.push(prop + (chars.length > 1 ? '[' + chars.join('') + ']' : chars[0])); }
                if (strings.length) { Array.prototype.push.apply(results, strings); }
                if (puny.length)    { results.push('XN--(?:' + puny.join('|') + ')'); }
                if (idn.length)     { Array.prototype.push.apply(results, idn); }

                Array.prototype.push.apply(regexes, results);
            }

            var regexString = '(?:' + regexes.sort(function (a, b) {
                return (b.replace(/\[[^\]]*\]/g, 'a').length - a.replace(/\[[^\]]*\]/g, 'a').length) || (b < a ? -1 : (b === a ? 0 : 1));
            }).join('|').toLowerCase() + ')';

            var validationJsContents = fs.readFileSync(path.resolve(__dirname, 'validation.js.tpl'), 'utf-8');
            validationJsContents = validationJsContents.replace('"__TLD_REGEX__"', '/' + regexString + '/i');
            console.log("// THIS FILE IS AUTOGENERATED! See lib/validation.js.tpl");
            console.log(validationJsContents);
        });
    });
}());

