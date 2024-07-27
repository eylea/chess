package main

import (
	"encoding/json"
	"math/rand"
)

type Player int

const (
	None Player = iota
	White
	Black
)

func (p Player) String() string {
	switch p {
	case White:
		return "white"
	case Black:
		return "black"
	default:
		return "none"
	}
}

func (p Player) MarshalJSON() ([]byte, error) {
	return json.Marshal(p.String())
}

func (p *Player) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}

	switch s {
	case "white":
		*p = White
	case "black":
		*p = Black
	default:
		*p = None
	}

	return nil
}

func randomPlayer() Player {
	return Player(rand.Intn(2) + 1)
}
