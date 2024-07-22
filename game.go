package main

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"

	"github.com/google/uuid"
	"github.com/notnil/chess"
	"github.com/samber/lo"
)

type Player int

const (
	None Player = iota
	White
	Black
)

type Game struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	game       *chess.Game
	id         string
}

func newGame() *Game {
	return &Game{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		game:       chess.NewGame(),
		id:         uuid.New().String(),
	}
}

func (h *Game) run() {
	for {
		select {
		case client := <-h.register:
			log.Println("registering client")
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				log.Println("unregistering client")
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
			log.Printf("broadcasting msg %s", message)
			if err := h.game.MoveStr(string(message)); err != nil {
				log.Println("invalid move", string(message))
			}
			log.Printf("game state: %s", h.game.Position().Board().Draw())

			msg := NewServerMessage(h.game.FEN(),
				lo.Map(h.game.ValidMoves(),
					func(m *chess.Move, _ int) string {
						return m.String()
					}),
				h.game.Position().Turn())
			en, err := json.Marshal(msg)
			if err != nil {
				log.Println("error marshalling message", err)
				en = []byte{}
			}
			for client := range h.clients {
				select {
				case client.send <- []byte(en):
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

type GameHub struct {
	mu    *sync.Mutex
	games map[string]*Game
}

func NewGameHub() *GameHub {
	return &GameHub{
		games: make(map[string]*Game),
		mu:    &sync.Mutex{},
	}
}

func (gh *GameHub) NewGame() *Game {
	gh.mu.Lock()
	defer gh.mu.Unlock()
	g := newGame()
	gh.games[g.id] = g
	return g
}

func (gh *GameHub) DeleteGame(id string) {
	gh.mu.Lock()
	defer gh.mu.Unlock()

	if _, ok := gh.games[id]; ok {
		delete(gh.games, id)
	}
}

func (gh *GameHub) GetGame(id string) (*Game, error) {
	gh.mu.Lock()
	defer gh.mu.Unlock()

	if g, ok := gh.games[id]; ok {
		return g, nil
	}

	return nil, fmt.Errorf("gamehub: could not find game with id: %s", id)
}
