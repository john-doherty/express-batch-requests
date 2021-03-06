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

        // map urls to this server (avoids endpoint being used as a proxy to attack other servers)
        var url = urlParser.resolve(baseUrl, urlParser.parse(item.url).path);

        // build req params
        var reqParams = {
            url: url,
            method: (typeof item.method !== 'undefined') ? item.method : 'GET',
            headers: item.headers
        };

        if (mergeHeaders.length > 0) {
            reqParams.headers = Object.assign({}, _.pick(req.headers, mergeHeaders), reqParams.headers);

            // modify original incase user wants to return requests with response
            item.headers = reqParams.headers;
        }

        if (typeof item.body === 'object') {
            reqParams.body = item.body;
            reqParams.json = true;
        }
        else {
            reqParams.body = item.body
        }

        // execute request
        request(reqParams, function (err, result, body) {

            // build the response to this request
            var resBody = {
                response: {
                    code: result.statusCode,
                    headers: result.headers,
                    body: body
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