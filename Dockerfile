# Build.
FROM golang:1.21 as build
WORKDIR /go/src/app

# Copy the go.mod and go.sum files and download the dependencies.
# This allows us to cache the dependencies.
COPY go.mod go.sum ./
RUN go mod tidy

COPY . .

RUN CGO_ENABLED=0 go build -o /go/bin/app

# Run.
FROM gcr.io/distroless/static-debian11

COPY --chown=nonroot --from=build /go/bin/app /

EXPOSE 80

USER nonroot:nonroot
CMD ["/app"]