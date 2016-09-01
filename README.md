# Runner

[![Build status](https://badge.buildkite.com/35edf858022bf6c8ec20dc8a3433348f4a268d772991e2c913.svg)](https://buildkite.com/everyday-hero/boiler-room-runner-tests)

Redux for state management, Redial for data-fetching for multiple components
and React Router for responding to history state changes.

```
npm install boiler-room-runner --save
```

## In your client.js file

```
const { render } = require('react-dom')
const { createClient } = require('boiler-room-runner')

const routes = require('./my-routes')
const store = require('./my-store')

const App = createClient({
  store,
  routes
})

// Now you have a component which you can render to the DOM

render(<App />, document.getElementById('app'))
```

## In your server.js file

```
const { createServer } = require('boiler-room-runner')

const routes = require('./my-routes')
const store = require('./my-store')

const app = createServer({
  store,
  routes
})

// Now you have a function which takes a route and returns a Promise
// resolving to the rendered HTML for that route.

app('/foos/123').then(({ result }) => result)
```

## Required params

The only property needed to init both the server and client apps is a React Router routes configuration. You can provide this in any form that react Router accpets.

## Optional Params

### Server

`renderDocument`

A function which will take the result of calling `renderToString` on your app, along with the store, and return the final markup.

### Client

`createHistory`

A function which returns a history object to be used by React Router. Default is the `createHistory` function exported by the history module.

`onRouteError(error)`

A function called in the event that React Router errored in trying to revolve a route transition.

`onRouteRedirect(redirectLocation)`

A function called in the event that React Router was redirected in the process of revolving a route transition.

### Both

`store`

A Redux store which will be passed to a `<Provider />`

`basepath`

A path that will be prepended to all route-matching and href generation. If your app is not hosted at `/` you'll need to use this option to tell your app where all paths start from. Default is `/`.

`createLocals({ params, query, store })`

A function which takes the params object from React Router, the query from the parsed location, the store instance, and returns a locals object to be used by Redial.
