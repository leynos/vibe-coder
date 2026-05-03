.PHONY: check-fmt typecheck lint test

check-fmt:
	bun fmt

typecheck:
	bun check:types

lint:
	bun lint

test:
	bun test
