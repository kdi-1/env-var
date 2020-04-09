
import * as env from '../../';
import { expect } from 'chai'
import * as url from 'url';
import 'mocha'
import { throws } from 'assert';

describe('typescript tests', () => {
  describe('#from', () => {
    it('should return an env-var instance and read with asString()', () => {
      const A_STRING = 'hello, world!'
      const e = env.from({
        A_STRING
      })

      expect(e.get('A_STRING').asString()).to.equal(A_STRING)
    })

    it('should return an env-var instance be missing system vars', () => {
      // env-var instance with no vars
      const e = env.from({})

      expect(e.get('PATH').asString()).to.equal(undefined)
    })
  })

  describe('#accessors', () => {
    it('required().asString() should throw if missing', () => {
      const e = env.from({})

      expect(() => {
        e.get('A_MISSING_VARIABLE').required().asString()
      }).to.throw('env-var: "A_MISSING_VARIABLE" is a required variable, but it was not set')
    })
  })

  describe('#ExtensionFn', () => {
    interface EmailComponents {
      username: string
      domain: string
    }
    const asEmailComponents: env.ExtensionFn<EmailComponents> = (value) => {
      const parts = value.split('@')

      if (parts.length != 2) {
        throw new Error('should be an email')
      } else {
        return {
          username: parts[0],
          domain: parts[1]
        }
      }
    }

    it('should return the email parts for a valid email, throw for invalid', () => {
      const extendedEnv = env.from({
        VALID_EMAIL: 'hello@example.com',
        INVALID_EMAIL: 'oops-example.com'
      }, {
        asEmailComponents
      })

      // We use required() here to verify chaining typings work
      expect(
        extendedEnv.get('VALID_EMAIL').required().asEmailComponents()
      ).to.deep.equal({
        username: 'hello',
        domain: 'example.com'
      })

      expect(() => {
        extendedEnv.get('INVALID_EMAIL').asEmailComponents()
      }).to.throw('env-var: "INVALID_EMAIL" should be an email, but is set to "oops-example.com"')
    })

    it('should support multiple extensions (with correct types)', () => {
      const asNumberZero: env.ExtensionFn<number> = (value) => {
        const n = parseInt(value)

        if (n === 0) {
          return 0
        }

        throw new env.EnvVarError('was not zero')
      }

      const extendedEnv = env.from({
        EMAIL: 'hello@example.com',
        ZERO: '0'
      }, {
        asEmailComponents,
        asNumberZero
      })

      expect(
        extendedEnv.get('ZERO').required().asNumberZero()
      ).to.equal(0)

      expect(
        extendedEnv.get('ZERO').asNumberZero()
      ).to.equal(0)

      expect(
        extendedEnv.get('EMAIL').required().asEmailComponents()
      ).to.deep.equal({
        username: 'hello',
        domain: 'example.com'
      })

      expect(
        extendedEnv.get('EMAIL').asEmailComponents()
      ).to.deep.equal({
        username: 'hello',
        domain: 'example.com'
      })
    })

    it('should carry extension functions to a child with from()', () => {
      const asNumberZero: env.ExtensionFn<number> = (value) => {
        const n = parseInt(value)

        if (n === 0) {
          return 0
        }

        throw new env.EnvVarError('was not zero')
      }

      const extendedEnvA = env.from({
        ZERO: '0'
      }, {
        asNumberZero
      })

      const extendedEnvB = extendedEnvA.from({
        ZERO: '0'
      }, {
        asNumberZero
      })

      expect(
        extendedEnvB.get('ZERO').required().asNumberZero()
      ).to.equal(0)

      expect(
        extendedEnvB.get('ZERO').asNumberZero()
      ).to.equal(0)
    })
  })
})
