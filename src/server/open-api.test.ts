import { transformSchema } from './open-api'

describe('open api', () => {
  describe('transform schema', () => {
    it('should transform the schema for the upload enpoint', () => {
      const transformed = transformSchema({
        schema: {
          body: { remove: 'me' },
          operationId: '100'
        },
        url: '/upload/network/code-hash'
      })
      expect(transformed).toBeDefined()
      expect(transformed.schema).not.toHaveProperty('body.remove')
      expect(transformed.schema).toHaveProperty('operationId')
      expect(transformed.schema)
        .toHaveProperty('body.properties.package.type', 'file')
    })
    it('should bypass transformation for other enpoints', () => {
      const transformed = transformSchema({
        schema: {
          body: { keep: 'it' },
          operationId: '100'
        },
        url: '/info/network'
      })
      expect(transformed).toBeDefined()
      expect(transformed.schema).toHaveProperty('body.keep')
      expect(transformed.schema).toHaveProperty('operationId')
    })
  })
})
