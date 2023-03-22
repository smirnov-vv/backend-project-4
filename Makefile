install:
	npm ci

page-loader:
	node bin/index.js

publish:
	npm publish --dry-run

lint:
	npx eslint .

test:
	npm test

watch:
	npm run watch

test-coverage:
	npm test -- --coverage --coverageProvider=v8

nock:
	DEBUG=nock.* NODE_OPTIONS=--experimental-vm-modules npx jest

axios:
	DEBUG=axios NODE_OPTIONS=--experimental-vm-modules npx jest

debug:
	DEBUG=page-loader NODE_OPTIONS=--experimental-vm-modules npx jest
