# Build.
FROM golang:1.21 as build
WORKDIR /go/src/app
COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 go build -o /go/bin/app
RUN CGO_ENABLED=0 go build -o /go/bin/hc cmd/main.go

# Run.
FROM gcr.io/distroless/static-debian11

COPY --from=build /go/bin/app /
COPY --from=build /go/bin/hc /

HEALTHCHECK --interval=1s CMD ["/hc"]
EXPOSE 80
CMD ["/app"]