'use strict';

var urlParser = require('url');
var async = require('async');
var request = require('request');
var _ = require('lodash');

/**
 * Express middleware to process batch HTTP requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {undefined}
 */
function expressBatchRequests(req, res) {

    // grab the instance of the express app
    var app = req.app;

    // resolve protocol, host and port (could be set via proxy so check them first)
    var protocol = (req.headers['x-forwarded-proto'] || '').split(',')[0] || req.protocol || 'http';
    var host = (req.headers['x-forwarded-host'] || '').split(',')[0] || req.headers.host.replace(/:[0-9]+/, '');
    var port = (req.headers['x-forwarded-port'] || '').split(',')[0] || (req.headers.host.match(/:([0-9]+)/) || [])[1] || '';

    // clear port number if using defaults
    port = (protocol === 'https' && port === '443') ? '' : port;
    port = (protocol === 'http' && port === '80') ? '' : port;

    // add port number if present
    host += ((port !== '') ? ':' + port : '');

    var baseUrl = protocol + '://' + host;
    var requests = req.body.batch || [];
    var includeRequestsInResponse = (req.body.includeRequestsInResponse === true);
    var execMethod = (req.body.executeInSeries === true) ? 'mapSeries' : 'map';

    // get list of header to merge from original request if present
    var mergeHeaders = (req.body.mergeHeaders || ',').toString().toLowerCase().split(',').filter(Boolean).map(function(item) {
        return item.trim();
    });

    // execute requests in series if set, otherwise parallel
    async[execMethod](requests, function (item, callback) {

        var internalUrl = urlParser.parse(item.url).path;

        // build req params
        var reqParams = {
            method: (typeof item.method !== 'undefined') ? item.method : 'GET'
        };

        if (item.headers) reqParams.headers = item.headers;
        if (item.body) reqParams.body = item.body;

        if (typeof item.body === 'object') {
            reqParams.json = true;
        }

        if (mergeHeaders.length > 0) {
            reqParams.headers = Object.assign({}, _.pick(req.headers, mergeHeaders), reqParams.headers);

            // modify original incase user wants to return requests with response
            item.headers = reqParams.headers;
        }

        executeInternalRoute(app, internalUrl, reqParams, function(resStatusCode, body, resHeaders) {

            // build the response to this request
            var resBody = {
                response: {
                    code: resStatusCode
                }
            };

            if (resHeaders) resBody.headers = resHeaders;

            if (body) {
                if (resHeaders['Content-Type'] === 'application/json') {
                    resBody.body = JSON.parse(body || '{}');
                }
                else {
                    resBody.body = body;
                }
            }

            // if required, return the original request info
            if (includeRequestsInResponse) {
                resBody.request = item;
            }

            // resolve with response
            callback(null, resBody);
        });

    }, function (err, responses) {
        if (err) {
            return res.send(500);
        }

        res.status(200).json(responses);
    });
}

module.exports = expressBatchRequests;

/**
 * Executes an express route internally
 * @param {function} app - instance of express app
 * @param {string} path - internal URL to execute
 * @param {object} options - key/value request objects
 * @param {function} callback - function to execute once request completes
 * @return {void}
 */
function executeInternalRoute(app, path, options, callback) {

    if (!app || typeof app !== 'function') throw new Error('Invalid express app');
    if (!path || path === '') throw new Error('Invalid path');

    // ensure the callback is only executed once
    if (callback) callback = _.once(callback);

    options = options || {};
    options.url = path;

    var newReq = createRequest(path, options);
    var newRes = createResponse(callback);

    app(newReq, newRes);
};

/**
 * Creates a fake express request object
 * @param {string} path - url path to execute
 * @param {object} options - key/value request params to send
 * @returns {Object} newly created request object
 */
function createRequest(path, options) {

    if (!options) options = {};

    var defaultOpts = {
        method: "GET",
        host: "",
        cookies: {},
        query: {},
        url: path,
        headers: {},
    };

    var req = _.extend(defaultOpts, options);

    req.method = req.method.toUpperCase();

    return req;
}

/**
 * Creates a fake express response object
 * @param {function} callback - function to execute when complete
 * @returns {object} newly created express response object
 */
function createResponse(callback) {
    var res = {
        _removedHeader: {},
    };

    var headers = {};
    var code = 200;
    res.set = res.header = function(x, y) {
        if (arguments.length === 2) {
            res.setHeader(x, y);
        }
        else {
            for (var key in x) {
                res.setHeader(key, x[key]);
            }
        }
        return res;
    }

    res.setHeader = function(x, y) {
        headers[x] = y;
        return res;
    };

    res.redirect = function(_code, url) {
        if (!_.isNumber(_code)) {
            code = 301;
            url = _code;
        }
        else {
            code = _code;
        }
        res.setHeader("Location", url);
        res.end();
    };

    res.status = function(number) {
        code = number;
        return res;
    };

    res.end = res.send = res.write = function(data) {
        if (callback) callback(code, data, headers);
    };

    return res;
}