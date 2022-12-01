/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts?$',
  coveragePathIgnorePatterns: [
    '<rootDir>/src/start.ts',
    '<rootDir>/src/server/ready.ts',
    '<rootDir>/src/routes/tail.ts',
    '<rootDir>/src/routes/api-docs.ts',
    '<rootDir>/src/config/swagger-ui.ts'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/\\.tmp/.*',
    '<rootDir>/src/config/swagger-ui.ts',
    '<rootDir>/src/routes/api-docs.ts'
  ]
}
