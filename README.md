# express-batch-requests

[![Shippable branch](https://img.shields.io/shippable/5bf18eee3038210700d633d7/master.svg)](https://app.shippable.com/projects/5bf18eee3038210700d633d7)
[![Linked In](https://img.shields.io/badge/Linked-In-blue.svg)](https://www.linkedin.com/in/john-i-doherty) [![Twitter Follow](https://img.shields.io/twitter/follow/mrJohnDoherty.svg?style=social&label=Twitter&style=plastic)](https://twitter.com/mrJohnDoherty)

A simple way to add a HTTP batch request support to your node API using express middleware.

Batching HTTP requests allows client applications to issue multiple HTTP requests to your API using just one HTTP request - reducing network chatter, latency etc. This middleware extracts and executes each request individually, either in parallel or in series, and returns the result of each request as an array item.

## Installation

```bash
npm install --save express-batch-requests
```

## Usage

```js
var express = require('express');
var server = express();
var expressBatchRequests = require('express-batch-requests');

// mount the batch handler middleware
server.post('/batch', expressBatchRequests);

// typical API route 1
server.get('/route1', function (req, res) {
    res.send("Hello World");
});

// typical API route 2
server.post('/route2', function (req, res) {
    res.json({
        fullName: req.body.firstName + ' ' + req.body.lastName
    });
});

// start the server
server.listen(8080, function () {
    console.log('Web server listening on port 8080');
});
```

## Request

Requests are executed in parallel by default, to execute them in series add `executeInSeries: true`. Likewise, to include the original request object with each result add `includeRequestsInResponse: true` to the request.

```json
{
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
}
```

## Response

```json
[
    {
        "request": {
            "url": "/route1",
            "method": "GET"
        },
        "response": {
            "code": 200,
            "headers": {
                "content-type": "text/plain"
            },
            "body": "Hello World"
        }
    },
    {
        "request": {
            "url": "/route2",
            "method": "POST",
            "headers": {
                "User-Agent": "space-command"
            },
            "body": {
                "firstName": "Buzz",
                "lastName": "Lightyear"
            }
        },
        "response": {
            "code": 200,
            "headers": {
                "content-type": "application/json"
            },
            "body": {
                "fullName": "Buzz Lightyear"
            }
        }
    }
]
```

## Star the repo

If you find this useful star the repo as it helps me prioritize which bugs to tackle first.

## History

For change-log, check [releases](https://github.com/john-doherty/express-batch-requests/releases).

## License

Licensed under [MIT License](LICENSE) &copy; [John Doherty](http://www.johndoherty.info)