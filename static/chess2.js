const WHITE = 'white';
const BLACK = 'black';

const PIECES = {
    'r': '♜',
    'n': '♞',
    'b': '♝',
    'q': '♛',
    'k': '♚',
    'p': '♟',
    'R': '♖',
    'N': '♘',
    'B': '♗',
    'Q': '♕',
    'K': '♔',
    'P': '♙',
};

const PIECE_FILES = {
    'r': 'rook-b.svg',
    'n': 'knight-b.svg',
    'b': 'bishop-b.svg',
    'q': 'queen-b.svg',
    'k': 'king-b.svg',
    'p': 'pawn-b.svg',
    'R': 'rook-w.svg',
    'N': 'knight-w.svg',
    'B': 'bishop-w.svg',
    'Q': 'queen-w.svg',
    'K': 'king-w.svg',
    'P': 'pawn-w.svg',
};

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

let getValidMoves = () => {
    return [];
}

let getColor = () => {
    return '';
}

let getCurrentPlayer = () => {
    return '';
}

let getFen = () => {
    return '';
}

let sendMove = function(move) { console.log('Move:', move) };

let lastMove = null;

const getGame = () => {
    const gameIdInput = document.getElementById('game-id-input');
    if (!gameIdInput) {
        console.error('Game ID input not found');
        return;
    }

    const gameId = gameIdInput.value.trim();

    if (gameId) {
        connectToGame(gameId);
    } else {
        fetchNewGame();
    }
}

const fetchNewGame = () => {
    console.log('Fetching new game...');
    fetch('/game')
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch game');
            return response.json();
        })
        .then(data => connectToGame(data.game_id))
        .catch(error => console.error(error));
}

const connectToGame = (gameId) => {
    console.log(`Connecting to game: ${gameId}`);
    const ws = new WebSocket(`ws://localhost:8080/game/${gameId}`);

    ws.onmessage = handleOnMessage;
    ws.onopen = () => updateGameIdHeader(gameId);

    sendMove = makeSendMove(ws);
}

const updateGameIdHeader = (gameId) => {
    let header = document.getElementById('game_id');
    if (!header) {
        document.body.insertAdjacentHTML('afterbegin', `<h1 id="game_id">Game ID: ${gameId}</h1>`);
    } else {
        header.textContent = `Game ID: ${gameId}`;
    }
}

const loadAssets = async () => {
    const assets = Object.entries(PIECE_FILES).reduce((acc, [key, value]) => {
        const img = document.createElement('img');
        img.src = `./${value}`;
        img.alt = PIECES[key];
        img.className = 'piece no-select';
        acc[key] = img;
        return acc;
    }, {});

    await Promise.all(Object.values(assets).map((img) => {
        return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });
    }));

    return assets;
};

const drawBoard = (container) => {
    if (!container) {
        throw new Error('Container not found');
    }

    let board = container.querySelector('#board');
    if (board) {
        container.removeChild(board);
    }

    board = document.createElement('table');
    board.id = 'board';

    for (let i = 0; i < 8; i++) {
        const row = document.createElement('tr');
        for (let j = 0; j < 8; j++) {
            const cell = document.createElement('td');
            cell.className = (i + j) % 2 === 0 ? 'white' : 'black';
            cell.dataset.algebraic = `${String.fromCharCode(97 + j)}${8 - i}`;
            row.appendChild(cell);
        }
        board.appendChild(row);
    }

    container.appendChild(board);

    return board;
}

const drawPieces = (board, assets, fen = DEFAULT_FEN) => {
    const rows = fen.split('/');
    for (let i = 0; i < 8; i++) {
        const row = rows[i];
        let col = 0;
        for (let j = 0; j < row.length; j++) {
            const char = row[j];
            if (isNaN(char)) {
                const cell = board.rows[i].cells[col];
                const img = assets[char].cloneNode(true);
                img.classList.add('piece');
                cell.appendChild(img);
                col++;
            } else {
                col += parseInt(char);
            }
        }
    }

    return board;
}

const isCastlingMove = (startSquare, endSquare) => {
    const castlingMoves = {
        'e1g1': true, // White kingside
        'e1c1': true, // White queenside
        'e8g8': true, // Black kingside
        'e8c8': true  // Black queenside
    };
    return castlingMoves[`${startSquare}${endSquare}`] || false;
};

const getRookCastlingSquares = (endSquare) => {
    const rookMoves = {
        'g1': { start: 'h1', end: 'f1' }, // White kingside
        'c1': { start: 'a1', end: 'd1' }, // White queenside
        'g8': { start: 'h8', end: 'f8' }, // Black kingside
        'c8': { start: 'a8', end: 'd8' }  // Black queenside
    };
    return rookMoves[endSquare] || null;
};

