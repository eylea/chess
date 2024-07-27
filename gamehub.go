package main

import (
	"fmt"
	"sync"
)

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
