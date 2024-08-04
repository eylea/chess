package main

import "encoding/json"

type MessageType int

const (
	Move MessageType = iota
	Resign
	OfferDraw
	AcceptDraw
	DeclineDraw
	GameEnd
	Error
	Initial
)

func (mt MessageType) String() string {
	switch mt {
	case Move:
		return "move"
	case Resign:
		return "resign"
	case OfferDraw:
		return "offer_draw"
	case AcceptDraw:
		return "accept_draw"
	case DeclineDraw:
		return "decline_draw"
	case GameEnd:
		return "game_end"
	case Error:
		return "error"
	case Initial:
		return "initial"
	default:
		return "unknown"
	}
}

func (mt MessageType) MarshalJSON() ([]byte, error) {
	return json.Marshal(mt.String())
}

func (mt *MessageType) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}

	switch s {
	case "move":
		*mt = Move
	case "resign":
		*mt = Resign
	case "offer_draw":
		*mt = OfferDraw
	case "accept_draw":
		*mt = AcceptDraw
	case "decline_draw":
		*mt = DeclineDraw
	case "error":
		*mt = Error
	default:
		*mt = -1
	}

	return nil
}

// Message is a struct that represents a message sent by a client.
type Message struct {
	Player Player      `json:"player"`
	Type   MessageType `json:"type"`
	Data   string      `json:"data"`
}

func NewMessage(player Player, messageType MessageType, data string) Message {
	return Message{
		Player: player,
		Type:   messageType,
		Data:   data,
	}
}

type ServerMessage struct {
	Type MessageType `json:"type"`
	Data interface{} `json:"data"`
}

func NewServerMessage(t MessageType, data interface{}) *ServerMessage {
	return &ServerMessage{
		Type: t,
		Data: data,
	}
}

type ServerMoveMessage struct {
	Fen        string   `json:"fen"`
	LegalMoves []string `json:"moves"`
	Move       string   `json:"move"`
}

type ServerInitialMessage struct {
	Fen        string   `json:"fen"`
	LegalMoves []string `json:"moves"`
	Player     Player   `json:"player"`
}

func NewServerInitialMessage(fen string, moves []string, player Player) *ServerMessage {
	return &ServerMessage{
		Type: Initial,
		Data: &ServerInitialMessage{
			Fen:        fen,
			LegalMoves: moves,
			Player:     player,
		},
	}
}

func NewServerMoveMessage(move, fen string, moves []string) *ServerMessage {
	return &ServerMessage{
		Type: Move,
		Data: &ServerMoveMessage{
			Move:       move,
			Fen:        fen,
			LegalMoves: moves,
		},
	}
}

func NewServerError(err error) *ServerMessage {
	return &ServerMessage{
		Type: Error,
		Data: err.Error(),
	}
}