const movePiece = (board, startSquare, endSquare) => {
    const startCell = board.querySelector(`td[data-algebraic="${startSquare}"]`);
    const endCell = board.querySelector(`td[data-algebraic="${endSquare}"]`);
    const piece = startCell.querySelector('.piece');

    if (piece) {
        endCell.innerHTML = '';
        endCell.appendChild(piece);
    }
};

// New function to highlight the last move
const highlightLastMove = (board, move) => {
    // Remove previous highlights
    board.querySelectorAll('.highlight').forEach(cell => cell.classList.remove('highlight'));

    // Highlight new move
    const startSquare = move.substring(0, 2);
    const endSquare = move.substring(2, 4);

    const startCell = board.querySelector(`td[data-algebraic="${startSquare}"]`);
    const endCell = board.querySelector(`td[data-algebraic="${endSquare}"]`);

    if (startCell && endCell) {
        startCell.classList.add('highlight');
        endCell.classList.add('highlight');
    }
};

const addPieceEventListeners = (board) => {
    const pieces = board.querySelectorAll('.piece');
    pieces.forEach((img) => {
        let isDragging = false;
        let originalCell;

        const handleMouseDown = (e) => {
            isDragging = true;
            originalCell = img.parentElement;
            img.style.cursor = 'grabbing';
            img.style.position = 'absolute';
            img.style.zIndex = 1000;
            img.style.left = `${e.clientX - img.width / 2}px`;
            img.style.top = `${e.clientY - img.height / 2}px`;
        };

        const handleMouseMove = (e) => {
            if (isDragging) {
                img.style.left = `${e.clientX - img.width / 2}px`;
                img.style.top = `${e.clientY - img.height / 2}px`;
            }
        };

        const handleMouseUp = (e) => {
            if (isDragging) {
                isDragging = false;
                img.style.cursor = 'grab';
                img.style.position = 'static';
                img.style.zIndex = '';
                const targetElement = document.elementFromPoint(e.clientX, e.clientY);
                const cell = targetElement.closest('td');
                if (!cell) {
                    originalCell.appendChild(img);
                    return;
                }
                const startSquare = originalCell.dataset.algebraic;
                const endSquare = cell.dataset.algebraic;
                const move = `${startSquare}${endSquare}`;
                const validMoves = getValidMoves();

                if (!validMoves.includes(move)) {
                    console.log("Invalid move ", move);
                    console.log("Valid moves", validMoves);
                    originalCell.appendChild(img);
                    return;
                }

                if (getCurrentPlayer() !== getColor()) {
                    console.log('Not your turn');
                    return;
                }

                movePiece(board, startSquare, endSquare);

                if (isCastlingMove(startSquare, endSquare)) {
                    const rookSquares = getRookCastlingSquares(endSquare);
                    if (rookSquares) {
                        movePiece(board, rookSquares.start, rookSquares.end);
                    }
                }

                sendMove(move);

                // Highlight the move
                highlightLastMove(board, move);
            }
        };

        img.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        img.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
    });
};

const handleOnMessage = (event) => {
    console.log('Message received:', event.data);
    const data = JSON.parse(event.data);

    const handlers = {
        initial: handleInitialMessage,
        move: handleMoveMessage,
        error: handleErrorMessage,
        gameover: handleGameOverMessage
    };

    const handler = handlers[data.type] || (() => console.warn(`Unhandled message type: ${data.type}`));
    handler(data.data);
};

const handleInitialMessage = (data) => {
    getColor = () => data.player[0];
    updateGameState(data.fen, data.moves);
    initializeBoard();
};

const handleMoveMessage = (data) => {
    updateGameState(data.fen, data.moves);
    const board = document.getElementById('board');
    console.log('Move:', data.move);
    movePiece(board, data.move.substring(0, 2), data.move.substring(2, 4));

    // Highlight the last move
    highlightLastMove(board, data.move);
};

const handleErrorMessage = (message) => {
    alert(message);
};

const handleGameOverMessage = () => {
    alert('Game Over');
};

const updateGameState = (fen, moves) => {
    getFen = () => fen;
    getCurrentPlayer = () => fen.split(' ')[1];
    getValidMoves = () => moves;
};

const initializeBoard = () => {
    const container = document.getElementById('container');
    const board = drawBoard(container);
    loadAssets().then((assets) => {
        drawPieces(board, assets);
        addPieceEventListeners(board);
    });
};

const makeSendMove = (ws) => {
    const sendMove = (move) => {
        if (getCurrentPlayer() !== getColor()) {
            console.log('Not your turn');
            return;
        }

        const msg = {
            type: 'move',
            data: move,
            player: getColor()
        }
        ws.send(JSON.stringify(msg));
    }

    return sendMove;
}
