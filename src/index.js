import 'babel-polyfill'
import merge from 'n-deep-merge'

export default function bundler (bundle) {
  let app = {
    _pathCache: {},
    _valCache: {},
    parsePath: (p, bundle) => {
      let alterMatch = p.match(/^@(.*)(\[(\-?\d*)\])?$/)
      if (alterMatch) {
        return {
          pointer: alterMatch[1],
          op: 'alter',
          weight: alterMatch[2] ? parseInt(alterMatch[2], 10) : 0,
          value: bundle[p],
          bundle: bundle
        }
      }
      let pushMatch = p.match(/^(.*)\[(\-?\d*)\]$/)
      if (pushMatch) {
        return {
          pointer: pushMatch[1],
          op: 'push',
          weight: pushMatch[2] ? parseInt(pushMatch[2], 10) : 0,
          value: bundle[p],
          bundle: bundle
        }
      }
      let mergeMatch = p.match(/^(.*)\{(\-?\d*)\}$/)
      if (mergeMatch) {
        return {
          pointer: mergeMatch[1],
          op: 'merge',
          weight: mergeMatch[2] ? parseInt(mergeMatch[2], 10) : 0,
          value: bundle[p],
          bundle: bundle
        }
      }
      if (p.charAt(0) === '_') return null
      return {
        pointer: p,
        op: 'set',
        value: bundle[p],
        bundle: bundle
      }
    },
    parseBundle: (bundle) => {
      if (bundle['_bundles']) {
        bundle['_bundles'].forEach((bundle) => {
          app.parseBundle(bundle)
        })
      }
      Object.keys(bundle).forEach((p) => {
        let parsed = app.parsePath(p, bundle)
        if (parsed) {
          app.addPathCache(parsed)
        }
      })
    },
    addPathCache: (parsed) => {
      if (typeof app._pathCache[parsed.pointer] === 'undefined') {
        app._pathCache[parsed.pointer] = []
      }
      app._pathCache[parsed.pointer].push(parsed)
    },
    getPathCache: (p) => {
      let paths = app._pathCache[p]
      if (!paths) return []
      // order paths by op
      paths.sort(function (a, b) {
        if ((a.op === 'push' && b.op === 'merge') || (b.op === 'push' && a.op === 'merge')) {
          let err = new Error('cannot push and merge to same path')
          err.a = a
          err.b = b
          throw err
        }
        if (a.op === 'set' && b.op === 'set') {
          let err = new Error('cannot set path twice')
          err.a = a
          err.b = b
          throw err
        }
        if (a.op === 'set' && b.op !== 'set') return -1
        if (b.op === 'set' && a.op !== 'set') return 1
        if (a.op === 'alter' && b.op !== 'alter') return 1
        if (b.op === 'alter' && a.op !== 'alter') return -1
        if (a.weight < b.weight) return -1
        if (b.weight < a.weight) return 1
        return 0
      })
      return paths
    },
    resetCache: () => {
      app._pathCache = {}
      app._valCache = {}
    },
    addValCache: (p, val) => {
      app._valCache[p] = val
    },
    getValCache: (p) => {
      return app._valCache[p]
    },
    get: (p) => {
      let cached = app.getValCache(p)
      if (typeof cached !== 'undefined') {
        return cached
      }
      let paths = app.getPathCache(p)
      if (!paths.length) {
        let err = new Error('path not exported')
        err.path = p
        throw err
      }
      let val = null
      paths.forEach((path) => {
        let tmp = app.evalContainer(path.value)
        if (typeof tmp === 'undefined') {
          let err = new Error('undefined export')
          err.path = path
          throw err
        }
        switch (path.op) {
          case 'set':
            val = tmp
            break
          case 'push':
            if (!val) val = []
            val.push(tmp)
            break
          case 'merge':
            if (!val) val = {}
            if (toString.call(val) !== '[object Object]' || toString.call(tmp) !== '[object Object]') {
              let err = new Error('cannot merge non-object-literal')
              err.val = val
              err.tmp = tmp
              err.path = path
              throw err
            }
            val = merge(val, tmp)
            break
          case 'alter':
            if (typeof tmp === 'function') {
              val = tmp.call(app, val)
            }
            else val = tmp
            break
        }
      })
      app.addValCache(p, val)
      return val
    },
    evalContainer: (orig) => {
      return typeof orig === 'function' && orig.name === 'container'
        ? orig.call(app, app.get)
        : orig
    }
  }

  app.parseBundle(bundle)

  return app
}
