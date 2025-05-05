let currentChart = null;
let location_toggle = false;
document.getElementById("show_raw").addEventListener("click", function () {
    window.location.href = "https://argosurbanmobility.com/raw-data"; // Reindirizza al file
});
// Inizializzazione della mappa
const map = L.map('map').setView([39.47093, -0.334278], 13); // Vista iniziale
document.querySelector(".fetching_label").style.display = "none";
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Ã‚Â© OpenStreetMap contributors'
}).addTo(map);

// Variabile per memorizzare i marker
let markers = [];

// Funzione per aggiungere un marker alla mappa
function addLocation(lat, lon, name) {
    // Aggiungi un marker alla mappa
    const marker = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(name) // Aggiungi nome al popup del marker
        .openPopup(); // Apri il pop-up subito

    // Aggiungi il marker alla lista
    markers.push(marker);
}

// Funzione per rimuovere tutti i marker
function removeMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = []; // Svuota l'array dei marker
}

// Funzione per caricare tutte le location
function fetchLocations() {
    // Invio della richiesta al server
    fetch('https://incandescent-winter-hat.glitch.me/location')
        .then(response => response.json())
        .then(locations => {
            const treeMenu = document.getElementById('treeMenu');
            const cities = Object.keys(locations);

            // Costruire il menu ad albero
            cities.forEach(city => {
                const cityNode = document.createElement('div');
                cityNode.className = 'tree-node';
                cityNode.textContent = city;

                // Aggiungi evento click per selezionare la cittÃƒ 
                cityNode.addEventListener('click', () => {
                    location_toggle = true;
                    document.dispatchEvent(new Event('locationSelected'));
                    console.log(location_toggle);
                    const coords = locations[city];
                    removeMarkers(); // Rimuovi tutti i marker
                    addLocation(coords[0], coords[1], city); // Aggiungi il marker per la cittÃƒ  selezionata

                    // Zoom sulla posizione selezionata
                    map.setView([coords[0], coords[1]], 15);
                });

                treeMenu.appendChild(cityNode);

                // Aggiungi il marker sulla mappa (inizialmente)
                const coords = locations[city];
                addLocation(coords[0], coords[1], city); // Aggiungi ogni cittÃƒ  sulla mappa
            });

            // Zoom alla zona che contiene tutti i marker (auto-zoom per includere tutti i punti)
            const bounds = Object.values(locations).map(coord => [coord[0], coord[1]]);
            map.fitBounds(bounds, { padding: [20, 20] });

        })
        .catch(err => {
            console.error('Errore durante il fetch delle location:', err);
        });
}

// Avvia il fetch delle location al caricamento della pagina
fetchLocations();

