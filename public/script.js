/**
 * @file script.js
 * @author Teravla
 * @link https://github.com/Teravla/astar
 * @license CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)
 * 
 * Ce fichier contient le code JavaScript pour le module de la carte.
 * 
 */


/**
 * @module MapModule
 * 
 * Ce module initialise une carte Leaflet centrée sur Genté et permet de récupérer 
 * les données géographiques à partir de l'API Overpass.
 */
var map = L.map('map', {center: [45.63184490951869, -0.3110564244276566], zoom: 13});


/**
 * Ajoute un calque de tuiles OpenStreetMap à la carte.
 * 
 * @type {L.TileLayer}
 */
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);


/** 
 * Marqueur pour le point de départ.
 * @type {L.Marker}
 */
var startMarker;


/** 
 * Marqueur pour le point d'arrivée.
 * @type {L.Marker}
 */
var endMarker;


/**
 * Tableau pour stocker les nœuds de la carte.
 * @type {Array<L.LatLng>}
 */
var nodes = []; 


/**
 * Tableau pour stocker les segments de la carte.
 * @type {Array<Array<L.LatLng>>}
 */
var lines = []; 


/**
 * Fonction asynchrone pour interroger l'API Overpass et récupérer les nœuds et segments.
 * 
 * Cette fonction construit une requête pour récupérer les voies de circulation dans la 
 * zone nommée "Genté" et appelle l'API Overpass. Les données récupérées sont ensuite 
 * passées à la fonction `drawGraph` pour les dessiner sur la carte.
 * 
 * @async
 * @function getGraphData
 * @returns {Promise<void>} 
 * 
 * @throws {Error} Si une erreur se produit lors de la requête API.
 */
async function getGraphData() {
    const query = `
        [out:json];
        area["name"="Genté"]->.searchArea;
        (way["highway"](area.searchArea););
        out geom;
    `;

    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `data=${encodeURIComponent(query)}`
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la requête Overpass');
        }

        const data = await response.json();
        drawGraph(data);
    } catch (error) {
        console.error('Erreur:', error);
    }
}


/**
 * Dessine le graphe sur la carte en utilisant les données fournies.
 * 
 * Cette fonction construit le graphe à partir des données récupérées de l'API Overpass, 
 * puis dessine les nœuds et les segments sur la carte. Les segments sont dessinés 
 * sous forme de polylignes et les nœuds sous forme de cercles.
 * 
 * @function drawGraph
 * @param {Object} data - Les données géométriques récupérées de l'API Overpass.
 * @param {Array} data.elements - Un tableau d'éléments géométriques, où chaque élément 
 * représente une voie ou un segment.
 * @param {Object} way - Un élément de la collection, représentant une voie.
 * @param {Array} way.geometry - Les coordonnées géographiques de la voie.
 * @param {number} way.geometry[].lat - La latitude d'un point sur la voie.
 * @param {number} way.geometry[].lon - La longitude d'un point sur la voie.
 * 
 * @returns {void} 
 * 
 */
function drawGraph(data) {
    // Construire le graphe
    buildGraph(data);
    
    // Dessiner les nœuds et segments sur la carte comme auparavant
    data.elements.forEach(way => {
        if (way.geometry) {
            const nodesCoords = way.geometry.map(geo => [geo.lat, geo.lon]);
            const line = L.polyline(nodesCoords, { color: 'blue' }).addTo(map);
            lines.push(nodesCoords);

            nodesCoords.forEach(node => {
                L.circleMarker(node, {
                    radius: 5,
                    fillColor: 'red',
                    color: 'red',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 1
                }).addTo(map);
                nodes.push(node);
            });
        }
    });
}


/**
 * Calcule la distance entre deux coordonnées géographiques.
 *
 * Cette fonction utilise les coordonnées des deux points donnés 
 * pour calculer la distance en pixels sur la carte.
 *
 * @function getDistance
 * @param {L.LatLng} latlng1 - Le premier point de coordonnées géographiques.
 * @param {L.LatLng} latlng2 - Le deuxième point de coordonnées géographiques.
 * @returns {number} La distance en pixels entre les deux points.
 *
 */
function getDistance(latlng1, latlng2) {
    return map.latLngToLayerPoint(latlng1).distanceTo(map.latLngToLayerPoint(latlng2));
}


/**
 * Trouve le nœud ou le point sur une arête le plus proche d'un point cliqué.
 *
 * Cette fonction compare la distance d'un point cliqué avec tous les nœuds
 * et les points des segments disponibles pour déterminer le point le plus proche.
 *
 * @function findClosestPoint
 * @param {L.LatLng} clickedPoint - Le point cliqué sur la carte.
 * @returns {L.LatLng|null} Le nœud le plus proche ou le point sur une arête, ou null s'il n'y a pas de point proche.
 *
 */
