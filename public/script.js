// public/script.js

// Initialisation de la carte centrée sur Genté
var map = L.map('map', {center: [45.63184490951869, -0.3110564244276566], zoom: 13});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

var startMarker, endMarker;
var nodes = []; // Tableau pour stocker les nœuds
var lines = []; // Tableau pour stocker les segments

// Fonction pour interroger Overpass API et récupérer les nœuds et segments
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

// Fonction pour calculer la distance entre deux coordonnées
function getDistance(latlng1, latlng2) {
    return map.latLngToLayerPoint(latlng1).distanceTo(map.latLngToLayerPoint(latlng2));
}

// Trouver le nœud ou l'arête le plus proche d'un point cliqué
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

// Fonction pour projeter un point sur une ligne
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

// Appeler la fonction pour récupérer les données et dessiner sur la carte
getGraphData();

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
