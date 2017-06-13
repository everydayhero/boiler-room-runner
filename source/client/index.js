const React = require('react')
const useScroll = require('react-router-scroll/lib/useScroll')
const { Provider } = require('react-redux')
const {
  Router,
  useRouterHistory,
  applyRouterMiddleware,
  match
} = require('react-router')
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

const onLocationChange = ({
  store,
  routes,
  basepath,
  createLocals,
  onRouteError,
  onRouteRedirect
}) => (location) => {
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
}

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

  const locationChangeHandler = onLocationChange({
    store,
    routes,
    createLocals,
    onRouteError,
    onRouteRedirect
  })

  basedHistory.listen(locationChangeHandler)

  if (basedHistory.getCurrentLocation) {
    const initialLocation = basedHistory.getCurrentLocation()
    locationChangeHandler(initialLocation)
  }

  const scrollBehaviourMiddleware = useScroll((prevRouterProps, routerProps) => {
    const scrollToAnchor = (prevRouterProps, { location }) => {
      if (location.hash) {
        const e = document.querySelector(location.hash)
        if (e) {
          e.scrollIntoView()
          return false
        }
      }
      return true
    }
    const scrollBehaviourRoute = routerProps.routes.find((route) =>
      route.scrollBehaviour)
    const customScrollBehaviour = scrollBehaviourRoute
      ? scrollBehaviourRoute.scrollBehaviour
      : scrollToAnchor
    return customScrollBehaviour(prevRouterProps, routerProps)
  })

  return () => (
    React.createElement(Provider, { store },
      React.createElement(Router, {
        history: basedHistory,
        routes,
        render: applyRouterMiddleware(scrollBehaviourMiddleware)
      })
    )
  )
}
