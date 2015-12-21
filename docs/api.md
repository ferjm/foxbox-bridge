# FoxBox Bridge API

This document provides protocol-level details of the FoxBox Bridge API that allows a client to remotely access to a FoxBox device.

___

# HTTP API

FoxBox Bridge exposes an HTTP API to register boxes and allow clients to remotely discover these boxes to initiate a WebRTC connection.

## URL Structure

All requests will be to URLs of the form:

    https://<server-url>/v1/<api-endpoint>

Note that:

* All API access must be over a properly-validated HTTPS connection.
* The URL embeds a version identifier "v1"; future revisions of this API may introduce new version numbers.

## Request Format

All POST requests must have a content-type of `application/json` with a utf8-encoded JSON body, and must specify the content-length header.

### Authentication

Requests that require authentication use [Firefox Accounts](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/Firefox_Accounts) OAuth2 bearer tokens. These endpoints are marked with :lock: in the description below

Use the OAuth token with this header:

```js
{
    "authorization": "Bearer <oauth_token>"
}
```

The `GET /fxa-oauth/params` endpoint can be used to get the configuration in order to trade the Firefox Account BrowserID with a Bearer Token. See [Firefox Account documentation](https://developer.mozilla.org/en-US/Firefox_Accounts#Firefox_Accounts_BrowserID_API) about this behavior.

```js
$ http GET http://localhost:8000/v0/fxa-oauth/params -v

GET /v0/fxa-oauth/params HTTP/1.1
Accept-Encoding: gzip, deflate
Host: localhost:8000
User-Agent: HTTPie/0.8.0

HTTP/1.1 200 OK
Content-Length: 103
Content-Type: application/json; charset=UTF-8
Date: Thu, 19 Feb 2015 09:28:37 GMT
Server: waitress

{
    "oauth_uri": "https://oauth-stable.dev.lcip.org",
    "scope": "foxbox-bridge"
}
```

## Response Format

All successful requests will produce a response with HTTP status code of "200" and content-type of "application/json".  The structure of the response body will depend on the endpoint in question.

Failures due to invalid behavior from the client will produce a response with HTTP status code in the "4XX" range and content-type of "application/json".  Failures due to an unexpected situation on the server will produce a response with HTTP status code in the "5XX" range and content-type of "application/json".

To simplify error handling for the client, the type of error is indicated both by a particular HTTP status code, and by an application-specific error code in the JSON response body.  For example:

```js
{
  "code": 400, // matches the HTTP status code
  "errno": 777, // stable application-level error number
  "error": "Bad Request", // string description of the error type
  "message": "the value of salt is not allowed to be undefined",
  "info": "https://docs.endpoint/errors/1234" // link to more info on the error
}
```

Responses for particular types of error may include additional parameters.

The currently-defined error responses are:

* status code 400, errno 101:  Invalid push endpoint. You forgot to pass the Simple Push URL or it is not a valid URL.
* status code 400, errno 102:  Invalid label. You forgot to pass the label for this box or it is not well formed (single string).
* status code 400, errno 103:  Invalid users. The list of allowed users is not well formed.
* status code 400, errno 104:  Unknown box. The box identifier does not mach with any of the registered boxes.
* status code 400, errno 105:  Unknown user. The given user does not match with any of the allowed users for this box.
* status code 401, errno 201:  Unauthorized. The credentials you passed are not valid.
* status code 409, errno 301:  Already registered. The tuple `{owner, label}` already exists.
* status code 498, errno 401:  Token expired/invalid.
* status code 501, errno 501:  Database error
* any status code, errno 999:  Unknown error

# API Endpoints

* Boxes
    * [POST /box/](#post-box) :lock:
    * [GET /box/](#get-box) :lock:
    * [DELETE /box/:id/](#delete-boxid) :lock:
* Users
    * [POST /box/:id/users/](#post-boxiduser) :lock:
    * [PUT /box/:id/users/:email/](#put-boxiduseremail) :lock:
    * [DELETE /box/:id/users/:email/](#delete-boxiduseremail) :lock:
* Connections
    * [POST /box/:id/connections/](#post-boxidconnection) :lock:
    * [GET /box/connections/:token/](#get-boxconnectiontoken)
    * [DELETE /box/connections/:token/](#delete-boxconnectiontoken) :lock:
* Firefox Accounts
    * [GET /fxa-oauth/params]()

## POST /box/

Registers a new FoxBox with the Bridge by associating a push endpoint with a unique `{owner, label}` tuple, where `owner` is a verified Firefox Accounts email and `label` is an identifier for the box.

### Request

___Parameters___

* pushEndpoint - The Simple Push endpoint URL as defined in https://wiki.mozilla.org/WebAPI/SimplePush#Definitions
* label - Case insensitive name of the box. i.e.: `home`, `my_room`, `beach_home`. This name must be unique per owner.
* description - (optional) Human readable description of the box.
* users - (optional) Array of users allowed to remotely access to this box. Each user should include a valid Firefox Accounts email and optionally an `admin` flag that indicates that the user is able to modify the registration. Each box should handle the permissions to access the services it exposes by itself. The bridge only takes care of the connection between remote clients and boxes.

```ssh
POST /box/ HTTP/1.1
Content-Type: application/json
Authorization:"Bearer eyJhbGciOiJSUzI1NiJ9...i_dQ"

{
  "pushEndpoint": "https://push.services.mozilla.com/update/MGlYke2SrEmYE8ceyu",
  "label": "home",
  "description": "Home FoxBox",
  "users": [{
    "email": "user@domain.org",
    "admin": true
  }, "anotheruser@domain.com"]
}
```

### Response

Successful requests will produce a "200 OK" response with the identifier of the box as body. This identifier is the base64 representation of the `owner,label` tuple.

```ssh
HTTP/1.1 200 OK
Connection: close
Content-Type: application/json; charset=utf-8
Content-Length: 54
Date: Mon, 15 Dec 2015 16:17:50 GMT

{
  "id": "ZmVyam1vcmVub0BnbWFpbC5jb20saG9tZQ0K"
}
```

Failing requests may be due to the following errors:

* status code 400, errno 101:  Invalid push endpoint. You forgot to pass the Simple Push URL or it is not a valid URL.
* status code 400, errno 102:  Invalid label. You forgot to pass the label for this box or it is not well formed (single string).
* status code 400, errno 103:  Invalid users. The list of allowed users is not well formed.
* status code 400, errno 104:  Unknown box. The box identifier does not mach with any of the registered boxes.
* status code 401, errno 201:  Unauthorized. The credentials you passed are not valid.
* status code 409, errno 301:  Already registered. The tuple {owner, label} already exists.

## GET /box/

Returns the list of registered boxes owned or administrated by the Firefox Account authenticating the request.

### Request

```ssh
GET /box/ HTTP/1.1
Authorization:"Bearer eyJhbGciOiJSUzI1NiJ9...i_dQ"
```

### Response

Successful requests will produce a "200 OK" response with a list of boxes details.

```ssh
HTTP/1.1 200 OK
Connection: close
Content-Type: application/json; charset=utf-8
Content-Length: 214
Date: Mon, 15 Dec 2015 16:17:50 GMT

{
  "boxes": [{
    "id": "ZmVyam1vcmVub0BnbWFpbC5jb20saG9tZQ0K",
    "label": "home",
    "description": "Home box",
    "users": [{
      "email": "user@domain.org",
      "anotheremail@domain.org"
    }]
  }]
}
```

Failing requests may be due to the following errors:

* status code 401, errno 201:  Unauthorized. The credentials you passed are not valid.

## DELETE /box/:id/

Unregisters a box.

### Request

___Parameters___

* id - Box unique identifier. This value should be the base64 representation of the `{owner,label}` tuple.

```ssh
DELETE /box/ZmVyam1vcmVub0BnbWFpbC5jb20saG9tZQ0K HTTP/1.1
Authorization:"Bearer eyJhbGciOiJSUzI1NiJ9...i_dQ"
```

### Response

Successful requests will produce a "200 OK" response.

```ssh
HTTP/1.1 200 OK
Connection: close
Content-Type: application/json; charset=utf-8
Content-Length: 2
Date: Mon, 15 Dec 2015 16:17:50 GMT

OK
```
Failing requests may be due to the following errors:

* status code 400, errno 104:  Unknown box. The box identifier does not mach with any of the registered boxes.
* status code 401, errno 201:  Unauthorized. The credentials you passed are not valid.

## POST /box/:id/users/

Adds a new user to the list of allowed users for a registered box. Only the owner or admins of the box are able to perform this action.

### Request

___Parameters___

* id - Box unique identifier. This value should be the base64 representation of the `{owner,label}` tuple.
* users - Array of users allowed to remotely access to this box. Each user should include a valid Firefox Accounts email and optionally an `admin` flag that indicates that the user is able to modify the registration.

```ssh
POST /box/ZmVyam1vcmVub0BnbWFpbC5jb20saG9tZQ0K/users/ HTTP/1.1
Content-Type: application/json
Authorization:"Bearer eyJhbGciOiJSUzI1NiJ9...i_dQ"

{
  "users": [{
    "email": "user@domain.org",
    "admin": true
  }, "anotheruser@domain.com"]
}
```

### Response

Successful requests will produce a "200 OK" response.

```ssh
HTTP/1.1 200 OK
Connection: close
Content-Type: application/json; charset=utf-8
Content-Length: 2
Date: Mon, 15 Dec 2015 16:17:50 GMT

OK
```
Failing requests may be due to the following errors:

* status code 400, errno 103:  Invalid users. The list of allowed users is not well formed.
* status code 400, errno 104:  Unknown box. The box identifier does not mach with any of the registered boxes.
* status code 401, errno 201:  Unauthorized. The credentials you passed are not valid.

## PUT /box/:id/users/:email/

Edit the details of an existing user.

### Request

___Parameters___

* id - Box unique identifier. This value should be the base64 representation of the `{owner,label}` tuple.
* email - base64 representation of a valid Firefox Account email.
* admin - Boolean flag indicating that the user has admin permissions for this box.

```ssh
PUT /box/ZmVyam1vcmVub0BnbWFpbC5jb20saG9tZQ0K/users/dXNlckBkb21haW4ub3Jn/ HTTP/1.1
Content-Type: application/json
Authorization:"Bearer eyJhbGciOiJSUzI1NiJ9...i_dQ"

{
  "admin": false
}
```

### Response

Successful requests will produce a "200 OK" response.

```ssh
HTTP/1.1 200 OK
Connection: close
Content-Type: application/json; charset=utf-8
Content-Length: 2
Date: Mon, 15 Dec 2015 16:17:50 GMT

OK
```
Failing requests may be due to the following errors:

* status code 400, errno 104:  Unknown box. The box identifier does not mach with any of the registered boxes.
* status code 400, errno 105:  Unknown user. The given user does not match with any of the allowed users for this box.
* status code 401, errno 201:  Unauthorized. The credentials you passed are not valid.

## DELETE /box/:id/users/:email/

Removes an existing user from a box registration.

### Request

___Parameters___

* id - Box unique identifier. This value should be the base64 representation of the `{owner,label}` tuple.
* email - base64 representation of a valid Firefox Account email.

```ssh
DELETE /box/ZmVyam1vcmVub0BnbWFpbC5jb20saG9tZQ0K/users/dXNlckBkb21haW4ub3Jn/ HTTP/1.1
Authorization:"Bearer eyJhbGciOiJSUzI1NiJ9...i_dQ"
```

### Response

Successful requests will produce a "200 OK" response.

```ssh
HTTP/1.1 200 OK
Connection: close
Content-Type: application/json; charset=utf-8
Content-Length: 2
Date: Mon, 15 Dec 2015 16:17:50 GMT

OK
```
Failing requests may be due to the following errors:

* status code 400, errno 104:  Unknown box. The box identifier does not mach with any of the registered boxes.
* status code 400, errno 105:  Unknown user. The given user does not match with any of the allowed users for this box.
* status code 401, errno 201:  Unauthorized. The credentials you passed are not valid.

## POST /box/:id/connections/

Creates a remote connection for a client to access a box externally. The bearer token authenticating the request should belong to any of the allowed box users.

### Request

___Parameters___

* id - Box unique identifier. This value should be the base64 representation of the `{owner,label}` tuple.
* scopeURL - URL of the box service the client wants to access remotely.

```ssh
POST /box/ZmVyam1vcmVub0BnbWFpbC5jb20saG9tZQ0K/connections/ HTTP/1.1
Content-Type: application/json
Authorization:"Bearer eyJhbGciOiJSUzI1NiJ9...i_dQ"
{
  "scopeURL": "https://a.service.running.on.a.foxbox.com"
}
```

### Response

Successful requests will produce a "200 OK" response with a body containing:

* connectionToken - The token used to identify the connection.

```ssh
HTTP/1.1 200 OK
Connection: close
Content-Type: application/json; charset=utf-8
Content-Length: 2
Date: Mon, 15 Dec 2015 16:17:50 GMT

{
  "connectionToken": "pPVoaqiH89M"
}
```

Failing requests may be due to the following errors:

* status code 400, errno 104:  Unknown box. The box identifier does not mach with any of the registered boxes.
* status code 401, errno 201:  Unauthorized. The credentials you passed are not valid.

## GET /box/:id/connections/

Obtains the list of connections for a specific box. The bearer token authenticating the request should belong to any of the allowed box users.

### Request

___Parameters___

* id - Box unique identifier. This value should be the base64 representation of the `{owner,label}` tuple.

```ssh
GET /box/ZmVyam1vcmVub0BnbWFpbC5jb20saG9tZQ0K/connections/ HTTP/1.1
Content-Type: application/json
Authorization:"Bearer eyJhbGciOiJSUzI1NiJ9...i_dQ"
```

### Response

Successful requests will produce a "200 OK" response with a body containing:

* connectionToken - The token used to identify the connection.
* pushNotification - Version sent along with the push notification.

```ssh
HTTP/1.1 200 OK
Connection: close
Content-Type: application/json; charset=utf-8
Content-Length: 2
Date: Mon, 15 Dec 2015 16:17:50 GMT

{
  "connectionToken": "pPVoaqiH89M",
  "pushNotification": "1450696947434"
}
```

Failing requests may be due to the following errors:

* status code 400, errno 104:  Unknown box. The box identifier does not mach with any of the registered boxes.
* status code 401, errno 201:  Unauthorized. The credentials you passed are not valid.

## GET /box/connections/:token

Starts a remote connection.

### Request

___Parameters___

* token - Token identifying the connection.

```ssh
GET /box/connections/pPVoaqiH89M HTTP/1.1
```

### Response

Successful requests will produce a "200 OK" response with a body containing:

* connectionURL - WebSockets URL to initiate the WebRTC connection between the remote client and the box. See [WebSockets API]().

```ssh
HTTP/1.1 200 OK
Connection: close
Content-Type: application/json; charset=utf-8
Content-Length: 2
Date: Mon, 15 Dec 2015 16:17:50 GMT

{
  "connectionURL": "wss://localhost:5000/websocket/MX40NDcwMDk1Mn5"
}
```

Failing requests may be due to the following errors:

* status code 498, errno 401:  Token expired/invalid.

## DELETE /box/:id/connections/

Removes a remote connection with a box. The bearer token authenticating the request should belong to any of the allowed box users.

### Request

___Parameters___

* token - Token identifying the connection.

```ssh
DELETE /box/connections/pPVoaqiH89M HTTP/1.1
Authorization:"Bearer eyJhbGciOiJSUzI1NiJ9...i_dQ"

```

### Response

Successful requests will produce a "200 OK".

```ssh
HTTP/1.1 200 OK
Connection: close
```

Failing requests may be due to the following errors:

* status code 401, errno 201:  Unauthorized. The credentials you passed are not valid.
* status code 498, errno 401:  Token expired/invalid.

# WebSockets API

Once the peer discovery process is completed, certain information needs to be exchanged between a client and its box before being able to start the intended WebRTC communication. This data is exchanged through the following WebSockets based protocol.

### Initiating WebRTC connection

After receiving a connection request via push notification with a version id, the box will initiate the WebRTC connection with the client by sending a `hello` message containing a serialized WebRTC SDP offer

```js
{
    "message": "hello",
    "token": "44ee04b9694ae121c03a1db685cfad6d",
    "webrtcOffer": "<sdp-offer>"
}
```

### Receiving WebRTC answer

The client should response with a serialized WebRTC SDP answer.

```js
{
    "message": "hello",
    "webrtcAnswer": "<sdp-answer>"
}
```

### Sending and receiving ICE candidates

Along with the SDP offer/answer, network information needs to be exchanged.

```js
{
    "message": "ice",
    "candidate": {
        "candidate": "candidate:2 1 UDP 2122187007 10.252.27.213 41683 typ host",
        "sdpMid": "",
        "sdpMLineIndex": 0
    }
}
```

### Errors

Errors caused in any of the described stages will be sent with the following format:

```js
{
  "message": "error",
  "errno": 777, // stable application-level error number
  "error": "Bad Request", // string description of the error type
  "message": "the value of salt is not allowed to be undefined",
  "info": "https://docs.endpoint/errors/1234" // link to more info on the error
}
```
