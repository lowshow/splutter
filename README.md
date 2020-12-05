# splutter &bull; multi-channel stream recorder

experimental tool to stream-record audio in compressed segments and send them to a sludge server

## Summary

This project is a component of [\_noisecrypt](low.show/noisecrypt/). The component acts as a recording and encoding interface, where segments of OGG audio are sent to a [sludge](https://github.com/lowshow/sludge) server. This app sends the segments to its own route, and using nginx the data is then proxied to the sludge server. Streams are created via the sludge UI (or API). The decoding/playback interface is part of the [syllid](https://github.com/lowshow/syllid) component.

### Component communication

-   sludge communicates information to splutter via local storage, due to shared root domain

## Setup

### UI

-   Ensure [sludge](github.com/lowshow/sludge) is also running
-   Before running, ensure files and directories exist:

```shell
make init
```

NOTE: You will need to provide values for these variables

**Nginx port**

This is the port from which the nginx proxy server for splutter will run

**Service hostname**

This is the base URL hostname where splutter will be accessed

**Additional hostnames**

More hostnames (not required)

**Sludge port**

Port of the sludge deno app

#### Dev

```shell
npm i
npm run dev
```