function findClosestPoint(clickedPoint) {
    let closestNode = null;
    let closestDistance = Infinity;

    // Vérifier chaque nœud
    nodes.forEach(node => {
        const distance = getDistance(clickedPoint, L.latLng(node));
        if (distance < closestDistance) {
            closestDistance = distance;
            closestNode = L.latLng(node);
        }
    });

    let closestLinePoint = null;
    closestDistance = Infinity;

    // Vérifier chaque segment
    lines.forEach(line => {
        for (let i = 0; i < line.length - 1; i++) {
            const pointA = L.latLng(line[i]);
            const pointB = L.latLng(line[i + 1]);
            const projectedPoint = projectPointOnLine(clickedPoint, pointA, pointB);
            const distance = getDistance(clickedPoint, projectedPoint);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestLinePoint = projectedPoint;
            }
        }
    });

    // Retourner le nœud ou le point sur la ligne le plus proche
    return closestNode || closestLinePoint;
}


/**
 * Projette un point sur une ligne définie par deux extrémités.
 *
 * Cette fonction calcule le point sur la ligne entre `lineStart` et `lineEnd`
 * qui est le plus proche du point donné. Si la projection tombe en dehors des
 * extrémités de la ligne, elle retourne l'une des extrémités.
 *
 * @function projectPointOnLine
 * @param {L.LatLng} point - Le point à projeter sur la ligne.
 * @param {L.LatLng} lineStart - Le début de la ligne.
 * @param {L.LatLng} lineEnd - La fin de la ligne.
 * @returns {L.LatLng} Le point projeté sur la ligne ou l'une des extrémités si la projection est hors limites.
 *
 */
function projectPointOnLine(point, lineStart, lineEnd) {
    const start = L.latLng(lineStart);
    const end = L.latLng(lineEnd);
    const lineVector = L.latLng(end.lat - start.lat, end.lng - start.lng);
    const lineLength = lineVector.distanceTo([0, 0]);
    
    // S'assurer que la ligne n'est pas un point
    if (lineLength === 0) return start; 

    // Calculer le vecteur de point à lineStart
    const pointVector = L.latLng(point.lat - start.lat, point.lng - start.lng);
    
    // Calculer la projection du point sur la ligne
    const t = (pointVector.lat * lineVector.lat + pointVector.lng * lineVector.lng) / (lineLength * lineLength);
    
    // Trouver le point projeté sur la ligne
    const projectedPoint = [
        start.lat + t * lineVector.lat,
        start.lng + t * lineVector.lng
    ];

    // Vérifier si le point projeté se trouve en dehors des extrémités de la ligne
    if (t < 0) return lineStart; // Retourner le début de la ligne
    if (t > 1) return lineEnd;   // Retourner la fin de la ligne

    return projectedPoint; // Retourner le point projeté
}

/**
 * Construit un graphe à partir des données fournies par l'API Overpass.
 *
 * Cette fonction prend des données de type `data` qui contiennent des éléments
 * géométriques et construit un graphe représentant les nœuds et les segments de
 * routes. Les nœuds sont identifiés par leurs coordonnées, et les segments sont
 * connectés avec une longueur correspondant à la distance entre eux.
 *
 * @function buildGraph
 * @param {Object} data - Les données provenant de l'API Overpass, contenant des éléments géométriques.
 * @property {Array} data.elements - Un tableau d'éléments, où chaque élément représente un chemin (way).
 * @returns {void} Cette fonction ne retourne rien mais modifie la variable globale `graph`.
 *
 */
function buildGraph(data) {
    graph = {}; // Réinitialiser le graphe à chaque appel
    data.elements.forEach(way => {
        if (way.geometry) {
            const nodesCoords = way.geometry.map(geo => [geo.lat, geo.lon]);
            for (let i = 0; i < nodesCoords.length - 1; i++) {
                const pointA = L.latLng(nodesCoords[i]);
                const pointB = L.latLng(nodesCoords[i + 1]);
                const length = getDistance(pointA, pointB); // Calculer la distance
                
                const nodeIdA = `${pointA.lat},${pointA.lng}`;
                const nodeIdB = `${pointB.lat},${pointB.lng}`;

                // Initialiser le graphe si nécessaire
                if (!graph[nodeIdA]) graph[nodeIdA] = [];
                if (!graph[nodeIdB]) graph[nodeIdB] = [];

                // Ajouter chaque voisin avec le poids (longueur)
                graph[nodeIdA].push({ id: nodeIdB, length: length });
                graph[nodeIdB].push({ id: nodeIdA, length: length });
            }
        }
    });
}


