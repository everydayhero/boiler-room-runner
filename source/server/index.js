const Document = require('./Document')
const DocumentTitle = require('react-document-title')
const React = require('react')
const { Provider } = require('react-redux')
const { RouterContext, match } = require('react-router')
const { renderToString, renderToStaticMarkup } = require('react-dom/server')
const { trigger } = require('redial')

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
        title: DocumentTitle.rewind(),
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
// }

// createServerApp :: ServerAppDefinition -> (Route -> Promise (HTML))

module.exports = ({
  store = defaultStore(),
  assets = [],
  routes = ensureRoutes('createServerApp'),
  basepath = '/',
  renderDocument = defaultRenderDocument,
  renderApp = defaultRenderApp,
  createLocals = defaultCreateLocals
}) => {
  const empty = () => {
    const state = store.getState()
    return renderDocument({ assets, state })
  }

  const app = (route) => (
    new Promise((resolve, reject) => {
      match({ routes, location: route, basename: basepath }, (
        error,
        redirect,
        props
      ) => {
        if (error) {
          return reject(error)
        } else if (redirect) {
          return resolve({ redirect })
        } else if (!props) {
          return reject(new Error(`Not found: Route ${route} could not be matched`))
        }

        const { components, params, location } = props
        const { query } = location
        const locals = createLocals({ params, query, store })

        trigger('fetch', components, locals).then((res) => {
          const content = renderApp({ props, store })
          const state = store.getState()
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
