import workContext from './context'

describe('work context', () => {
  it('should have empty process list on instantiate', () => {
    expect(workContext.processes).toEqual([])
  })
})
