const miCanvas = document.getElementById('miCanvas'); // Nos permite obtener una referencia de nuestro elemento canvas
const contexto = miCanvas.getContext('2d'); //
const tamaño = 20;
const totalCasillas = miCanvas.width / tamaño * miCanvas.height / tamaño;
const juego = {
    mapa: [],
    serpiente: [],
    comida: null,
    direccion: 'derecha',
    camino: [],
    puntaje: 1,
    mejorPuntaje: 1,
    colaAnterior: null,
    juegaIA: true,
    esCaminoEstirado: false,
    esCaminoGanador: false,
};

inicializarJuego();
let intervaloId = null;
intervaloId = setInterval(moverSerpiente, 20);

const velocidadInput = document.getElementById('velocidad');
velocidadInput.addEventListener('input', () => {
    clearInterval(intervaloId);
    const nuevaVelocidad = velocidadInput.value;
    intervaloId = setInterval(moverSerpiente, nuevaVelocidad);
});

function inicializarJuego() {
    juego.mapa = inicializarGrafo();
    juego.serpiente = []
    juego.serpiente.push(juego.mapa[0][0]);
    juego.comida = generarComida();
    juego.direccion = 'derecha';
    juego.camino = [];
    juego.puntaje = 1;
    juego.mejorPuntaje = 1;
    juego.colaAnterior = null;
    juego.juegaIA = true;
    juego.esCaminoEstirado = false;
    juego.esCaminoGanador = false;
    dibujar();
    actualizarPuntaje();
}

function inicializarGrafo() {
    const grafo = [];
    for (let x = 0; x < miCanvas.width; x += tamaño) {
        grafo[x] = [];
        for (let y = 0; y < miCanvas.height; y += tamaño) {
            const nodo = { x, y, vecinos: [] };
            grafo[x][y] = nodo;
            if (x > 0) {
                nodo.vecinos.push(grafo[x - tamaño][y]);
                grafo[x - tamaño][y].vecinos.push(nodo);
            }
            if (y > 0) {
                nodo.vecinos.push(grafo[x][y - tamaño]);
                grafo[x][y - tamaño].vecinos.push(nodo);
            }
        }
    }
    return grafo;
}

function generarComida() {
    let nodoRandom;
    do {
        const x = getCoordenadaRandom(miCanvas.width);
        const y = getCoordenadaRandom(miCanvas.height);
        nodoRandom = juego.mapa[x][y];
    } while (estaEnSerpiente(juego.serpiente, nodoRandom));
    return nodoRandom;
}

function getCoordenadaRandom(tamañoCanvas) {
    return tamaño * Math.floor(Math.random() * (tamañoCanvas / tamaño));
}

function estaEnSerpiente(serpiente, nodo) {
    return serpiente.some((parteCuerpo) => sonIguales(parteCuerpo, nodo));
}

function moverSerpiente() {
    obtenerCamino();
    juego.juegaIA && obtenerDireccion();
    const { x, y } = obtenerCoordenadasNuevaCabeza();
    if (hayColision(x, y)) {
        console.log({ direccion: juego.direccion });
        detenerJuego();
        return
    }
    actualizarSerpiente(x, y);
    dibujar();
}

function obtenerCoordenadasNuevaCabeza() {
    const cabeza = juego.serpiente[0];
    let x = cabeza.x;
    let y = cabeza.y;

    switch (juego.direccion) {
        case 'izquierda':
            x -= tamaño;
            break;
        case 'arriba':
            y -= tamaño;
            break;
        case 'derecha':
            x += tamaño;
            break;
        case 'abajo':
            y += tamaño;
            break;
    }
    return { x, y };
}

