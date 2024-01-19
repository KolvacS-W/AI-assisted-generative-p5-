const fal = require('@fal-ai/serverless-client');

fal.config({
  // Can also be auto-configured using environment variables:
  // Either a single FAL_KEY or a combination of FAL_KEY_ID and FAL_KEY_SECRET
  credentials: '3bbc3dd4-809e-4dec-bf34-aad62b751d68:411697a6d27b34954e0dd05921c8355b',
});

console.log('key loaded')