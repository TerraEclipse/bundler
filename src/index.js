import 'babel-polyfill'
import merge from 'n-deep-merge'

export default function bundler (bundle) {
  let app = {
    _pathCache: {},
    _valCache: {},
    parsePath: (p, bundle) => {
      let alterMatch = p.match(/^@(?:(.+):)?([^\[]+)(\[(\-?\d*)\])?$/)
      if (alterMatch) {
        return {
          ns: alterMatch[1] || bundle._ns,
          pointer: alterMatch[2],
          op: 'alter',
          weight: alterMatch[3] ? parseInt(alterMatch[3].replace(/\[|\]/g, ''), 10) : 0,
          value: bundle[p],
          bundle: bundle,
          get: (p) => {
            return app.get(p, bundle._ns)
          }
        }
      }
      let pushMatch = p.match(/^(?:(.+):)?([^\[]+)\[(\-?\d*)\]$/)
      if (pushMatch) {
        return {
          ns: pushMatch[1] || bundle._ns,
          pointer: pushMatch[2],
          op: 'push',
          weight: pushMatch[3] ? parseInt(pushMatch[3].replace(/\[|\]/g, ''), 10) : 0,
          value: bundle[p],
          bundle: bundle,
          get: (p) => {
            return app.get(p, bundle._ns)
          }
        }
      }
      let mergeMatch = p.match(/^(?:(.+):)?([^\{]+)\{(\-?\d*)\}$/)
      if (mergeMatch) {
        return {
          ns: mergeMatch[1] || bundle._ns,
          pointer: mergeMatch[2],
          op: 'merge',
          weight: mergeMatch[3] ? parseInt(mergeMatch[3].replace(/\{|\}/g, ''), 10) : 0,
          value: bundle[p],
          bundle: bundle,
          get: (p) => {
            return app.get(p, bundle._ns)
          }
        }
      }
      if (p.charAt(0) === '_') return null
      let setMatch = p.match(/^(?:(.+):)?(.*)$/)
      if (!setMatch) {
        let err = new Error('invalid path `' + p + '`')
        throw err
      }
      return {
        ns: setMatch[1] || bundle._ns,
        pointer: setMatch[2],
        op: 'set',
        value: bundle[p],
        bundle: bundle,
        get: (p) => {
          return app.get(p, bundle._ns)
        }
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
      let p = parsed.ns ? parsed.ns + ':' + parsed.pointer : parsed.pointer
      if (typeof app._pathCache[p] === 'undefined') {
        app._pathCache[p] = []
      }
      app._pathCache[p].push(parsed)
    },
    getPathCache: (p) => {
      return app._pathCache[p] || []
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
    get: (p, defaultNs) => {
      if (!defaultNs) defaultNs = bundle._ns
      if (defaultNs && p.indexOf(':') === -1) {
        p = defaultNs + ':' + p
      }

      let cached = app.getValCache(p)
      if (typeof cached !== 'undefined') {
        return cached
      }
      let paths = app.getPathCache(p)
      if (!paths.length) {
        let err = new Error('path `' + p + '` is undefined')
        err.path = p
        throw err
      }
      let val = null
      paths.forEach((path) => {
        let tmp = app.getValue(path)
        if (typeof tmp === 'undefined') {
          let err = new Error('undefined value for `' + p + '`')
          err.path = path
          throw err
        }
        switch (path.op) {
          case 'set':
            val = tmp
            break
          case 'push':
            if (!val) val = []
            val = val.concat(tmp)
            break
          case 'merge':
            if (!val) val = {}
            if (toString.call(val) !== '[object Object]' || toString.call(tmp) !== '[object Object]') {
              let err = new Error('cannot merge non-object-literal `' + p + '`')
              err.val = val
              err.tmp = tmp
              err.path = path
              throw err
            }
            val = merge(val, tmp)
            break
          case 'alter':
            if (typeof tmp === 'function' && tmp.name === 'alter') {
              val = tmp.call(app, val)
            }
            else val = tmp
            break
        }
      })
      app.addValCache(p, val)
      return val
    },
    getValue: (path) => {
      let pointerValue = app.isPointer(path.value)
      if (pointerValue) {
        return path.get(pointerValue)
      }
      return typeof path.value === 'function' && path.value.name === 'container'
        ? path.value.call(app, path.get)
        : path.value
    },
    validatePathCache: () => {
      Object.keys(app._pathCache).forEach((p) => {
        let hasSet = false
        let hasMerge = false
        let hasPush = false
        let hasAlter = false
        let paths = app._pathCache[p]
        // order paths by op
        paths.sort(function (a, b) {
          if (a.op === 'set' && b.op !== 'set') return -1
          if (b.op === 'set' && a.op !== 'set') return 1
          if (a.op === 'alter' && b.op !== 'alter') return 1
          if (b.op === 'alter' && a.op !== 'alter') return -1
          if (a.weight < b.weight) return -1
          if (b.weight < a.weight) return 1
          return 0
        })
        paths.forEach((path) => {
          if (typeof path.value === 'undefined') {
            let err = new Error('undefined value for `' + p + '`')
            err.path = path
            throw err
          }
          switch (path.op) {
            case 'set':
              if (hasSet) {
                let err = new Error('cannot set path twice `' + p + '`')
                err.path = p
                err.paths = app._pathCache[p]
                throw err
              }
              hasSet = true
              break
            case 'push':
              if (hasMerge) {
                let err = new Error('cannot push and merge to same path `' + p + '`')
                err.path = p
                err.paths = app._pathCache[p]
                throw err
              }
              hasPush = true
              break
            case 'merge':
              if (hasPush) {
                let err = new Error('cannot push and merge to same path `' + p + '`')
                err.path = p
                err.paths = app._pathCache[p]
                throw err
              }
              hasMerge = true
              break
            case 'alter':
              hasAlter = true
              break
          }
          let pointerValue = app.isPointer(path.value)
          if (pointerValue && typeof app._pathCache[pointerValue] === 'undefined') {
            let err = new Error('cannot point to undefined path `' + pointerValue + '`')
            err.path = p
            err.paths = app._pathCache[p]
            err.pointer = pointerValue
            throw err
          }
        })
        if (hasAlter && !(hasSet || hasMerge || hasPush)) {
          let err = new Error('cannot alter undefined path `' + p + '`')
          err.path = p
          err.paths = app._pathCache[p]
          throw err
        }
      })
    },
    isPointer: (val) => {
      if (typeof val !== 'string') return false
      let pointerMatch = val.match(/^#(.*)$/)
      return pointerMatch ? pointerMatch[1] : false
    }
  }

  app.parseBundle(bundle)
  app.validatePathCache()

  return app
}
