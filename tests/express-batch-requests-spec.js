var express = require('express');
var bodyParser = require('body-parser');
var request = require('supertest');
var expressBatchRequests = require('../index.js');
var app = null;

describe('express-batch-requests', function () {

    beforeEach(function () {

        // create an express app
        app = express();

        // add body parser
        app.use(bodyParser.json());

        // mount the batch handler
        app.post('/batch', expressBatchRequests);
    });

    it('should return multiple responses', function (done) {

        var testBatch = {
            "executeInSeries": true,
            "includeRequestsInResponse": true,
            "batch": [
                {
                    "url": "/route1",
                    "method": "GET"
                },
                {
                    "url": "/route2",
                    "method": "POST",
                    "headers": {
                        "User-Agent": "space-command"
                    },
                    "body": {
                        "firstName": "Buzz",
                        "lastName": "Lightyear"
                    }
                }
            ]
        };

        // return a string
        app.get('/route1', function (req, res) {
            res.send("Hello");
        });

        // construct name from JSON object
        app.post('/route2', function (req, res) {
            res.json({
                fullName: req.body.firstName + ' ' + req.body.lastName
            });
        });

        // execute request and test response
        request(app).post('/batch')
            .send(testBatch)
            .expect(200)
            .end(function (err, res) {

                // check we have a response
                expect(res.body).toBeDefined();
                expect(Array.isArray(res.body)).toBe(true);
                expect(res.body.length).toEqual(2);

                expect(res.body[0].request.url).toEqual(testBatch.batch[0].url);
                expect(res.body[0].request.method).toEqual(testBatch.batch[0].method);

                expect(res.body[1].request.url).toEqual(testBatch.batch[1].url);
                expect(res.body[1].request.method).toEqual(testBatch.batch[1].method);

                expect(res.body[0].response.body).toEqual('Hello');

                // var body1 = JSON.parse(res.body[1].response.body);


                expect(res.body[1].response.body.fullName).toEqual('Buzz Lightyear');

                // mark test as complete
                done(err);
            });
    });

    it('response should exclude requests by default', function (done) {

        var testBatch = {
            "executeInSeries": true,
            "batch": [
                {
                    "url": "/route1",
                    "method": "GET"
                },
                {
                    "url": "/route2",
                    "method": "POST",
                    "headers": {
                        "User-Agent": "space-command"
                    },
                    "body": {
                        "firstName": "Buzz",
                        "lastName": "Lightyear"
                    }
                }
            ]
        };

        // create routes to works with
        app.get('/route1', function (req, res) {
            res.send("Hello");
        });

        // echo back the body
        app.post('/route2', function (req, res) {
            res.json({
                fullName: req.body.firstName + ' ' + req.body.lastName
            });
        });

        // execute request and test response
        request(app).post('/batch')
            .send(testBatch)
            .expect(200)
            .end(function (err, res) {

                // check we have a response
                expect(res.body).toBeDefined();
                expect(Array.isArray(res.body)).toBe(true);
                expect(res.body.length).toEqual(2);

                expect(res.body[0].request).toBeUndefined();
                expect(res.body[1].request).toBeUndefined();
                
                expect(res.body[0].response.body).toEqual('Hello');
                expect(res.body[1].response.body.fullName).toEqual('Buzz Lightyear');

                // mark test as complete
                done(err);
            });
    });


    it('should merge headers', function (done) {

        var testBatch = {
            "executeInSeries": true,
            "includeRequestsInResponse": true,
            "mergeHeaders": "xrequestedwith",
            "batch": [
                {
                    "url": "/route1",
                    "method": "GET",
                    "headers": {
                        "x-fake-header-1": (new Date()).getTime(),
                        "x-fake-header-2": (new Date()).getTime()
                    }
                },
                {
                    "url": "/route2",
                    "method": "POST",
                    "headers": {
                        "x-fake-header-1": (new Date()).getTime(),
                        "x-fake-header-2": (new Date()).getTime()
                    }
                }
            ]
        };

        app.get('/route1', function (req, res) {
            res.send("Hello");
        });

        app.post('/route2', function (req, res) {
            res.send("World");
        });

        // execute request and test response
        request(app).post('/batch')
            .set('XRequestedWith', 'SuperTest')
            .send(testBatch)
            .expect(200)
            .end(function (err, res) {

                // check we have a response
                expect(res.body).toBeDefined();
                expect(Array.isArray(res.body)).toBe(true);
                expect(res.body.length).toEqual(2);

                expect(res.body[0].request.headers['x-fake-header-1']).toEqual(testBatch.batch[0].headers['x-fake-header-1']);
                expect(res.body[0].request.headers['x-fake-header-2']).toEqual(testBatch.batch[0].headers['x-fake-header-2']);
                expect(res.body[0].request.headers['xrequestedwith']).toEqual('SuperTest');

                expect(res.body[1].request.headers['x-fake-header-1']).toEqual(testBatch.batch[1].headers['x-fake-header-1']);
                expect(res.body[1].request.headers['x-fake-header-2']).toEqual(testBatch.batch[1].headers['x-fake-header-2']);
                expect(res.body[1].request.headers['xrequestedwith']).toEqual('SuperTest');

                done(err);
            });
    });
});