/**
 * Trouve le chemin le plus court entre deux nœuds dans un graphe à l'aide de l'algorithme de Dijkstra.
 *
 * Cette fonction utilise l'algorithme de Dijkstra pour calculer le chemin le plus court
 * entre un nœud de départ et un nœud d'arrivée dans un graphe. Les distances entre les
 * nœuds sont basées sur les longueurs des segments. La fonction retourne un tableau des
 * nœuds constituant le chemin le plus court ou un tableau vide si aucun chemin n'est trouvé.
 *
 * @function dijkstra
 * @param {string} start - L'identifiant du nœud de départ.
 * @param {string} end - L'identifiant du nœud d'arrivée.
 * @returns {Array<string>} Un tableau contenant les identifiants des nœuds dans l'ordre du chemin le plus court,
 * ou un tableau vide si aucun chemin n'est trouvé.
 *
 */
function dijkstra(start, end) {
    let distances = {};
    let previous = {};
    let queue = [];

    // Initialiser les distances
    for (let node in graph) {
        distances[node] = Infinity;
        previous[node] = null;
        queue.push(node);
    }

    distances[start] = 0;

    while (queue.length) {
        // Trouver le nœud avec la distance la plus courte
        queue.sort((a, b) => distances[a] - distances[b]);
        const current = queue.shift();

        if (current === end) {
            break; // On a atteint le nœud de fin
        }

        for (let neighbor of graph[current]) {
            const alt = distances[current] + neighbor.length; // Utiliser la longueur

            // Vérifier que le voisin est dans le graphe
            if (queue.includes(neighbor.id) && alt < distances[neighbor.id]) {
                distances[neighbor.id] = alt;
                previous[neighbor.id] = current;
            }
        }
    }

    // Construire le chemin
    let path = [];
    for (let at = end; at !== null; at = previous[at]) {
        path.push(at);
    }
    path.reverse();

    // Vérifier si le chemin a été trouvé
    if (distances[end] === Infinity) {
        return []; // Aucun chemin trouvé
    }

    return path; // Retourner le chemin
}


/**
 * Gestionnaire d'événements pour le clic sur la carte.
 *
 * Lorsque l'utilisateur clique sur la carte, cette fonction détermine le point le plus proche
 * du clic, enregistre le premier point comme point de départ, et le second point comme
 * point d'arrivée. Elle vérifie également si ces points sont connectés dans le graphe
 * et, si c'est le cas, calcule le chemin le plus court entre eux.
 *
 * @event click
 * @param {Object} e - L'événement de clic contenant les coordonnées du point cliqué.
 * @param {Object} e.latlng - Les coordonnées (latitude, longitude) du point cliqué.
 *
 */
map.on('click', function (e) {
    const closestPoint = findClosestPoint(e.latlng);
    
    // Vérifiez que closestPoint n'est pas null ou indéfini
    if (!closestPoint) {
        alert("Aucun point proche trouvé.");
        return;
    }

    if (!startMarker) {
        // Premier clic - point de départ
        startMarker = L.marker(closestPoint).addTo(map);
    } else if (!endMarker) {
        // Deuxième clic - point d'arrivée
        endMarker = L.marker(closestPoint).addTo(map);

        // Récupérer les identifiants des nœuds pour le graphe
        const startNodeId = `${startMarker.getLatLng().lat},${startMarker.getLatLng().lng}`;
        const endNodeId = `${endMarker.getLatLng().lat},${endMarker.getLatLng().lng}`;

        console.log('startNodeId:', startNodeId);
        console.log('endNodeId:', endNodeId);
        console.log('graph[startNodeId]:', graph[startNodeId]);
        console.log('graph[endNodeId]:', graph[endNodeId]);

        // Vérifier que les nœuds existent dans le graphe
        if (!graph[startNodeId] || !graph[endNodeId]) {
            alert("Un ou les deux nœuds ne sont pas connectés dans le graphe.");
            return;
        }

        // Trouver le chemin le plus court
        const shortestPath = dijkstra(startNodeId, endNodeId);

        // Dessiner le chemin sur la carte
        if (shortestPath.length > 0) {
            const path = shortestPath.map(nodeId => nodeId.split(',').map(Number));
            L.polyline(path, { color: 'green' }).addTo(map);

            // Dessiner les nœuds du chemin
            path.forEach(coord => {
                L.circleMarker([coord[0], coord[1]], {
                    radius: 5,
                    fillColor: 'orange',
                    color: 'orange',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 1
                }).addTo(map);
            });
        } else {
            alert('Aucun chemin trouvé');
        }
    }
});

// Appeler la fonction pour récupérer les données et dessiner sur la carte
getGraphData();
