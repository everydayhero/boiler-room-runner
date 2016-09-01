const React = require('react')
const withScroll = require('scroll-behavior')
const { Provider } = require('react-redux')
const { Router, useRouterHistory, match } = require('react-router')
const { createHistory: defaultCreateHistory } = require('history')
const { syncHistoryWithStore } = require('react-router-redux')
const { trigger } = require('redial')

const {
  defaultCreateLocals,
  defaultStore,
  ensureRoutes
} = require('../shared')

// ClientAppDefinition {
//   store = ReduxStore,
//   routes = ReactRouterRoutes,
//   history = ReactRouterHistory,
//   createLocals = ReactRouterParams -> ReduxStore -> Locals,
//   onRouteError = Error -> reactRouterRedirect -> ()
// }

// createClientApp :: ClientAppDefinition -> ClientAppElement

module.exports = ({
  store = defaultStore(),
  routes = ensureRoutes('createClientApp'),
  basepath = '/',
  createHistory = defaultCreateHistory,
  createLocals = defaultCreateLocals,
  onRouteError = () => {},
  onRouteRedirect = () => {}
}) => {
  const history = useRouterHistory(createHistory)({
    basename: basepath
  })

  history.listen((location) => {
    match({ routes, location, basename: basepath }, (
      error,
      redirect,
      props
    ) => {
      if (error) {
        return onRouteError(error)
      } else if (!props) {
        return onRouteError(new Error(`Not found: Route ${location.pathname} failed to match`))
      } else if (redirect) {
        return onRouteRedirect(redirect)
      }

      const { params, components, location } = props
      const { query } = location
      const locals = createLocals({ params, store, query })

      trigger('fetch', components, locals)
    })
  })

  const hashIgnoringHistory = withScroll(history, (_prevLoc, { hash } = {}) => (
    !hash
  ))
  const syncedHistory = syncHistoryWithStore(hashIgnoringHistory, store)

  return () => (
    React.createElement(Provider, { store },
      React.createElement(Router, { history: syncedHistory, routes })
    )
  )
}
