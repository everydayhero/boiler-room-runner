const { describe, it } = require('mocha')
const { expect } = require('chai')
const sinon = require('sinon')

const React = require('react')
const { Link } = require('react-router')
const { createStore } = require('redux')

const createServerApp = require('./')

describe('createServerApp', () => {
  describe('the app definition', () => {
    it('throws an exception when routes are undefined / null', () => {
      try {
        createServerApp({ routes: undefined })
      } catch (e) {
        expect(e.message).to.eq('No routes key was found on options passed to createServerApp')
      }

      try {
        createServerApp({ routes: null })
      } catch (e) {
        expect(e.message).to.eq('No routes key was found on options passed to createServerApp')
      }
    })

    it('takes an optional renderDocument function which is called to produce the final result', (done) => {
      const routes = { path: '/', component: () => React.createElement('div', null, '') }
      const app = createServerApp({ routes, renderDocument () { return 'This is my thing' } })

      app('/').then(({ result }) => {
        expect(result).to.eq('This is my thing')
        done()
      }).catch(done)
    })

    it('takes an optional renderApp function which is called to produce the result passed to renderDocument', (done) => {
      const routes = { path: '/', component: () => React.createElement('div', null, '') }
      const app = createServerApp({
        routes,
        renderDocument ({ content }) {
          return `WOOT! ${content}`
        },
        renderApp () {
          return 'This is my thing'
        }
      })

      app('/').then(({ result }) => {
        expect(result).to.eq('WOOT! This is my thing')
        done()
      }).catch(done)
    })

    it('takes an optional createLocals function which is called with the router params and store to produce locals for redial', (done) => {
      const routes = {
        path: '/',
        component: ({ children }) => children,
        indexRoute: {
          component: () => React.createElement('div')
        },
        childRoutes: [
          {
            path: '/foos/:fooId',
            component: () => React.createElement('div')
          }
        ]
      }
      const store = createStore((state) => state)
      const createLocalsSpy = sinon.spy(({ params }) => (params))
      const app = createServerApp({
        routes,
        store,
        createLocals: createLocalsSpy
      })

      app('/foos/1').then(() => {
        const arg = createLocalsSpy.getCall(0).args[0]
        expect(arg.params).to.eql({ fooId: '1' })
        expect(arg.store).to.eq(store)
        done()
      }).catch(done)
    })

    it('calls createLocals with the query from the passed location', (done) => {
      const routes = {
        path: '/',
        component: ({ children }) => children,
        indexRoute: {
          component: () => React.createElement('div')
        },
        childRoutes: [
          {
            path: '/foos',
            component: () => React.createElement('div')
          }
        ]
      }
      const createLocalsSpy = sinon.spy((args) => args)

      const app = createServerApp({
        routes,
        createLocals: createLocalsSpy
      })

      app('/foos?foo=bar').then(() => {
        const arg = createLocalsSpy.getCall(0).args[0]
        expect(arg.query).to.eql({ foo: 'bar' })
        done()
      }).catch(done)
    })

    it('takes createStore() and initalState options to create a fresh store for each request, unless the store option is provided', (done) => {
      const routes = { path: '/', component: () => React.createElement('div', null, '') }
      const stores = []

      const app = createServerApp({
        routes,
        initialState: { foo: 'Foo' },
        createStore (initialState) {
          const storeInstance = createStore((state) => state, initialState)
          stores.push(storeInstance)
          return storeInstance
        }
      })

      Promise.all([
        app('/'),
        app('/')
      ]).then(() => {
        const store1 = stores[0]
        const store2 = stores[1]
        expect(store1.getState().foo).to.eq('Foo')
        expect(store2.getState().foo).to.eq('Foo')
        expect(store1).to.not.eq(store2)
        done()
      }).catch(done)
    })

    it('it takes a basepath option which will prefix all route matching and links', (done) => {
      const routes = {
        path: '/',
        component: () => React.createElement(Link, { to: '/' })
      }

      const app = createServerApp({
        routes,
        basepath: '/mah-base'
      })

      app('/').then(({ result }) => {
        expect(result).to.contain('/mah-base')
        done()
      }).catch(done)
    })
  })

  it('returns a function which takes a route and returns a promise', () => {
    const routes = { path: '/', component: () => React.createElement('div', null, '') }
    const app = createServerApp({ routes })
    const subject = app('/')
    expect(subject instanceof Promise).to.be.ok
  })

  describe('the returned promise', () => {
    const IndexRouteHandler = () => (
      React.createElement('div', null, 'YARGY YARG YARG')
    )

    const BlargyRouteHandler = () => (
      React.createElement('div', null, 'BLARGY BLARG BLARG')
    )

    const routes = {
      path: '/',
      component: ({ children }) => children,
      indexRoute: {
        component: IndexRouteHandler
      },
      childRoutes: [
        { path: '/blargy', component: BlargyRouteHandler }
      ]
    }

    it('resolves to the HTML for the matching route (index)', (done) => {
      const app = createServerApp({ routes })
      app('/').then(({ result }) => {
        expect(result).to.contain('YARGY YARG YARG')
        done()
      }).catch(done)
    })

    it('resolves to the HTML for the matching route (blargy)', (done) => {
      const app = createServerApp({ routes })
      app('/blargy').then(({ result }) => {
        expect(result).to.contain('BLARGY BLARG BLARG')
        done()
      }).catch(done)
    })

    it('rejects with a "Not found" error when route cannot be matched', (done) => {
      const app = createServerApp({ routes })
      app('/blargoi').catch((error) => {
        expect(error.message).to.contain('Not found')
        done()
      })
    })

    it('resolves with a redirect location when route is redirected', (done) => {
      const routesWithRedirect = Object.assign({}, routes, {
        childRoutes: routes.childRoutes.concat([
          {
            path: '/redir',
            onEnter (_, replace) {
              return replace('/blargy')
            }
          }
        ])
      })
      const app = createServerApp({ routes: routesWithRedirect })
      app('/redir').then(({ redirect }) => {
        expect(redirect).to.eq('/blargy')
        done()
      }).catch(done)
    })

    describe('redirecting', () => {
      it('respects combinations of hashes and searches', () => {
        const routesWithRedirect = Object.assign({}, routes, {
          childRoutes: routes.childRoutes.concat([
            {
              path: '/redir1',
              onEnter (_, replace) {
                return replace('/blargy?foo=bar')
              }
            },
            {
              path: '/redir2',
              onEnter (_, replace) {
                return replace('/blargy#baz')
              }
            },
            {
              path: '/redir3',
              onEnter (_, replace) {
                return replace('/blargy?foo=bar#baz')
              }
            }
          ])
        })
        const app = createServerApp({ routes: routesWithRedirect })
        return Promise.all([
          app('/redir1'),
          app('/redir2'),
          app('/redir3')
        ]).then(([search, hash, both]) => {
          expect(search.redirect).to.eq('/blargy?foo=bar')
          expect(hash.redirect).to.eq('/blargy#baz')
          expect(both.redirect).to.eq('/blargy?foo=bar#baz')
        })
      })

      it('respects basepath', () => {
        const routesWithRedirect = Object.assign({}, routes, {
          childRoutes: routes.childRoutes.concat([
            {
              path: '/redir',
              onEnter (_, replace) {
                return replace('/blargy')
              }
            }
          ])
        })
        const app1 = createServerApp({
          routes: routesWithRedirect,
          basepath: '/foo'
        })
        const app2 = createServerApp({
          routes: routesWithRedirect,
          basepath: '/foo/'
        })
        return Promise.all([
          app1('/redir'),
          app2('/redir')
        ]).then(([one, two]) => {
          expect(one.redirect).to.eq('/foo/blargy')
          expect(two.redirect).to.eq('/foo/blargy')
        })
      })
    })
  })

  describe('.empty()', () => {
    it('returns the result of calling renderDocument with the provided assets array', () => {
      const routes = { path: '/', component: () => React.createElement('div', null, '') }
      const renderDocument = ({ content, assets = [] }) => `NAH ${assets[0]}`
      const assets = ['MATE']
      const app = createServerApp({ routes, assets, renderDocument })
      const result = app.empty()
      expect(result).to.eq('NAH MATE')
    })
  })
})
