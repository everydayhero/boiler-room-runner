const { describe, it } = require('mocha')
const { expect } = require('chai')
const React = require('react')
const { provideHooks } = require('redial')
const sinon = require('sinon')
const { MemoryRouter, Router } = require('react-router')
const { Link } = require('react-router-dom')
const { renderRoutes } = require('react-router-config')
const { createStore } = require('redux')
const { mount } = require('enzyme')
const { createMemoryHistory } = require('history')

const createClientApp = require('./')

describe('createClientApp', () => {
  it('throws an exception when routes are undefined', () => {
    try {
      createClientApp({ routes: undefined })
    } catch (e) {
      expect(e.message).to.equal('No routes key was found on options passed to createClientApp')
    }
  })

  it('returns a react element', () => {
    const routes =[{
      path: '/',
      component: () => React.createElement('div')
    }]

    const App = createClientApp({ routes })

    expect(React.isValidElement(React.createElement(App))).to.equal(true)
  })

  it('calls redial functions on initial load', () => {
    const hooks = {
      fetch: sinon.spy(() => Promise.resolve())
    }
    const App = provideHooks(hooks)(
      () => React.createElement('div', null, 'Hello')
    )

    const routes = [{
      path: '/',
      component: App
    }]

    const Root = createClientApp({
      routes,
      Router: MemoryRouter,
      routerProps: {
        initialEntries: ['/']
      }
    })
    mount(React.createElement(Root))

    expect(hooks.fetch.called).to.equal(true)
  })

  it('calls redial functions on location change', () => {
    const Root = ({ route }) => {
      return (
        React.createElement('div', {},
          React.createElement(Link, { to: '/foo', id: 'foo-link' }, 'Go for it'),
          renderRoutes(route.routes)
        )
      )
    }

    const hooks = {
      fetch: sinon.spy(() => Promise.resolve())
    }
    const Foo = provideHooks(hooks)(
      () => React.createElement('div', {}, 'Foo!')
    )

    const routes = [
      {
        path: '/',
        component: Root,
        routes: [
          {
            path: '/foo',
            component: Foo
          }
        ]
      }
    ]

    const App = createClientApp({
      routes,
      Router: MemoryRouter,
      routerProps: {
        initialEntries: ['/']
      }
    })
    const wrapper = mount(React.createElement(App))

    wrapper.find('a#foo-link').first().simulate('click', { button: 0 })

    expect(hooks.fetch.called).to.equal(true)
  })

  it('calls redial functions with { state, dispatch, query, params }', () => {
    const hooks = {
      fetch: sinon.spy(() => Promise.resolve())
    }
    const App = provideHooks(hooks)(
      () => React.createElement('div')
    )

    const routes = [{
      path: '/',
      component: App
    }]
    const store = createStore(() => ({ foo: 'Foo' }))
    const Root = createClientApp({
      routes,
      store,
      Router: MemoryRouter,
      routerProps: {
        initialEntries: ['/']
      }
    })
    mount(React.createElement(Root))

    const arg = hooks.fetch.getCall(0).args[0]
    expect(arg.dispatch).to.equal(store.dispatch)
    expect(arg.state.foo).to.equal('Foo')
  })

  it('takes an optional createLocals function to prepare redial locals', () => {
    const Root = () => (
      React.createElement('div', {},
        React.createElement(Link, { to: '/foo?bar=baz', id: 'createLocalsLink' }, 'Go for it')
      )
    )

    const createLocalsSpy = sinon.spy(() => ({}))

    const routes = [
      {
        path: '/',
        component: Root,
      },
      {
        path: '/foo',
        component: () => React.createElement('div', {}, 'Hi, Foo!')
      }
    ]

    const App = createClientApp({
      routes,
      createLocals: createLocalsSpy,
      Router: MemoryRouter,
      routerProps: {
        initialEntries: ['/foo?bar=baz']
      }
    })

    mount(React.createElement(App))
    const arg = createLocalsSpy.getCall(0).args[0]
    expect(arg.query.bar).to.equal('baz')
  })

  it('should take an optional basepath param to prefix all matching', () => {
    const Root = ({ children }) => (
      React.createElement('div', {},
        React.createElement(Link, { to: '/basepath/foo', id: 'has-base-foo-link' }, 'Go for it'),
        children
      )
    )

    const routes = [
      {
        path: '/',
        component: Root
      },
      {
        path: '/foo',
        component: () => React.createElement('div')
      }
    ]

    const App = createClientApp({
      routes,
      basepath: '/basepath',
      Router: MemoryRouter,
      routerProps: {
        initialEntries: ['/']
      }
    })

    const wrapper = mount(React.createElement(App))
    const link = wrapper.find('a#has-base-foo-link')

    expect(link.prop('href')).to.equal('/basepath/foo')
  })

  it('allows navigation', () => {
    const Root = ({ route }) => (
      React.createElement('div', {},
        React.createElement(Link, {
          to: '/', id: 'navigation-home-link'
        }, 'Home'),
        React.createElement(Link, {
          to: '/foo', id: 'navigation-foo-link'
        }, 'Foo'),
        renderRoutes(route.routes)
      )
    )

    const routes = [
      {
        path: '/',
        component: Root,
        routes: [
          {
            path: '/foo',
            component: () => React.createElement('div', 'Foo!')
          }
        ]
      }
    ]

    const history = createMemoryHistory({ initialEntries: ['/'] })
    history.push('/')
    const historySpy = sinon.spy(history, 'push')
    const App = createClientApp({
      routes,
      Router,
      routerProps: {
        history
      }
    })
    const wrapper = mount(React.createElement(App))

    const homeLink = wrapper.find('a#navigation-home-link').first()
    const fooLink = wrapper.find('a#navigation-foo-link').first()

    fooLink.simulate('click', { button: 0 })
    expect(historySpy.firstCall.args[0]).to.equal('/foo')

    homeLink.simulate('click', { button: 0 })
    expect(historySpy.secondCall.args[0]).to.equal('/')
  })
})
