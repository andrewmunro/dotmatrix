package main

import (
	"fmt"
	"log"
	"net"
	"net/url"
	"os"
	"os/signal"
	"time"

	"github.com/gorilla/websocket"
)

func getEnv(key, fallback string) string {
    value := os.Getenv(key)
    if len(value) == 0 {
        return fallback
    }
    return value
}

func main() {
	port := getEnv("UDP_PORT", "8080")

	// ws setup
	u := url.URL{Scheme: "ws", Host: "rgb.mun.sh", Path: "/sub"}
	log.Printf("connecting to %s", u.String())

	c, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		log.Fatal("dial:", err)
	}
	defer c.Close()

	// UDP setup
	udpAddr, err := net.ResolveUDPAddr("udp", ":"+port) // Change the UDP address and port accordingly
	if err != nil {
		log.Fatal("UDP resolve address:", err)
	}

	conn, err := net.ListenUDP("udp", udpAddr)
	if err != nil {
		log.Fatal("UDP listen:", err)
	}
	defer conn.Close()

	done := make(chan struct{})

	clients := make(map[string]*net.UDPAddr)

	// Read from websocket and write to UDP
	go func() {
		for {
			_, message, err := c.ReadMessage()
			if err != nil {
				log.Println("read:", err)
				return
			}
			// log.Printf("recv: %s", message)

			// Send data to all clients
			for _, client := range clients {
				// chunk message into 4 parts, with a sequence number
				chunk0 := append([]byte{0}, message[:len(message)/4]...)
				chunk1 := append([]byte{1}, message[len(message)/4:len(message)/2]...)
				chunk2 := append([]byte{2}, message[len(message)/2:len(message)/4*3]...)
				chunk3 := append([]byte{3}, message[len(message)/4*3:]...)

				// Send data to UDP connection
				for _, chunk := range [][]byte{chunk0, chunk1, chunk2, chunk3} {
					_, err := conn.WriteToUDP(chunk, client)
					if err != nil {
						fmt.Printf("Error sending data to %s: %v\n", client, err)
						// delete client from clients map
						delete(clients, client.String())
					}
				}
			}
		}
	}()

	// Handle udp clients
	go func() {
		defer close(done)
		buf := make([]byte, 1024)

		for {
			// Read from UDP connection
			n, clientAddr, err := conn.ReadFromUDP(buf)
			if err != nil {
				fmt.Println("Error reading from UDP connection:", err)
				continue
			}

			// Print received data
			fmt.Printf("Received from %s: %s\n", clientAddr, buf[:n])

			// Add client to clients map
			clients[clientAddr.String()] = clientAddr
		}
	}()

	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt)

	for {
		select {
		case <-done:
			return
		case <-interrupt:
			log.Println("interrupt")

			// Cleanly close the connection by sending a close message and then
			// waiting (with timeout) for the server to close the connection.
			err := c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
			if err != nil {
				log.Println("write close:", err)
				return
			}
			select {
			case <-done:
			case <-time.After(time.Second):
			}
			return
		}
	}
}