const Document = require('./Document')
const React = require('react')
const { Provider } = require('react-redux')
const { StaticRouter } = require('react-router')
const queryString = require('query-string')
const { matchRoutes, renderRoutes } = require('react-router-config')

const { renderToString, renderToStaticMarkup } = require('react-dom/server')
const { trigger } = require('redial')

const {
  defaultCreateLocals,
  defaultStore,
  ensureRoutes
} = require('../shared')

const defaultRenderApp = ({ routes, store, context, location, basename }) => (
  renderToString(
    React.createElement(
      Provider, { store },
      React.createElement(
        StaticRouter, { location, context, basename },
        renderRoutes(routes)
      )
    )
  )
)

const defaultRenderDocument = ({
  assets = [],
  content = '',
  state = {}
}) => {
  const styles = assets.filter((asset) => asset.match(/\.css$/))
  const scripts = assets.filter((asset) => asset.match(/\.js$/))

  return '<!DOCTYPE html>' + renderToStaticMarkup(
    React.createElement(
      Document, {
        title: 'My App',
        state,
        scripts,
        styles,
        content
      }
    )
  )
}

// ServerAppDefinition {
//   store = ReduxStore,
//   routes = ReactRouterRoutes,
//   renderDocument = HTML -> ReduxStore -> HTML,
//   renderApp = RenderProps -> ReduxStore -> HTML,
//   createLocals = Params -> ReduxStore -> Locals,
//   createStore = State -> ReduxStore,
//   initialState = State
// }

// createServerApp :: ServerAppDefinition -> (Route -> Promise (HTML))

module.exports = ({
  store,
  assets = [],
  routes = ensureRoutes('createServerApp'),
  basepath = '',
  renderDocument = defaultRenderDocument,
  renderApp = defaultRenderApp,
  createLocals = defaultCreateLocals,
  createStore = defaultStore,
  initialState = {}
}) => {
  const empty = () => {
    const storeInstance = store || createStore(initialState)
    const state = storeInstance.getState()
    return renderDocument({ assets, state })
  }

  const app = (route) => (
    new Promise((resolve, reject) => {
      const storeInstance = store || createStore(initialState)
      const branch = matchRoutes(routes, route)

      if (!branch || branch.length === 0) {
        return reject(new Error(`Not found: Route ${route} could not be matched`))
      }

      const components = branch.map(b => b.route.component)
      const params = Object.assign(...branch.map(b => b.match.params))

      const search = route.split('?')[1]
      const query = queryString.parse(search)
      const locals = createLocals({ params, query, store: storeInstance })

      trigger('fetch', components, locals).then(() => {
        let context = {}
        let content = renderApp({
          routes,
          store: storeInstance,
          context,
          location: route,
          basename: basepath
        })
        // Static router sets context.url if the rendered component is a Redirect
        if (context.url) {
          return resolve({
            redirect: context.url
          })
        }

        const state = storeInstance.getState()
        const body = renderDocument({
          assets,
          content,
          state
        })
        resolve({ body })
      }).catch(reject)
    })
  )

  app.empty = empty
  return app
}
