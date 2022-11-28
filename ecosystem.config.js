module.exports = {
  apps: [{
    name: 'ink-verification-service',
    script: './build/start.js',
    env_production: {
      NODE_ENV: 'production',
      SERVER_HOST: '0.0.0.0',
      TMP_DIR: '/opt/verifier/tmp',
      BASE_DIR: '/opt/verifier/data',
      CACHES_DIR: '/opt/verifier/.caches',
      PUBLISH_DIR: '/opt/verifier/publish',
      VERIFIER_IMAGE: 'ink-verifier:latest',
      CONTAINER_ENGINE: 'podman'
    },
    env_development: {
      NODE_ENV: 'development'
    }
  }]
}
