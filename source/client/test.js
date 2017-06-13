require('es6-shim')
const { polyfill } = require('es6-promise')
typeof Promise === 'undefined' && polyfill()

const React = require('react')
const { provideHooks } = require('redial')
const test = require('tape')
const sinon = require('sinon')
const { render } = require('react-dom')
const { Link } = require('react-router')
const { createStore } = require('redux')

const mount = (App, test) => {
  const elem = document.createElement('div')
  document.body.appendChild(elem)
  render(React.createElement(App), elem)
  test(elem)
  document.body.removeChild(elem)
}

const createClientApp = require('./')

test('createClientApp() throws an exception when routes are undefined', (t) => {
  t.plan(1)

  try {
    createClientApp({ routes: undefined })
  } catch (e) {
    t.equal(e.message, 'No routes key was found on options passed to createClientApp')
  }
})

test('createClientApp() returns a react element', (t) => {
  t.plan(1)

  const routes = {
    path: '/__testling',
    component: () => React.createElement('div')
  }
  const App = createClientApp({ routes })

  t.ok(React.isValidElement(React.createElement(App)), 'is a valid element')
})

test('createClientApp() calls redial functions on initial load', (t) => {
  t.plan(1)

  const hooks = {
    fetch: sinon.spy(() => Promise.resolve())
  }
  const App = provideHooks(hooks)(
    () => React.createElement('div')
  )

  const routes = {
    path: '/__testling',
    component: App
  }

  createClientApp({ routes })
  t.ok(hooks.fetch.called, 'fetch called')
})

test('createClientApp() calls redial functions on history change', (t) => {
  t.plan(1)

  const Root = ({ children }) => (
    React.createElement('div', {},
      React.createElement(Link, { to: '/__testling/foo', id: 'foo-link' }, 'Go for it'),
      children
    )
  )

  const hooks = {
    fetch: sinon.spy(() => Promise.resolve())
  }
  const Foo = provideHooks(hooks)(
    () => React.createElement('div')
  )

  const routes = {
    path: '/__testling',
    component: Root,
    indexRoute: {
      component: () => React.createElement('div')
    },
    childRoutes: [
      {
        path: 'foo',
        component: Foo
      }
    ]
  }

  const App = createClientApp({ routes })

  mount(App, (elem) => {
    const link = elem.querySelector('#foo-link')
    link.click()
    t.ok(hooks.fetch.called, 'fetch called')
    global.history.replaceState({}, '', '/__testling')
  })
})

test('createClientApp() calls redial functions with { state, dispatch, query, params }', (t) => {
  t.plan(2)

  const hooks = {
    fetch: sinon.spy(() => Promise.resolve())
  }
  const App = provideHooks(hooks)(
    () => React.createElement('div')
  )

  const routes = {
    path: '/__testling',
    component: App
  }
  const store = createStore(() => ({ foo: 'Foo' }))

  createClientApp({ routes, store })

  const arg = hooks.fetch.getCall(0).args[0]
  t.is(store.dispatch, arg.dispatch)
  t.is('Foo', arg.state.foo)
})

test('createClientApp() takes an optional createLocals function to prepare redial locals', (t) => {
  t.plan(1)

  const Root = ({ children }) => (
    React.createElement('div', {},
      React.createElement(Link, { to: '/__testling/foo?bar=baz', id: 'createLocalsLink' }, 'Go for it'),
      children
    )
  )

  const createLocalsSpy = sinon.spy(() => ({}))

  const routes = {
    path: '/__testling',
    component: Root,
    indexRoute: {
      component: () => React.createElement('div')
    },
    childRoutes: [
      {
        path: 'foo',
        component: () => React.createElement('div')
      }
    ]
  }

  const App = createClientApp({
    routes,
    createLocals: createLocalsSpy
  })

  createLocalsSpy.reset()

  mount(App, (elem) => {
    const link = elem.querySelector('#createLocalsLink')
    link.click()
    const arg = createLocalsSpy.getCall(0).args[0]
    t.equal(arg.query.bar, 'baz')
  })
})

test('createClientApp() take an optional basepath param to prefix all matching and links', (t) => {
  t.plan(1)

  const Root = ({ children }) => (
    React.createElement('div', {},
      React.createElement(Link, { to: '/foo', id: 'has-base-foo-link' }, 'Go for it'),
      children
    )
  )

  const routes = {
    path: '/',
    component: Root,
    indexRoute: {
      component: () => React.createElement('div')
    },
    childRoutes: [
      {
        path: 'foo',
        component: () => React.createElement('div')
      }
    ]
  }

  const App = createClientApp({
    routes,
    basepath: '/__testling'
  })

  mount(App, (elem) => {
    const link = elem.querySelector('#has-base-foo-link')
    t.equal(link.getAttribute('href'), '/__testling/foo')
  })
})

test('default setup allows navigation', (t) => {
  t.plan(2)

  const Root = ({ children }) => (
    React.createElement('div', {},
      React.createElement(Link, {
        to: '/__testling/', id: 'navigation-home-link'
      }, 'Home'),
      React.createElement(Link, {
        to: '/__testling/foo', id: 'navigation-foo-link'
      }, 'Foo'),
      children
    )
  )

  const routes = {
    path: '/__testling',
    component: Root,
    indexRoute: {
      component: () => React.createElement('div', 'Home!')
    },
    childRoutes: [
      {
        path: 'foo',
        component: () => React.createElement('div', 'Foo!')
      }
    ]
  }

  const App = createClientApp({
    routes
  })

  mount(App, (elem) => {
    const homeLink = elem.querySelector('#navigation-home-link')
    const fooLink = elem.querySelector('#navigation-foo-link')
    fooLink.click()
    t.equal(global.location.pathname, '/__testling/foo')
    homeLink.click()
    t.equal(global.location.pathname, '/__testling/')
  })
})