function obtenerCamino() {
    const cabeza = juego.serpiente[0];
    let caminoEncontrado;
    let tamañoSerpiente = juego.serpiente.length;
    if (!juego.esCaminoGanador) {
        caminoEncontrado = dijkstra(cabeza, juego.comida, juego.serpiente);
        if (!esCaminoSeguro(caminoEncontrado)) {
            if (juego.esCaminoEstirado) {
                juego.camino.push(juego.colaAnterior);
                estirarCamino(juego.camino);
                caminoEncontrado = dfsCaminoLargo(cabeza, juego.colaAnterior, juego.serpiente);
                const caminoEstirado = estirarCamino(caminoEncontrado.slice());
                if (caminoEstirado.length > juego.camino.length) {
                    juego.camino = caminoEstirado;
                }
            } else {
                caminoEncontrado = dfsCaminoLargo(cabeza, juego.colaAnterior, juego.serpiente);
                if (juego.comida && estaEnBordeDelMapa(juego.comida)) {
                    estirarCamino(caminoEncontrado);
                    juego.esCaminoEstirado = true;
                } else {
                    juego.esCaminoEstirado = false;
                }
                juego.camino = caminoEncontrado;
            }
        } else {
            juego.esCaminoEstirado = false;
            juego.camino = caminoEncontrado;
        }
    } else {
        if (juego.comida && !sonIguales(juego.camino?.[1], juego.comida)) {
            juego.camino.push(juego.colaAnterior);
        } else {
            tamañoSerpiente++
        }
    }
    if (juego.camino && juego.camino.length <= 1) {
        juego.camino.push(juego.serpiente[juego.serpiente.length - 1]);
    }
    if (juego.serpiente.length > totalCasillas * 0.70) {
        juego.esCaminoGanador = (juego.camino.length + tamañoSerpiente - 1) === totalCasillas;
    }
}

function obtenerDireccion() {
    const cabeza = juego.serpiente[0];
    // Si encontramos un camino, movemos la serpiente hacia el siguiente nodo del camino
    const siguiente = juego.camino[1];
    if (siguiente.x < cabeza.x) {
        juego.direccion = 'izquierda';
    } else if (siguiente.x > cabeza.x) {
        juego.direccion = 'derecha';
    } else if (siguiente.y < cabeza.y) {
        juego.direccion = 'arriba';
    } else if (siguiente.y > cabeza.y) {
        juego.direccion = 'abajo';
    }
}

function esCaminoSeguro(camino) {
    if (juego.serpiente.length <= 1) {
        return true
    }
    if (camino && camino.length > 0) {
        const serpienteCopia = juego.serpiente.slice();
        const colaAnterior = moverSerpientePorCamino(serpienteCopia, camino.slice());
        const caminoACola = dijkstra(serpienteCopia[0], colaAnterior, serpienteCopia);
        return !!caminoACola;
    }
    return false;
}

function moverSerpientePorCamino(serpienteCopia, camino) {
    let colaAnterior = juego.colaAnterior;
    for (let i = 1; i < camino.length; i++) {
        const nuevaCabeza = camino[i];
        serpienteCopia.unshift(nuevaCabeza);
        if (i !== camino.length - 1) {
            colaAnterior = serpienteCopia.pop();
        }
    }
    return colaAnterior;
}

function dijkstra(inicio, fin, serpiente) {
    const cola = [inicio];
    const distancias = { [inicio.x]: { [inicio.y]: 0 } };
    const visitados = new Set();
    while (cola.length > 0) {
        const nodoActual = cola.shift();
        visitados.add(nodoActual);
        if (sonIguales(nodoActual, fin)) {
            // Se ha encontrado la comida, construir el camino
            const camino = construirCamino(inicio, nodoActual, distancias);
            return camino;
        }
        agregarVecinosNoVisitados(cola, visitados, distancias, nodoActual, serpiente);
    }
    // No se ha encontrado el camino a la comida
    return null;
}

function agregarVecinosNoVisitados(cola, visitados, distancias, nodoActual, serpiente) {
    nodoActual.vecinos.forEach(vecino => {
        if (!visitados.has(vecino) && !estaEnSerpiente(serpiente, vecino)) {
            agregarVecinoConDistancia(cola, distancias, nodoActual, vecino);
        }
    });
}

function agregarVecinoConDistancia(cola, distancias, nodoActual, vecino) {
    const distanciaActual = distancias[nodoActual.x][nodoActual.y];
    let nuevaDistancia = distanciaActual + 200;
    if (distancias[vecino.x]?.[vecino.y] == null || nuevaDistancia < distancias[vecino.x][vecino.y]) {
        distancias[vecino.x] = { ...distancias[vecino.x], [vecino.y]: nuevaDistancia };
        cola.push(vecino);
    }
}

function construirCamino(inicio, nodoFinal, distancias) {
    const camino = [nodoFinal];
    let nodoActual = nodoFinal;
    while (!sonIguales(nodoActual, inicio)) {
        const vecino = encontrarVecinoConMenorDistancia(distancias, nodoActual);
        camino.unshift(vecino);
        nodoActual = vecino;
    }
    return camino;
}

