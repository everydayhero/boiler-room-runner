const Document = require('./Document')
const React = require('react')
const { Provider } = require('react-redux')
const { RouterContext, match } = require('react-router')
const { renderToString, renderToStaticMarkup } = require('react-dom/server')
const { join } = require('path')
const { trigger } = require('redial')

const { assign } = Object

const serializeLocation = ({
  basename = '',
  pathname = '',
  search = '',
  hash = ''
}) => (
  `${join(basename, pathname)}${search}${hash}`
)

const {
  defaultCreateLocals,
  defaultStore,
  ensureRoutes
} = require('../shared')

const defaultRenderApp = ({ store, props }) => (
  renderToString(
    React.createElement(
      Provider, { store },
      React.createElement(
        RouterContext, props
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

      match({ routes, location: route, basename: basepath }, (
        error,
        redirect,
        props
      ) => {
        if (error) {
          return reject(error)
        } else if (redirect) {
          return resolve({
            redirect: serializeLocation(
              assign(redirect, { basename: basepath })
            )
          })
        } else if (!props) {
          return reject(new Error(`Not found: Route ${route} could not be matched`))
        }

        const { components, params, location } = props
        const { query } = location
        const locals = createLocals({ params, query, store: storeInstance })

        trigger('advance', components, locals).then(() => (
          trigger('fetch', components, locals)
        )).then((res) => {
          const content = renderApp({ props, store: storeInstance })
          const state = storeInstance.getState()
          const result = renderDocument({
            assets,
            content,
            state
          })
          resolve({ result })
        }).catch((error) => {
          reject(error)
        })
      })
    })
  )

  app.empty = empty
  return app
}
