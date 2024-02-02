package main

import (
	"fmt"
	"net/http"
	"os"
)

const (
	SUCCESS = 0
	FAIL    = 1
)

func main() {
	resp, err := http.Get("http://localhost:80")
	if err != nil {
		fmt.Println("GET request failed:", err)
		os.Exit(FAIL)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		fmt.Println("GET request successful")
		os.Exit(SUCCESS)
	} else {
		fmt.Println("GET request failed with status code:", resp.StatusCode)
		os.Exit(FAIL)
	}
}
