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

/**
 * Load chess piece assets and create image elements for each piece.
 * 
 * @returns {Promise<Object<string, HTMLImageElement>>} A promise that resolves to an object with piece names as keys and image elements as values.
 */
const loadAssets = async () => {
    // Convert PIECE_FILES entries to an array of key-value pairs
    const assets = Object.entries(PIECE_FILES).reduce((acc, [key, value]) => {
        const img = document.createElement('img');
        img.src = `./${value}`;
        img.alt = PIECES[key];
        img.className = 'piece no-select';
        acc[key] = img; // Store the image element in the accumulator
        return acc;
    }, {});

    // Wait for all images to load
    await Promise.all(Object.values(assets).map((img) => {
        return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });
    }));

    return assets; // Return the assets object when all images are loaded
};


/**
  * Draw the chess board in the given container
  * @param {HTMLElement} container - The container to draw the board in
  * @return {HTMLTableElement} The board element
  */
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

/**
 * Draw the pieces on the board
 * @param {HTMLTableElement} board - The container to draw the pieces in
 * @param {Object<string, HTMLImageElement>} assets - The assets object with piece names as keys and image elements as values
 * @param {string} fen - The FEN string representing the board state
 * @return {HTMLTableElement} The board element
 */
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
                img.classList.add('piece');  // Ensure pieces have the 'piece' class
                cell.appendChild(img);
                col++;
            } else {
                col += parseInt(char);
            }
        }
    }

    return board;
}

/**
 * Check if a move is a castling move
 * @param {string} startSquare - The starting square of the move
 * @param {string} endSquare - The ending square of the move
 * @return {boolean} True if the move is a castling move, false otherwise
 */
const isCastlingMove = (startSquare, endSquare) => {
    const castlingMoves = {
        'e1g1': true, // White kingside
        'e1c1': true, // White queenside
        'e8g8': true, // Black kingside
        'e8c8': true  // Black queenside
    };
    return castlingMoves[`${startSquare}${endSquare}`] || false;
};

/**
 * Get the rook's start and end positions for a castling move
 * @param {string} endSquare - The king's end square
 * @return {Object} An object containing the rook's start and end squares
 */
const getRookCastlingSquares = (endSquare) => {
    const rookMoves = {
        'g1': { start: 'h1', end: 'f1' }, // White kingside
        'c1': { start: 'a1', end: 'd1' }, // White queenside
        'g8': { start: 'h8', end: 'f8' }, // Black kingside
        'c8': { start: 'a8', end: 'd8' }  // Black queenside
    };
    return rookMoves[endSquare] || null;
};

/**
 * Move a piece on the board
 * @param {HTMLTableElement} board - The chess board
 * @param {string} startSquare - The starting square
 * @param {string} endSquare - The ending square
 */
const movePiece = (board, startSquare, endSquare) => {
    const startCell = board.querySelector(`td[data-algebraic="${startSquare}"]`);
    const endCell = board.querySelector(`td[data-algebraic="${endSquare}"]`);
    const piece = startCell.querySelector('.piece');

    if (piece) {
        endCell.innerHTML = '';
        endCell.appendChild(piece);
    }
};


/**
 * Add event listeners to the board
 * @param {HTMLTableElement} board - The board element
 */
const addPieceEventListeners = (board) => {
    // Add event listeners to pieces
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

                // Handle regular move
                movePiece(board, startSquare, endSquare);

                // Handle castling
                if (isCastlingMove(startSquare, endSquare)) {
                    const rookSquares = getRookCastlingSquares(endSquare);
                    if (rookSquares) {
                        movePiece(board, rookSquares.start, rookSquares.end);
                    }
                }

                sendMove(move);
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



/**
 * Handle the 'message' event from the WebSocket connection
 * @param {MessageEvent} event - The message event
 */
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
    // if (getCurrentPlayer() !== getColor()) {
    //     return
    // }
    const board = document.getElementById('board');
    console.log('Move:', data.move);
    movePiece(board, data.move.substring(0, 2), data.move.substring(2, 4));
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

/**
 * Create a function that sends a move to the server.
 * @param {WebSocket} ws - The WebSocket connection.
 * @return {Function} A function that sends a move to the server.
 */
const makeSendMove = (ws) => {

    /**
     * Send a move to the server.
     * @param {string} move - The move to send.
     * @return {void}
     */
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
