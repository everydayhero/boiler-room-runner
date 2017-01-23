const React = require('react')
const withScroll = require('scroll-behavior').default
const { Provider } = require('react-redux')
const { Router, useRouterHistory, match } = require('react-router')
const { createHistory } = require('history')
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
  basepath = '',
  history = createHistory(),
  createLocals = defaultCreateLocals,
  onRouteError = () => {},
  onRouteRedirect = () => {}
}) => {
  const basedHistory = useRouterHistory(() => history)({
    basename: basepath
  })

  basedHistory.listen((location) => {
    match({ routes, location, basename: basepath }, (
      error,
      redirect,
      props
    ) => {
      if (error) {
        return onRouteError(error)
      } else if (redirect) {
        return onRouteRedirect(redirect)
      } else if (!props) {
        return onRouteError(new Error(`Not found: Route ${location.pathname} failed to match`))
      } 

      const { params, components, location } = props
      const { query } = location
      const locals = createLocals({ params, store, query })

      trigger('fetch', components, locals)
    })
  })

  const hashIgnoringHistory = withScroll(basedHistory, (_prevLoc, { hash } = {}) => (
    !hash
  ))

  return () => (
    React.createElement(Provider, { store },
      React.createElement(Router, { history: hashIgnoringHistory, routes })
    )
  )
}
