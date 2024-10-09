// pathAlgorithm.js
const overpass = require('query-overpass');

async function getGraphData() {
    // Requête Overpass pour obtenir les routes dans une région spécifique
    const query = `
        [out:json];
        area["name"="Genté"]->.searchArea;
        (way["highway"](area.searchArea););
        out geom;
    `;

    return new Promise((resolve, reject) => {
        overpass(query, (error, data) => {
            if (error) {
                console.error('Erreur lors de la requête Overpass:', error);
                return reject(error);
            }

            // Vérifie si les éléments existent
            if (!data.elements || data.elements.length === 0) {
                console.warn('Aucun élément trouvé dans la réponse Overpass.');
                return resolve({}); // Retourne un graphe vide
            }

            const graph = {};

            // Parcourir les résultats pour construire le graphe
            data.elements.forEach(way => {
                if (!way.geometry) {
                    console.warn('Élément sans géométrie:', way);
                    return; // Ignore cet élément
                }
                
                const nodes = way.geometry.map(geo => [geo.lat, geo.lon]);

                for (let i = 0; i < nodes.length - 1; i++) {
                    const start = nodes[i];
                    const end = nodes[i + 1];

                    const startKey = `${start[0]},${start[1]}`;
                    const endKey = `${end[0]},${end[1]}`;

                    if (!graph[startKey]) graph[startKey] = {};
                    if (!graph[endKey]) graph[endKey] = {};

                    const distance = getDistanceBetweenCoords(start, end);
                    graph[startKey][endKey] = distance;
                    graph[endKey][startKey] = distance; // Ajouter l'arête bidirectionnelle
                }
            });

            resolve(graph);
        });
    });
}



// Calcul de la distance entre deux points (formule de Haversine)
function getDistanceBetweenCoords(start, end) {
    const [lat1, lon1] = start;
    const [lat2, lon2] = end;
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance en km
}

async function calculateShortestPath(start, end) {
    const graph = await getGraphData();
    const distances = {}; // Stocker les distances les plus courtes depuis le point de départ
    const previousNodes = {}; // Pour reconstruire le chemin à la fin
    const queue = []; // Priorité pour les nœuds à explorer
    const startNode = findNearestNode(start, graph);
    const endNode = findNearestNode(end, graph);

    // Initialisation : distance du point de départ à lui-même = 0
    distances[startNode] = 0;
    queue.push({ node: startNode, distance: 0 });

    // Initialiser les distances des autres nœuds à l'infini
    for (let node in graph) {
        if (node !== startNode) {
            distances[node] = Infinity;
        }
        previousNodes[node] = null; // Aucune idée des précédents nœuds encore
    }

    // Algorithme de Dijkstra
    while (queue.length > 0) {
        // Extraire le nœud avec la distance minimale (priorité)
        queue.sort((a, b) => a.distance - b.distance); // Trier par distance
        const { node: currentNode } = queue.shift();

        // Si nous atteignons le nœud final, nous avons terminé
        if (currentNode === endNode) {
            return reconstructPath(previousNodes, startNode, endNode);
        }

        // Explorer les voisins du nœud actuel
        for (let neighbor in graph[currentNode]) {
            const distanceToNeighbor = graph[currentNode][neighbor];
            const totalDistance = distances[currentNode] + distanceToNeighbor;

            // Si un chemin plus court est trouvé
            if (totalDistance < distances[neighbor]) {
                distances[neighbor] = totalDistance;
                previousNodes[neighbor] = currentNode; // Garder une trace du chemin
                queue.push({ node: neighbor, distance: totalDistance });
            }
        }
    }

    // Si nous n'avons pas trouvé de chemin vers le nœud final
    return [];
}

// Fonction pour retrouver le nœud le plus proche des coordonnées
function findNearestNode(coords, graph) {
    // Approximativement, trouve le nœud le plus proche du point donné
    let nearestNode = null;
    let minDistance = Infinity;
    const [lat, lon] = coords;

    for (let node in graph) {
        const [nodeLat, nodeLon] = node.split(',').map(Number);
        const distance = getDistanceBetweenCoords([lat, lon], [nodeLat, nodeLon]);

        if (distance < minDistance) {
            minDistance = distance;
            nearestNode = node;
        }
    }

    return nearestNode;
}

// Reconstruire le chemin en partant du nœud final
function reconstructPath(previousNodes, startNode, endNode) {
    const path = [];
    let currentNode = endNode;

    while (currentNode !== null) {
        path.unshift(currentNode);
        currentNode = previousNodes[currentNode];
    }

    // Si le chemin ne commence pas par le point de départ, aucun chemin n'existe
    if (path[0] !== startNode) {
        return [];
    }

    return path;
}

module.exports = { calculateShortestPath };