function encontrarVecinoConMenorDistancia(distancias, nodo) {
    let vecinoConMenorDistancia = null;
    for (const vecino of nodo.vecinos) {
        if (distancias[vecino.x]?.[vecino.y] != null) {
            if (vecinoConMenorDistancia == null || distancias[vecino.x][vecino.y] < distancias[vecinoConMenorDistancia.x][vecinoConMenorDistancia.y]) {
                vecinoConMenorDistancia = vecino;
            }
        }
    }
    return vecinoConMenorDistancia;
}

function estaEnBordeDelMapa(nodo) {
    return nodo.x === 0 || nodo.y === 0 || nodo.x === juego.mapa.length - 1 || nodo.y === juego.mapa[0].length - 1;
}

function estaEnEsquinaDelMapa(nodo) {
    const esBordeHorizontal = nodo.x === 0 || nodo.x === juego.mapa.length - 1;
    const esBordeVertical = nodo.y === 0 || nodo.y === juego.mapa[0].length - 1;
    return esBordeHorizontal && esBordeVertical;
}

function dfsCaminoLargo(cabeza, cola, serpiente) {
    const visitados = new Set();
    const camino = [];
    function dfs(nodoActual) {
        visitados.add(nodoActual);
        if (sonIguales(nodoActual, cola)) {
            camino.push(nodoActual);
            return true;
        }
        for (let vecino of nodoActual.vecinos) {
            if (!visitados.has(vecino) && !estaEnSerpiente(serpiente, vecino)) {
                if (dfs(vecino)) {
                    camino.push(nodoActual);
                    return true;
                }
            }
        }
        return false;
    }
    dfs(cabeza);
    return camino.reverse();
}

function dfsCaminoMasLargo(cabeza, cola, serpiente) {
    let caminoActual = [];
    let caminoMasLargo = [];
    const visitados = new Set();
    function dfs(nodoActual) {
        visitados.add(nodoActual);
        caminoActual.push(nodoActual);
        if (sonIguales(nodoActual, cola)) {
            if (caminoActual.length >= caminoMasLargo.length) {
                caminoMasLargo = caminoActual.slice();
            }
        } else {
            for (let vecino of nodoActual.vecinos) {
                if (!visitados.has(vecino) && !estaEnSerpiente(serpiente, vecino)) {
                    dfs(vecino);
                }
            }
        }
        caminoActual.pop();
        visitados.delete(nodoActual);
    }

    dfs(cabeza);
    return caminoMasLargo;
}

function hayColision(x, y) {
    return x < 0 ||
        x > miCanvas.width - tamaño ||
        y < 0 || y > miCanvas.height - tamaño ||
        (estaEnSerpiente(juego.serpiente.slice(1, -1), juego.mapa[x][y]));
}

function detenerJuego() {
    const condicionVictoria = totalCasillas === juego.serpiente.length;
    if (condicionVictoria) {
        console.log('Ganaste!');
        juego.comida = null;
    } else {
        console.log('Perdiste');
    }
    if (intervaloId) {
        clearInterval(intervaloId);
        actualizarPuntaje();
    }
}

function actualizarSerpiente(x, y) {
    const nuevaCabeza = juego.mapa[x][y];
    juego.serpiente.unshift(nuevaCabeza);
    if (juego.comida && sonIguales(nuevaCabeza, juego.comida)) {
        const condicionVictoria = totalCasillas === juego.serpiente.length;
        if (!condicionVictoria) {
            juego.comida = generarComida();
        } else {
            juego.comida = null;
        }
        juego.puntaje++;
    } else {
        juego.colaAnterior = juego.serpiente.pop();
    }
}

function sonIguales(nodoA, nodoB) {
    return !nodoA || !nodoB || nodoA.x === nodoB.x && nodoA.y === nodoB.y
}

function actualizarPuntaje() {
    if (typeof (Storage) !== 'undefined') {
        const mejorPuntaje = localStorage.getItem('mejorPuntaje');
        if (mejorPuntaje !== null) {
            juego.mejorPuntaje = parseInt(mejorPuntaje);
            document.getElementById('mejor-puntaje').innerHTML = juego.mejorPuntaje;
            localStorage.setItem('mejorPuntaje', juego.mejorPuntaje.toString());
        }
        if (juego.puntaje > mejorPuntaje) {
            juego.mejorPuntaje = juego.puntaje;
            localStorage.setItem('mejorPuntaje', juego.mejorPuntaje.toString());
        }
    } else {
        console.log('localStorage no está disponible');
    }
}

function dibujar() {
    contexto.clearRect(0, 0, miCanvas.width, miCanvas.height);
    juego.comida && dibujarNodo(juego.comida, 'red', 0);
    dibujarSerpiente();
    dibujarCamino(juego.camino, 'blue');
    juego.camino.shift();
    document.getElementById('puntaje').innerHTML = juego.puntaje;
}

