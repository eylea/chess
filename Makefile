dev:
	air
build:
	go build -o ./bin/main .
run:
	make build && ./tmp/main
