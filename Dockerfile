# Build.
FROM golang:1.21 as build
WORKDIR /go/src/app
COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 go build -o /go/bin/app

# Run.
FROM gcr.io/distroless/static-debian11
COPY --from=build /go/bin/app /
EXPOSE 3000
CMD ["/app"]