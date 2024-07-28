const WHITE_CELL_COLOR = '#EBECD0';
const BLACK_CELL_COLOR = '#779556';
const HIGHLIGHT_CELL_COLOR = '#ED7E6A';

// converts a position string like 'b8' to an array index like [1, 0]
// param {string} position - The position string to convert
// returns {Array<number>} - The array index
function positionToIndex(position) {
    if (position.length !== 2) {
        return [null, null];
    }

    return [
        position.charCodeAt(0) - 'a'.charCodeAt(0),
        8 - parseInt(position[1])
    ];
}

// converts an array index like [1, 0] to a position string like 'b8'
// param {Array<number>} index - The array index to convert
// returns {string} - The position string
function indexToPosition(index) {
    return String.fromCharCode('a'.charCodeAt(0) + index[0]) + (8 - index[1]);
}


// Check if a move is valid
// param {string} move - The move to check
// param {Set<string>} validMoves - The set of valid moves
function isValidMove(move, validMoves) {
    return validMoves.has(move);
}

// Convert a FEN string to a 2D array representing the board
// param {string} fen - The FEN string to convert
// returns {Array<Array<string>>} - A 2D array representing the board
function fenToBoard(fen) {
    // Split the FEN string into its constituent parts
    let parts = fen.split(' ');
    let boardPart = parts[0];

    // Split the board part by rows
    let rows = boardPart.split('/');

    // Initialize the board array
    let board = [];

    // Process each row
    rows.forEach(row => {
        let boardRow = [];
        for (let char of row) {
            if (isNaN(char)) {
                // If the character is a piece, add it to the row
                boardRow.push(char);
            } else {
                // If the character is a number, add that many empty squares to the row
                for (let i = 0; i < parseInt(char); i++) {
                    boardRow.push('');
                }
            }
        }
        // Add the processed row to the board
        board.push(boardRow);
    });

    return board;
}

// Convert a 2D array representing the board to a FEN string
// param {Array<Array<string>>} board - The 2D array representing the board
// returns {string} - The FEN string
function boardToFen(board) {
    let fen = '';
    for (let row of board) {
        let fenRow = '';
        let emptyCount = 0;
        for (let square of row) {
            if (square === '') {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    fenRow += emptyCount;
                    emptyCount = 0;
                }
                fenRow += square;
            }
        }
        if (emptyCount > 0) {
            fenRow += emptyCount;
        }
        fen += fenRow + '/';
    }
    return fen.slice(0, -1);
}