function dibujarNodo(nodo, color, tamañoCirculo) {
    contexto.fillStyle = color;
    contexto.beginPath();
    contexto.arc(nodo.x + tamaño / 2, nodo.y + tamaño / 2, tamaño / 2 - tamañoCirculo, 0, Math.PI * 2);
    contexto.fill();
}

function dibujarSerpiente() {
    // Dibujar la cabeza de la serpiente con borde
    contexto.fillStyle = 'lightgreen';
    contexto.lineJoin = 'round'; // estilo del borde
    const cabeza = juego.serpiente[0];
    contexto.beginPath();
    contexto.arc(cabeza.x + tamaño / 2, cabeza.y + tamaño / 2, tamaño / 2, 0, Math.PI * 2);
    contexto.fill();

    // Dibujar el cuerpo de la serpiente como una línea con borde
    contexto.strokeStyle = 'lightgreen';
    contexto.lineWidth = tamaño - 4; // grosor de la línea
    contexto.lineCap = 'round';
    contexto.beginPath();
    contexto.lineTo(juego.serpiente[0].x + tamaño / 2, juego.serpiente[0].y + tamaño / 2);
    for (let i = 1; i < juego.serpiente.length; i++) {
        const distancia = Math.hypot(
            juego.serpiente[i].x - juego.serpiente[i - 1].x,
            juego.serpiente[i].y - juego.serpiente[i - 1].y
        );
        if (distancia < tamaño) {
            continue;
        }
        contexto.lineTo(juego.serpiente[i].x + tamaño / 2, juego.serpiente[i].y + tamaño / 2);
    }
    contexto.stroke();
}

function dibujarCamino(camino, color) {
    if (!camino || !camino.length === 0) {
        return
    }
    contexto.strokeStyle = color;
    contexto.lineWidth = 4;
    contexto.lineCap = 'round';
    contexto.beginPath();
    for (let i = 1; i < camino.length; i++) {
        const distancia = Math.hypot(
            camino[i].x - camino[i - 1].x,
            camino[i].y - camino[i - 1].y
        );
        if (distancia < tamaño) {
            continue;
        }
        contexto.lineTo(camino[i].x + tamaño / 2, camino[i].y + tamaño / 2);
    }
    contexto.stroke();
}

document.addEventListener('keydown', controles);

function controles(event) {
    if (event) {
        switch (event.key) {
            case 'ArrowUp':
                establecerDireccionJuego('arriba');
                break;
            case 'ArrowDown':
                establecerDireccionJuego('abajo');
                break;
            case 'ArrowLeft':
                establecerDireccionJuego('izquierda');
                break;
            case 'ArrowRight':
                establecerDireccionJuego('derecha');
                break;
            case ' ':
                detenerJuego();
                break;
            case 'f':
                juego.juegaIA = !juego.juegaIA;
                break;
            default:
                break;
        }
    }
}

function establecerDireccionJuego(direccion) {
    if (!juego.juegaIA) {
        juego.direccion = direccion;
    }
}

function estirarCamino(camino) {
    let alargueCamino = false;
    for (let i = 0; i < camino.length - 1; i++) {
        let nodo1 = camino[i];
        let nodo2 = camino[i + 1];

        for (let vecino1 of nodo1.vecinos) {
            for (let vecino2 of nodo2.vecinos) {
                if (
                    !estaEnCamino(vecino1, camino) &&
                    !estaEnCamino(vecino2, camino) &&
                    !estaEnSerpiente(juego.serpiente, vecino1) &&
                    !estaEnSerpiente(juego.serpiente, vecino2) &&
                    sonVecinos(vecino1, vecino2)
                ) {
                    camino.splice(i + 1, 0, vecino1);
                    camino.splice(i + 2, 0, vecino2);
                    nodo1 = vecino1;
                    nodo2 = vecino2;
                    vecinosNodo1 = vecino1.vecinos;
                    vecinosNodo2 = vecino2.vecinos;
                    alargueCamino = true;
                }
            }
        }
        if (alargueCamino) {
            i--;
            alargueCamino = false;
        }
    }

    return camino;
}

function sonVecinos(nodo1, nodo2) {
    return nodo1.vecinos.includes(nodo2) || nodo2.vecinos.includes(nodo1);
}

function estaEnCamino(nodo, camino) {
    return camino.some(caminoNodo => sonIguales(nodo, caminoNodo));
}