// Disabilitare il click sulla mappa per aggiungere punti
// Non serve alcuna funzione di click per aggiungere marker.
document.addEventListener('DOMContentLoaded', function () {

    // Controlla se il canvas esiste prima di creare i grafici
    const ctx = document.getElementById('PieChart')?.getContext('2d');


    // Inizializza i grafici solo se i contesti sono disponibili
    let scooterChart, scooterVelocity;
    let myVehiclesChart;
    let mySpeedChart;
    function destroy_chart(){
        if (myVehiclesChart){
            myVehiclesChart.destroy();
        }
        if (mySpeedChart){
            mySpeedChart.destroy();
        }
    }
        if (ctx) {
            // Colori originali delle porzioni
            var originalColors = ['blue', 'green', 'purple'];

            // Creazione del grafico a torta
            var pieChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Num Scooters', 'Num Bikes', 'Num Ebikes'],
                    datasets: [{
                        data: [0, 0, 0], // inizializza con 0, poi li aggiorni con `updatePieChart`,
                        backgroundColor: originalColors, // Usa direttamente i colori
                        hoverOffset: 10, // Hover piÃƒÂ¹ evidente
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        tooltip: {
                            enabled: true,
                        }
                    },
                    interaction: {
                        mode: 'point',     // Interagisci con tutti i punti dello stesso indice
                        intersect: true,  // Include punti vicini, non solo quelli direttamente sotto il cursore
                    },
                    onHover: (event, chartElement) => {
                        const dataset = pieChart.data.datasets[0];
                        if (chartElement.length > 0) {
                            const index = chartElement[0].index;
                            // Cambia il colore delle porzioni non selezionate
                            dataset.backgroundColor = originalColors.map((color, i) =>
                                i === index ? color : 'rgba(0, 0, 0, 0.4)'
                            );
                        } else {
                            // Ripristina i colori originali
                            dataset.backgroundColor = originalColors;
                        }
                        pieChart.update();
                    }
                }
            });
        } else {
            console.error('Canvas per il grafico a torta non trovato');
        }
    
    // Opzione per ripristinare i colori quando esci dal container con classe 'pie-chart'
    document.querySelector('.chart-container.pie-chart').addEventListener('mouseleave', function () {
        var dataset = pieChart.data.datasets[0];
        dataset.backgroundColor = [...originalColors];  // Ripristina i colori originali
        pieChart.update();
    });
    function fetchnewdata() {

        fetch('https://raw.githubusercontent.com/offRaffo/dashboard/main/dati.xlsx')
            .then(res => res.arrayBuffer())
            .then(arrayBuffer => {
                const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
                const sheet = workbook.Sheets['mobility'];
                const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                const [header, ...rows] = data;
                const idx = colName => header.indexOf(colName);

                const dateCol = idx('Date');
                const scootersCol = idx('Num_scooters');
                const bikesCol = idx('Num_bikes');
                const ebikesCol = idx('Num_ebikes');

                const speedMaxBikesCol = idx('Speed_max_bikes');
                const speedAvgBikesCol = idx('Speed_avg_bikes');
                const speedMaxScootersCol = idx('Speed_max_scooter');
                const speedAvgScootersCol = idx('Speed_avg_scooter');

                // Estrai le date uniche dal dataset
                const uniqueDates = Array.from(new Set(rows.map(r => {
                    const rawDate = r[dateCol];
                    if (!rawDate) return null;

                    let dateObj;
                    if (rawDate instanceof Date) {
                        dateObj = rawDate;
                    } else {
                        const parsed = new Date(rawDate);
                        if (isNaN(parsed)) return null;
                        dateObj = parsed;
                    }

                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    return `${dateObj.getFullYear()}-${month}-${day}`;
                }))).filter(d => d); // Filtro per eliminare eventuali date null

                // Imposta il range di date disponibili nell'input
                const dateSelector = document.getElementById("dateSelector");
                const minDate = Math.min(...uniqueDates.map(d => new Date(d).getTime()));
                const maxDate = Math.max(...uniqueDates.map(d => new Date(d).getTime()));

                dateSelector.setAttribute('min', new Date(minDate).toISOString().split('T')[0]);
                dateSelector.setAttribute('max', new Date(maxDate).toISOString().split('T')[0]);

                // Funzione per selezionare i 9 giorni a partire dalla data scelta
                function getDateRange(startDate) {
                    const startTime = startDate.getTime();
                    const endTime = startTime + (9 * 24 * 60 * 60 * 1000); // Aggiungi 9 giorni
                    return { startTime, endTime };
                }

                // Funzione per filtrare i dati in base alla data selezionata
                function normalizeDate(date) {
                    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
                }

                function filterDataByDateRange(startDate) {
                    const normalizedStart = normalizeDate(startDate);
                    const startTime = normalizedStart.getTime();
                    const endTime = startTime + (9 * 24 * 60 * 60 * 1000);

                    const seenDates = new Set();
                    const filteredRows = rows.filter((r) => {
                        const rowDate = normalizeDate(new Date(r[dateCol]));
                        const time = rowDate.getTime();
                        if (time >= startTime && time < endTime) {
                            const dateKey = rowDate.toDateString();
                            if (!seenDates.has(dateKey)) {
                                seenDates.add(dateKey);
                                return true;
                            }
                        }
                        return false;
                    }).slice(0, 9);



                    // Seleziona la data che deve essere inclusa nelle label
                    const filteredLabels = filteredRows.map((r) => {
                        const rawDate = r[dateCol];
                        let dateObj = new Date(rawDate);
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        return `${day}/${month}`;
                    });

                    const filteredNumScooters = filteredRows.map(r => r[scootersCol]);
                    const filteredNumBikes = filteredRows.map(r => r[bikesCol]);
                    const filteredNumEbikes = filteredRows.map(r => r[ebikesCol]);

                    const filteredSpeedMaxBikes = filteredRows.map(r => r[speedMaxBikesCol]);
                    const filteredSpeedAvgBikes = filteredRows.map(r => r[speedAvgBikesCol]);
                    const filteredSpeedMaxScooters = filteredRows.map(r => r[speedMaxScootersCol]);
                    const filteredSpeedAvgScooters = filteredRows.map(r => r[speedAvgScootersCol]);

                    // Aggiorna i grafici
                    updateCharts(filteredLabels, filteredNumScooters, filteredNumBikes, filteredNumEbikes, filteredSpeedMaxBikes, filteredSpeedAvgBikes, filteredSpeedMaxScooters, filteredSpeedAvgScooters);
                }

                // Funzione per aggiornare i grafici
                function updateCharts(labels, numScooters, numBikes, numEbikes, speedMaxBikes, speedAvgBikes, speedMaxScooters, speedAvgScooters) {
                    if (myVehiclesChart.data.labels.join() !== labels.join()) {
                        myVehiclesChart.data.labels = labels;
                        myVehiclesChart.data.datasets[0].data = numScooters;
                        myVehiclesChart.data.datasets[1].data = numBikes;
                        myVehiclesChart.data.datasets[2].data = numEbikes;
                        myVehiclesChart.update();
                    }

                    if (mySpeedChart.data.labels.join() !== labels.join()) {
                        mySpeedChart.data.labels = labels;
                        mySpeedChart.data.datasets[0].data = speedMaxBikes;
                        mySpeedChart.data.datasets[1].data = speedAvgBikes;
                        mySpeedChart.data.datasets[2].data = speedMaxScooters;
                        mySpeedChart.data.datasets[3].data = speedAvgScooters;
                        mySpeedChart.update();
                    }
                    if (pieChart) {
                        const totalScooters = numScooters.reduce((a, b) => a + b, 0);
                        const totalBikes = numBikes.reduce((a, b) => a + b, 0);
                        const totalEbikes = numEbikes.reduce((a, b) => a + b, 0);
                    
                        setTimeout(() => {
                            pieChart.data.datasets[0].data = [totalScooters, totalBikes, totalEbikes];
                            pieChart.update('active');
                        }, 100); // o anche 200 ms
                    }
                    
                }
                
                // Creazione dei grafici (inizializzazione)
                myVehiclesChart = new Chart(document.getElementById("scooterChart"), {
                    type: 'bar',
                    data: {
                        labels: [],
                        datasets: [
                            { label: 'Num Scooters', data: [], backgroundColor: 'blue', borderColor: 'blue', fill: false },
                            { label: 'Num Bikes', data: [], backgroundColor: 'green', borderColor: 'green', fill: false },
                            { label: 'Num Ebikes', data: [], backgroundColor: 'purple', borderColor: 'purple', fill: false }
                        ]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: { display: true, text: 'Número de vehículos al día' }
                        }
                    }
                });
                mySpeedChart = new Chart(document.getElementById("scooterVelocity"), {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [
                            { label: 'Max Speed Bikes', data: [], borderColor: 'green', fill: false },
                            { label: 'Avg Speed Bikes', data: [], borderColor: 'darkorange', fill: false },
                            { label: 'Max Speed Scooters', data: [], borderColor: 'blue', fill: false },
                            { label: 'Avg Speed Scooters', data: [], borderColor: 'darkred', fill: false }
                        ]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: { display: true, text: 'Velocidad media y máxima por día' }
                        }
                    }
                });


                // Inizializza i grafici con la prima data disponibile
                // Dopo aver ottenuto uniqueDates[0] o qualsiasi data valida:
                const firstDate = new Date(uniqueDates[0]);
                const isoString = firstDate.toISOString().split('T')[0];
                dateSelector.value = isoString;
                dateSelector.min = new Date(uniqueDates[0]).toISOString().split('T')[0];
                dateSelector.max = new Date(uniqueDates[uniqueDates.length - 1]).toISOString().split('T')[0];
                dateSelector.value = '2025-04-15';
                // Carica i dati iniziali
                filterDataByDateRange(firstDate);

                // Aggiungi un evento di selezione della data
                dateSelector.addEventListener("change", function (e) {
                    const selectedDate = new Date(e.target.value);
                    filterDataByDateRange(selectedDate);
                });

            })

            .catch(err => {
                console.error("Errore nel caricamento del file Excel:", err);
            });
    }
    document.addEventListener('locationSelected', () => {
        document.querySelector(".fetching_label").style.display = "flex";
        document.querySelector(".chart-container.bar-chart").style.display = "none";
        document.querySelector(".chart-container.pie-chart").style.display = "none";
        document.querySelector(".chart-container.line-chart").style.display = "none";
        document.getElementById("show_raw").style.display = "none";
        destroy_chart();
        setTimeout(() => {
            document.querySelector(".chart-container.bar-chart").style.display = "block";
            document.querySelector(".chart-container.pie-chart").style.display = "block";
            document.querySelector(".chart-container.line-chart").style.display = "block";
            document.querySelector(".fetching_label").style.display = "none";
            document.getElementById("show_raw").style.display = "block";
        }, 3000)
        fetchnewdata();
    });


    // Funzione per recuperare i dati
    async function getScooterCount() {
        try {
            //const response = await fetch('https://53e6-2a0c-5a84-9310-e800-805b-b847-4f-583e.ngrok-free.app/scooter-count');
            const response = await fetch('https://incandescent-winter-hat.glitch.me/scooter-count');
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const data = await response.json();
            console.log(data);  // Verifica la struttura dei dati

            // Estrai i dati dai campi dell'oggetto
            const scooterCounts = [
                data.totalScooterCountBlue,
                data.totalScooterCountRed,
                data.totalScooterCountGreen
            ];
            const totalVelocity = [
                data.velocityBlue,
                data.velocityRed,
                data.velocityGreen

            ]; // Array con velocitÃƒ  degli scooter blu
            console.log(data.velocityRed, data.velocityGreen)
            // Aggiorna i grafici
            createOrUpdateChart(scooterCounts[0], scooterCounts[1], scooterCounts[2]);
            createOrUpdateVelocityChart(totalVelocity[0], totalVelocity[1], totalVelocity[2]);

        } catch (error) {
            console.error("Errore nel recupero dei dati:", error);
            alert("Impossibile recuperare i dati. Riprovare piÃƒÂ¹ tardi.");
        }
    }

    // Funzione per aggiornare il grafico di conteggio
    function createOrUpdateChart(blue, red, green) {
        if (scooterChart) {
            scooterChart.data.datasets[0].data = [blue, /*red*/7, /*green*/9];
            scooterChart.update();
        }
        if (pieChart) {
            pieChart.data.datasets[0].data = [blue, /*red*/7, /*green*/9];
            pieChart.update();
        }
    }

    function createOrUpdateVelocityChart(velocityBlueArray) {
        if (scooterVelocity) {
            // Pulire i dati ricevuti
            const cleanData = velocityBlueArray.map(value => parseFloat(value.trim())).filter(value => !isNaN(value));

            // Aggiungere nuovi valori al grafico
            const time = new Date().toLocaleTimeString();
            cleanData.forEach((velocity, index) => {
                // Aggiungere timestamp per ciascun valore
                const label = `${time} (${index + 1})`;
                scooterVelocity.data.labels.push(label);
                scooterVelocity.data.datasets[0].data.push(velocity);
            });

            // Mantieni massimo 20 punti sul grafico
            while (scooterVelocity.data.labels.length > 20) {
                scooterVelocity.data.labels.shift();
                scooterVelocity.data.datasets[0].data.shift();
            }

            scooterVelocity.update();
        }
    }



    // Inizializza il recupero dei dati
    getScooterCount();
});