const renderChessBoard = (function() {
    const pieceImages = {
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
        'P': 'pawn-w.svg'
    };

    const pieceImageElements = {};
    let imagesLoaded = false;

    // Load the piece images
    for (const [piece, src] of Object.entries(pieceImages)) {
        const img = new Image();
        img.src = src;
        pieceImageElements[piece] = img;
    }

    // Wait for all images to load
    const imageLoadPromise = Promise.all(Object.values(pieceImageElements).map(img => {
        return new Promise(resolve => {
            img.onload = resolve;
        });
    })).then(() => {
        imagesLoaded = true;
    });

    return function renderChessBoard(elementID, fen, handleMoveCallback, legalMovesSet) {
        const canvas = document.getElementById(elementID);
        const ctx = canvas.getContext('2d');

        if (!fen) {
            fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
        }
        const board = fenToBoard(fen);
        const boardSize = board.length;
        const cellSize = 80;
        const boardWidth = cellSize * boardSize;
        const boardHeight = cellSize * boardSize;

        canvas.width = boardWidth;
        canvas.height = boardHeight;


        // Draw the board
        let boardDrawn = false;
        function drawBoard() {
            if (boardDrawn) {
                return;
            }
            for (let i = 0; i < boardSize; i++) {
                for (let j = 0; j < boardSize; j++) {
                    if ((i + j) % 2 === 0) {
                        ctx.fillStyle = WHITE_CELL_COLOR;
                    } else {
                        ctx.fillStyle = BLACK_CELL_COLOR;
                    }
                    ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
                    if (board[j][i] !== '') {
                        const piece = pieceImageElements[board[j][i]];
                        ctx.drawImage(piece, i * cellSize, j * cellSize, cellSize, cellSize);
                    }
                }
            }
            boardDrawn = true;
        }

        function drawPieces() {
            for (let i = 0; i < boardSize; i++) {
                for (let j = 0; j < boardSize; j++) {
                    if (board[j][i] !== '') {
                        const piece = pieceImageElements[board[j][i]];
                        ctx.drawImage(piece, i * cellSize, j * cellSize, cellSize, cellSize);
                    }
                }
            }
        }

        // Arrow drawing logic
        let arrowStart = null;

        function drawArrow(from, to) {
            const headlen = 10; // length of head in pixels
            const angle = Math.atan2(to.y - from.y, to.x - from.x);

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 5;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(to.x, to.y);
            ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 6), to.y - headlen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(to.x - headlen * Math.cos(angle + Math.PI / 6), to.y - headlen * Math.sin(angle + Math.PI / 6));
            ctx.lineTo(to.x, to.y);
            ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 6), to.y - headlen * Math.sin(angle - Math.PI / 6));
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 5;
            ctx.stroke();
            ctx.fillStyle = 'red';
            ctx.fill();
        }

        function drawLine(from, to) {
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 5;
            ctx.stroke();
        }

        function getGridPosition(event) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            return {
                x: Math.floor(x / cellSize) * cellSize + cellSize / 2,
                y: Math.floor(y / cellSize) * cellSize + cellSize / 2
            };
        }

        function isValidKnightMove(start, end) {
            const dx = Math.abs(end.x - start.x) / cellSize;
            const dy = Math.abs(end.y - start.y) / cellSize;
            return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
        }


        let highlightedSquares = new Set();
        // Draw a red square around the given position
        // param {Object} pos - The position to highlight
        function drawHighlightSquare(pos) {
            const row = Math.floor(pos.y / cellSize);
            const col = Math.floor(pos.x / cellSize);
            const piece = board[row][col];
            const rowcolString = indexToPosition([row, col]);

            if (highlightedSquares.has(rowcolString)) {
                highlightedSquares.delete(rowcolString);
                if ((row + col) % 2 === 0) {
                    ctx.fillStyle = WHITE_CELL_COLOR;
                }
                else {
                    ctx.fillStyle = BLACK_CELL_COLOR;
                }
                ctx.fillRect(row * cellSize, col * cellSize, cellSize, cellSize);
                return;
            }

            ctx.fillStyle = HIGHLIGHT_CELL_COLOR;
            ctx.fillRect(pos.x - cellSize / 2, pos.y - cellSize / 2, cellSize, cellSize);
            if (piece !== '') {
                const piece = pieceImageElements[board[row][col]];
                ctx.drawImage(piece, col * cellSize, row * cellSize, cellSize, cellSize);
            }
            highlightedSquares.add(rowcolString);
        }

        function drawKnightMoveArrow(start, end) {
            // Calculate the change in x and y
            const dx = end.x - start.x;
            const dy = end.y - start.y;

            // Calculate the midpoints based on the knight's move
            let mid = { x: start.x, y: start.y };

            if (Math.abs(dx) === 2 * cellSize && Math.abs(dy) === cellSize) {
                // Move is 2 cells horizontally and 1 cell vertically
                mid.x = start.x + dx;
                mid.y = start.y;
            } else if (Math.abs(dx) === cellSize && Math.abs(dy) === 2 * cellSize) {
                // Move is 1 cell horizontally and 2 cells vertically
                mid.x = start.x;
                mid.y = start.y + dy;
            }

            // Draw the "L" shape by connecting the start to the midpoint, and then the midpoint to the end
            drawLine(start, mid);
            drawArrow(mid, end);
        }

        let moveStart = null;
        canvas.addEventListener('mousedown', (event) => {
            if (event.button === 0) { // Left click only
                moveStart = getGridPosition(event);
            }
            if (event.button === 2) { // Right click only
                arrowStart = getGridPosition(event);
            }
        });

        document.addEventListener('keyup', (event) => {
            if (event.code === 'Escape') {
                console.log('Escape key pressed');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawBoard();
                drawPieces();
                moveStart = null;
                arrowStart = null;
            }
        })

        canvas.addEventListener('mouseup', (event) => {
            if (event.button === 0) {
                const moveEnd = getGridPosition(event);

                if (moveStart.x === moveEnd.x && moveStart.y === moveEnd.y) {
                    drawHighlightSquare(moveStart);
                    moveStart = null;
                    return;
                }

                const startCol = Math.floor(moveStart.x / cellSize);
                const startRow = Math.floor(moveStart.y / cellSize);
                const endCol = Math.floor(moveEnd.x / cellSize);
                const endRow = Math.floor(moveEnd.y / cellSize);

                handleMove(startCol, startRow, endCol, endRow);
            }

            if (event.button === 2) { // Right click only
                const arrowEnd = getGridPosition(event);

                if (arrowStart.x === arrowEnd.x && arrowStart.y === arrowEnd.y) {
                    drawHighlightSquare(arrowStart);
                    arrowStart = null;
                    return;
                }

                if (arrowStart && isValidKnightMove(arrowStart, arrowEnd)) {
                    drawKnightMoveArrow(arrowStart, arrowEnd);
                } else if (arrowStart) {
                    drawArrow(arrowStart, arrowEnd);
                }
                arrowStart = null;
            }
        });

        // Prevent the context menu from appearing on right-click
        canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        function handleMove(startCol, startRow, endCol, endRow) {
            const move = indexToPosition([startCol, startRow]) + indexToPosition([endCol, endRow]);
            if (!legalMovesSet.has(move)) {
                console.log('Invalid move:', move, 'not in', legalMovesSet);
                return;
            }

            const piece = board[startRow][startCol];
            board[startRow][startCol] = '';
            board[endRow][endCol] = piece;

            drawBoard();
            drawPieces();
            moveStart = null;
            handleMoveCallback(move);
        }

        if (imagesLoaded) {
            drawBoard()
            drawPieces();
        } else {
            imageLoadPromise.then(() => {
                drawBoard();
                drawPieces()
            });
        }
    };
})();



function handleGetGame(e) {
    e.preventDefault()
    fetch('/game')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); // Call the function to parse the response as JSON
        })
        .then(data => {
            const ws = new WebSocket("ws://localhost:8080/game/" + encodeURIComponent(data.game_id));
            console.log(data.game_id);

            ws.addEventListener("open", (e) => {
                console.log("Connection established");
            });

            ws.addEventListener("message", (e) => {
                const data = JSON.parse(e.data);
                console.log(data)
                switch (data.type) {
                    case "move":
                        renderChessBoard("chessBoard",
                            data.fen,
                            function(move) {
                                console.log(move)
                                ws.send(JSON.stringify({
                                    type: "move",
                                    data: move
                                }));
                            },
                            new Set(data.valid_moves)
                        );
                        break;
                    case "error":
                        alert(data.message);
                        break;
                }
            });

            ws.addEventListener("error", (e) => {
                console.error("WebSocket error", e);
            });

            ws.addEventListener("close", (e) => {
                console.log("WebSocket connection closed", e);
            });

        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
}
