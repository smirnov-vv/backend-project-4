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
