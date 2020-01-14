const React = require('react')
const { Provider } = require('react-redux')
const { BrowserRouter } = require('react-router-dom')
const queryString = require('query-string')
import { renderRoutes, matchRoutes } from 'react-router-config'
import { withRouter } from 'react-router'

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
  createLocals,
  onRouteError
}) => (location) => {
  const branch = matchRoutes(routes, location.pathname)

  if (!branch || branch.length === 0) {
    return onRouteError(new Error(`Not found: Route ${location.pathname} failed to match`))
  }

  const components = branch.map(b => b.route.component)
  const params = Object.assign(...branch.map(b => b.match.params))

  const query = queryString.parse(location.search)
  const locals = createLocals({ params, query, store })

  trigger('fetch', components, locals)
  trigger('defer', components, locals)
}

class _HookFetcher extends React.Component {
  componentDidMount () {
    const { store, createLocals, onRouteError, location, routes } = this.props

    onLocationChange({ store, routes, createLocals, onRouteError })(location)
  }

  componentDidUpdate (prevProps) {
    const { store, createLocals, onRouteError, location, routes } = this.props

    if (prevProps.location !== location) {
      onLocationChange({ store, routes, createLocals, onRouteError })(location)
    }
  }

  render () {
    return React.createElement('div', {}, this.props.children)
  }
}
const HookFetcher = withRouter(_HookFetcher)

module.exports = ({
  store = defaultStore(),
  routes = ensureRoutes('createClientApp'),
  basepath = '',
  createLocals = defaultCreateLocals,
  onRouteError = () => {},
  Router = BrowserRouter,
  routerProps = {}
}) => {
  return () => (
    React.createElement(Provider, { store },
      React.createElement(Router, { basename: basepath, ...routerProps },
        React.createElement(HookFetcher, {
            store,
            routes,
            basepath,
            createLocals,
            onRouteError
          },
          renderRoutes(routes)
        )
      )
    )
  )
}
