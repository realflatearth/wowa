const log = console.log
const async = require('async')
const cfg = require('../lib/config')
const _ = require('underscore')

let src = {
  $api: {
    curse: require('./curse'),
    mmoui: require('./mmoui'),
    tukui: require('./tukui'),
    github: require('./github')
  },

  $valid(ad) {
    if (ad.source && !src.$api[ad.source]) {
      log(`\nInvalid source: ${ad.source}, use one of below instead:`)
      log(
        _.keys(src.$api)
          .map(x => `  ${x}`)
          .join('\n')
      )
      return false
    }

    return true
  },

  parseName(name) {
    let t = name
    let d = {}

    if (name.match(/@/)) {
      t = name.split('@')
      d.version = t[1]
      t = t[0]
    }

    for (let k in src.$api) {
      if (t.match(/:\/\//)) {
        // looks like an long uri
        let r = src.$api[k].$lcl.exec(t)
        // log('long clue exec:', r)

        if (r) {
          d.source = k
          d.key = r[r.length - 1]
          break
        }
      } else {
        // treat as short uri
        let s = null
        let z = t.split(':')
        if (z.length > 1) s = z.shift()
        d.key = z[0]

        let f = src.$api[k].$fcl
        if (!s && f && d.key.search(f) >= 0) {
          d.source = k
          break
        } else if (s && src.$api[k].$scl.search(s) >= 0) {
          d.source = k
          break
        }
      }
    }

    d.anyway = cfg.anyway()
    return d
  },

  info(ad, done) {
    if (!src.$valid(ad)) return done()

    async.eachOfLimit(
      src.$api,
      1,
      (api, source, cb) => {
        if (ad.source && source !== ad.source) return cb()
        if (!ad.source && source === 'github') return cb()

        let res = null
        // log('iter', source)
        api.info(ad, info => {
          if (info && info.version.length) {
            res = info
            res.source = source
            // log('g info', info)
            done(res)
            cb(false)
          } else cb()
        })
      },
      () => {
        done()
      }
    )
  },

  search(ad, done) {
    if (!src.$valid(ad)) return done()

    async.eachOfLimit(
      src.$api,
      1,
      (api, source, cb) => {
        if (!api.search) return cb()
        if (ad.source && source !== ad.source) return cb()

        // log('searching', source)
        let res = null
        // log('searching', source)
        api.search(ad, data => {
          if (data && data.length) {
            res = { source, data }
            done(res)
            cb(false)
          } else cb()
        })
      },
      () => {
        done()
      }
    )
  },

  summary(done) {
    src.$api.mmoui.summary(done)
  }
}

module.exports = src
