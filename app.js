// ============================================
// SatOps - Rewritten (Cesium 1.95 compatible)
// Purpose: Smooth, non-blinking satellite orbits with multi-color orbit style
// Option: Only SATELLITES (no solar system)
// ============================================

// =========== CONFIG ===========
const API_BASE = 'https://supreme-eureka-h5f8.onrender.com/api/frontend';
const DSL_ENDPOINT = 'https://supreme-eureka-h5f8.onrender.com/dsl/run';

// Replace with your Cesium Ion token (keeps original)
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxYWZiNDJkNy0yZWEwLTQ5OWQtYjk0MS0xOThlMTIxMDg1YTgiLCJpZCI6MzMyOTY1LCJpYXQiOjE3NTU1MTcyNzR9.raBDIk08ACyJ5JbAiqca_PFRHh1MyGLi3Bqfej5sL9Q';

// =========== VIEWER ===========
const viewer = new Cesium.Viewer('cesiumContainer', {
    animation: true,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: true,
    infoBox: true,
    imageryProvider: new Cesium.IonImageryProvider({ assetId: 3812 }), // dark imagery like your original
    sceneModePicker: false,
    selectionIndicator: true,
    timeline: true,
    navigationHelpButton: false,
    scene3DOnly: true,
    terrainProvider: Cesium.createWorldTerrain(),
    skyBox: false,
    atmosphere: false,
    shouldAnimate: true
});

viewer.scene.globe.enableLighting = true;
viewer.scene.globe.depthTestAgainstTerrain = false;
viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0a1a');
viewer.scene.globe.showGroundAtmosphere = true;
viewer.clock.shouldAnimate = true;
viewer.clock.multiplier = 1;

viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(0, 0, 25000000),
    orientation: { heading: 0, pitch: -1.57, roll: 0 }
});

// =========== DOM ELEMENTS ===========
const commandInput = document.getElementById('command-input');
const consoleOutput = document.getElementById('console-output');
const satelliteList = document.getElementById('satellite-list');
const commandHistory = document.getElementById('command-history');
const systemTime = document.getElementById('system-time');
const notification = document.getElementById('notification');
const connectionStatus = document.getElementById('connection-status');
const networkStatusText = document.getElementById('network-status-text');
const activeSatellitesCount = document.getElementById('active-satellites');

// =========== STATE ===========
let satellites = []; // raw data from backend
const satEntities = new Map();      // satId -> Cesium.Entity
const satRecMap = new Map();        // satId -> satrec (from satellite.js)
const orbitEntities = new Map();    // satId -> orbit entity (polyline)
const groundStations = new Map();   // code -> entity
const linkEntities = new Map();     // linkId -> entity
let isTracking = false;

// Multi-color palette for orbits (will cycle)
const COLOR_PALETTE = [
    Cesium.Color.CYAN.withAlpha(0.85),
    Cesium.Color.YELLOW.withAlpha(0.8),
    Cesium.Color.LIME.withAlpha(0.85),
    Cesium.Color.ORANGE.withAlpha(0.85),
    Cesium.Color.MAGENTA.withAlpha(0.85),
    Cesium.Color.WHITE.withAlpha(0.9),
    Cesium.Color.VIOLET.withAlpha(0.85),
    Cesium.Color.DEEPSKYBLUE.withAlpha(0.85)
];

// =========== UTILITIES ===========
function addConsoleOutput(text) {
    if (!consoleOutput) return;
    const line = document.createElement('div');
    line.className = 'console-line';
    line.innerHTML = text;
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function showNotification(msg) {
    if (!notification) return;
    notification.textContent = msg;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 2500);
}

function formatTime(date) {
    return date.toUTCString().split(' ')[4] + ' UTC';
}

// ===================== SATELLITE CREATION & UPDATES =====================

// Create or update satellites from DB data (persistent entities)
async function loadSatellitesFromDB() {
    try {
        const response = await fetch(`${API_BASE}/satellites`);
        const dbSatellites = await response.json();

        satellites = dbSatellites || [];
        activeSatellitesCount.textContent = satellites.length;

        // Create or update each satellite
        satellites.forEach((sat, idx) => {
            const satId = sat.satelliteId || sat.id;
            const existing = satEntities.get(satId);

            // If TLEs exist and changed or new, parse and store satrec
            if (sat.tleLine1 && sat.tleLine2) {
                try {
                    const newSatrec = window.satellite.twoline2satrec(sat.tleLine1, sat.tleLine2);
                    const oldRec = satRecMap.get(satId);

                    // if new or changed, update map
                    if (!oldRec || oldRec.tle1 !== sat.tleLine1 || oldRec.tle2 !== sat.tleLine2) {
                        // store satrec object and the raw tle strings for change detection
                        newSatrec._metadata = { tle1: sat.tleLine1, tle2: sat.tleLine2 };
                        satRecMap.set(satId, newSatrec);
                    }
                } catch (err) {
                    console.warn(`TLE parse failed for ${satId}:`, err);
                }
            }

            if (!existing) {
                // create orbit + satellite entity once
                createSatelliteEntityWithOrbit(sat, idx);
            } else {
                // Update label/name and other non-position metadata if needed
                existing.name = sat.name || existing.name;
                // if TLE updated, createOrbit will regenerate (we avoid regeneration every fetch; keep current)
                // optionally mark entity metadata
                existing.description = existing.description; // no-op placeholder
            }
        });

        // Remove satellites that are no longer in DB (cleanup)
        const dbIds = new Set(satellites.map(s => s.satelliteId || s.id));
        Array.from(satEntities.keys()).forEach(id => {
            if (!dbIds.has(id)) {
                const e = satEntities.get(id);
                if (e) viewer.entities.remove(e);
                satEntities.delete(id);

                const o = orbitEntities.get(id);
                if (o) viewer.entities.remove(o);
                orbitEntities.delete(id);

                satRecMap.delete(id);
                addConsoleOutput(`🗑️ Removed satellite ${id}`);
            }
        });

    } catch (error) {
        addConsoleOutput('❌ Error loading satellites: ' + (error.message || error));
    }
}

// Generate smooth orbit polyline positions once using satellite.js propagate
function sampleOrbitPositions(satrec, sampleCount = 180) {
    const points = [];
    // we will sample across one orbital period if possible, otherwise across 90 minutes
    // satellite.js satrec.no ~ mean motion in radians per minute (approx). We'll approximate.
    try {
        let meanMotion = satrec.no; // rad / minute
        if (!meanMotion || isNaN(meanMotion)) {
            // fallback: sample across 90 minutes
            meanMotion = (2 * Math.PI) / 90; // rad/min
        }
        // orbital period seconds
        const orbitalPeriodSeconds = (2 * Math.PI / meanMotion) * 60;
        const start = new Date();

        for (let i = 0; i <= sampleCount; i++) {
            const tSec = (orbitalPeriodSeconds * i) / sampleCount;
            const d = new Date(start.getTime() + tSec * 1000);

            const pv = window.satellite.propagate(satrec, d);
            if (pv.position && !pv.position.error) {
                const gmst = window.satellite.gstime(d);
                const gd = window.satellite.eciToGeodetic(pv.position, gmst);
                const lon = gd.longitude * (180 / Math.PI);
                const lat = gd.latitude * (180 / Math.PI);
                const h = gd.height * 1000; // km -> m

                points.push(Cesium.Cartesian3.fromDegrees(lon, lat, h));
            }
        }
    } catch (e) {
        console.warn('Orbit sampling failed:', e);
    }
    return points;
}

// Create a single satellite entity and a single orbit polyline (if TLE available)
function createSatelliteEntityWithOrbit(satellite, index = 0) {
    const satId = satellite.satelliteId || satellite.id;
    if (!satId) return;

    // create position property using satrec if available, else fallback to static lat/lon
    const satrec = satRecMap.get(satId);

    let positionProperty;
    if (satrec) {
        positionProperty = new Cesium.CallbackProperty(function(time, result) {
            try {
                const jsDate = Cesium.JulianDate.toDate(time);
                const pv = window.satellite.propagate(satrec, jsDate);

                if (pv.position && !pv.position.error) {
                    const gmst = window.satellite.gstime(jsDate);
                    const gd = window.satellite.eciToGeodetic(pv.position, gmst);
                    const lon = gd.longitude * (180 / Math.PI);
                    const lat = gd.latitude * (180 / Math.PI);
                    const h = gd.height * 1000;
                    // reuse result if possible
                    return Cesium.Cartesian3.fromDegrees(lon, lat, h, Cesium.Ellipsoid.WGS84, result);
                }
            } catch (err) {
                // fall through to fallback zero if propagate fails
            }
            // small safe fallback at equator above earth
            return Cesium.Cartesian3.fromDegrees(0, 0, 400000, Cesium.Ellipsoid.WGS84, result);
        }, false);
    } else {
        // fallback to static position if no TLE
        positionProperty = Cesium.Cartesian3.fromDegrees(
            satellite.longitude || 0,
            satellite.latitude || 0,
            (satellite.altitude || 400) * 1000
        );
    }

    // Satellite billboard + label
    const entity = viewer.entities.add({
        id: satId,
        name: satellite.name || satId,
        position: positionProperty,
        billboard: {
            image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCI+PHBhdGggZmlsbD0iIzAwZmZmZiIgZD0iTTI0IDhsLTggOGg2djEyaC00djRoNHYxMmgtNmw4IDggOC04aC02VjI4aDR2LTRoLTRWMTJoNmwtOC04eiIvPjwvc3ZnPg==',
            width: 28,
            height: 28,
            color: Cesium.Color.WHITE,
            heightReference: Cesium.HeightReference.NONE,
            scaleByDistance: new Cesium.NearFarScalar(1.5e6, 1.5, 8.0e6, 0.5)
        },
        label: {
            text: (satellite.satelliteId || satellite.id || '').toString().toUpperCase(),
            font: '12pt monospace',
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 3,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -18),
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString('rgba(0,0,0,0.6)'),
            backgroundPadding: new Cesium.Cartesian2(6, 4),
            scaleByDistance: new Cesium.NearFarScalar(1.5e6, 1.0, 8.0e6, 0.0)
        },
        description: `
            <div style="font-family: monospace; color: #00ffff; padding: 12px; background: rgba(0,0,0,0.9); border: 1px solid #00ffff;">
                <h3 style="margin:0 0 8px 0; color:#00ffff">${satellite.name || satId}</h3>
                <p style="margin: 4px 0;"><b>ID:</b> ${satId}</p>
                <p style="margin: 4px 0;"><b>NORAD:</b> ${satellite.noradId || 'N/A'}</p>
                <p style="margin: 4px 0;"><b>Status:</b> ${satellite.status || 'N/A'}</p>
            </div>
        `
    });

    satEntities.set(satId, entity);
    addConsoleOutput(`🛰️ Created entity ${satId}`);

    // Create orbit polyline once if satrec exists
    if (satrec) {
        // sample positions (this is done once — lightweight)
        const orbitPositions = sampleOrbitPositions(satrec, 240);

        if (orbitPositions.length > 8) {
            // choose color from palette by index or inclination (index used)
            const color = COLOR_PALETTE[index % COLOR_PALETTE.length];

            const poly = viewer.entities.add({
                id: satId + '_orbit',
                polyline: {
                    positions: orbitPositions,
                    width: 1.6,
                    material: new Cesium.PolylineGlowMaterialProperty({
                        glowPower: 0.25,
                        color: color
                    }),
                    clampToGround: false,
                    arcType: Cesium.ArcType.NONE
                }
            });
            orbitEntities.set(satId, poly);
            addConsoleOutput(`— Orbit created for ${satId} (${orbitPositions.length} pts)`);
        } else {
            addConsoleOutput(`⚠️ Not enough orbit samples for ${satId}`);
        }
    }

    // Click handler to track satellite and show education card via existing code
    viewer.entities.getById(satId).clickable = true;
    // (Your render list will add click listeners on UI list, not on Cesium entity)
}

// Simple fallback create (not commonly used now)
function createSimpleSatellite(satellite) {
    return createSatelliteEntityWithOrbit(satellite, 0);
}

// =========== GROUND STATIONS & LINKS ===========

async function loadGroundStations() {
    try {
        const response = await fetch(`${API_BASE}/ground-stations`);
        const stations = await response.json();

        (stations || []).forEach(station => {
            const code = station.code;
            if (!groundStations.has(code)) {
                const gsEntity = viewer.entities.add({
                    id: 'gs_' + code,
                    name: station.name,
                    position: Cesium.Cartesian3.fromDegrees(station.longitude, station.latitude, 0),
                    billboard: {
                        image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCI+PHBhdGggZmlsbD0iIzAwZmYwMCIgZD0iTTI0IDRsMTIgMTJoLTZ2MTZoLTEyVjE2aC02bDEyLTEyek0xMiAzNmgyNHY0SDEyeiIvPjwvc3ZnPg==',
                        width: 28,
                        height: 28
                    },
                    label: {
                        text: code,
                        font: '12pt monospace',
                        fillColor: Cesium.Color.LIME
                    }
                });
                groundStations.set(code, gsEntity);
            } else {
                // optionally update label or position
                const existing = groundStations.get(code);
                existing.position = Cesium.Cartesian3.fromDegrees(station.longitude, station.latitude, 0);
            }
        });

        addConsoleOutput(`📡 Loaded ${groundStations.size} ground stations`);
    } catch (err) {
        console.error('Failed to load ground stations:', err);
    }
}

// Update communication links — create once per link and let positions be dynamic using CallbackProperty
async function updateCommunicationLinks() {
    try {
        const response = await fetch(`${API_BASE}/communication-links`);
        const links = await response.json();

        (links || []).forEach(link => {
            const linkId = `link_${link.satelliteId}_${link.groundStationCode}`;
            // if already exists keep it, otherwise create
            if (!linkEntities.has(linkId)) {
                // safe position callback to reference satellite and ground station positions
                const posCallback = new Cesium.CallbackProperty(function(time, result) {
                    try {
                        const satEntity = viewer.entities.getById(link.satelliteId);
                        const gsEntity = viewer.entities.getById('gs_' + link.groundStationCode);
                        if (satEntity && gsEntity) {
                            const satPos = satEntity.position.getValue(time);
                            const gsPos = gsEntity.position.getValue(time);
                            if (satPos && gsPos) {
                                return [gsPos, satPos];
                            }
                        }
                    } catch (e) {
                        // ignore
                    }
                    // fallback array
                    return [];
                }, false);

                const poly = viewer.entities.add({
                    id: linkId,
                    polyline: {
                        positions: posCallback,
                        width: 2.2,
                        material: Cesium.Color.fromCssColorString(link.linkColor || '#00ffff')
                    }
                });
                linkEntities.set(linkId, poly);
            } else {
                // update color if changed
                const ent = linkEntities.get(linkId);
                if (ent && ent.polyline) {
                    ent.polyline.material = Cesium.Color.fromCssColorString(link.linkColor || '#00ffff');
                }
            }
        });

        // Optionally: remove stale links that backend no longer reports
        const activeSet = new Set((links || []).map(l => `link_${l.satelliteId}_${l.groundStationCode}`));
        Array.from(linkEntities.keys()).forEach(k => {
            if (!activeSet.has(k)) {
                const e = linkEntities.get(k);
                if (e) viewer.entities.remove(e);
                linkEntities.delete(k);
            }
        });

    } catch (error) {
        console.error('Failed to update links:', error);
    }
}

// =========== UI: Satellite List & Selection ===========
function renderSatelliteList() {
    if (!satelliteList) return;
    satelliteList.innerHTML = '';
    satellites.forEach((sat, index) => {
        const satId = sat.satelliteId || sat.id;
        const listItem = document.createElement('li');
        listItem.className = 'satellite-item';
        listItem.style.animationDelay = `${index * 0.03}s`;
        listItem.innerHTML = `
            <div class="sat-name">${sat.name || satId}</div>
            <div class="sat-info">ID: ${satId} | NORAD: ${sat.noradId || 'N/A'}</div>
        `;
        listItem.addEventListener('click', () => {
            document.querySelectorAll('.satellite-item').forEach(i => i.classList.remove('active'));
            listItem.classList.add('active');
            selectSatellite(satId);
            if (sat.noradId) {
                showSatelliteEducationCard(sat.noradId);
            }
        });
        satelliteList.appendChild(listItem);
    });
}

// Use viewer.trackedEntity = entity to lock camera — keep entity persistent so tracking doesn't break
function selectSatellite(satId) {
    const entity = viewer.entities.getById(satId);
    if (entity) {
        // Smoothly fly to the satellite, then set trackedEntity so updates continue
        viewer.flyTo(entity, {
            duration: 2.0,
            offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 500000)
        }).then(() => {
            viewer.trackedEntity = entity;
            isTracking = true;
            showNotification(`Tracking ${satId.toUpperCase()}`);
        }).catch(() => {
            // fallback: directly set trackedEntity
            viewer.trackedEntity = entity;
            isTracking = true;
            showNotification(`Tracking ${satId.toUpperCase()}`);
        });
    } else {
        addConsoleOutput(`⚠️ Satellite ${satId} not loaded yet`);
    }
}

// Telemetry display (uses trackedEntity to read position each second)
function updateTelemetryDisplayForTracked() {
    if (!viewer.trackedEntity) return;
    const satId = viewer.trackedEntity.id;
    const entity = viewer.trackedEntity;
    const pos = entity.position.getValue(viewer.clock.currentTime);
    if (pos) {
        const cart = Cesium.Cartographic.fromCartesian(pos);
        const lat = Cesium.Math.toDegrees(cart.latitude).toFixed(4);
        const lon = Cesium.Math.toDegrees(cart.longitude).toFixed(4);
        const alt = (cart.height / 1000).toFixed(2);
        console.log(`Telemetry — ${satId}: Lat ${lat}, Lon ${lon}, Alt ${alt} km`);
    }
}

// Poll telemetry if tracking
setInterval(() => {
    if (isTracking && viewer.trackedEntity) updateTelemetryDisplayForTracked();
}, 1000);

// =========== DSL COMMAND EXECUTION ===========
commandInput && commandInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        const text = commandInput.value.trim();
        if (text) {
            await executeCommand(text);
            commandInput.value = '';
        }
    }
});

async function executeCommand(dslCommand) {
    addConsoleOutput(`<span class="prompt">satops></span> ${dslCommand}`);
    try {
        const response = await fetch(DSL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: dslCommand
        });
        const result = await response.text();
        result.split('\n').forEach(line => {
            if (line.trim()) addConsoleOutput(line);
        });

        // Refresh satellites and history after command
        await loadSatellitesFromDB();
        await loadCommandHistory();
    } catch (error) {
        addConsoleOutput('❌ Error: ' + (error.message || error));
    }
    consoleOutput && (consoleOutput.scrollTop = consoleOutput.scrollHeight);
}

// =========== COMMAND HISTORY ===========
async function loadCommandHistory() {
    try {
        const response = await fetch(`${API_BASE}/command-history`);
        const history = await response.json();
        if (!history || history.length === 0) {
            if (commandHistory) commandHistory.innerHTML = '<div style="color: #aaa; padding: 10px; text-align: center;">No commands yet</div>';
            return;
        }
        if (!commandHistory) return;
        commandHistory.innerHTML = '';
        history.slice(0, 10).forEach(cmd => {
            const item = document.createElement('div');
            item.className = 'history-item';
            const time = new Date(cmd.executedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            item.innerHTML = `<span class="history-time">${time}</span><span class="history-command">${cmd.command}</span>`;
            commandHistory.appendChild(item);
        });
    } catch (err) {
        console.error('Error loading history:', err);
    }
}

// =========== BACKEND HEALTH ===========
async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        if (data.status === 'UP') {
            connectionStatus && connectionStatus.classList.remove('offline');
            networkStatusText && (networkStatusText.textContent = 'ONLINE');
            addConsoleOutput('✅ Backend connected');
            return true;
        }
    } catch (err) {
        connectionStatus && connectionStatus.classList.add('offline');
        networkStatusText && (networkStatusText.textContent = 'OFFLINE');
        addConsoleOutput('❌ Backend offline');
        return false;
    }
    return false;
}

// =========== SATELLITE EDUCATION CARD (keeps your original function) ===========
async function showSatelliteEducationCard(noradId) {
    try {
        const response = await fetch(`${API_BASE}/satellite-info/${noradId}`);
        if (!response.ok) {
            console.error('Failed to fetch satellite info:', response.status);
            return;
        }
        const info = await response.json();
        const existing = document.getElementById('education-card-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'education-card-overlay';
        overlay.innerHTML = `
            <div style="position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.8); z-index:99999; display:flex; align-items:center; justify-content:center;" onclick="this.parentElement.remove()">
                <div style="background: linear-gradient(135deg, rgba(0,20,40,0.98), rgba(0,40,80,0.98)); border:2px solid #00ffff; border-radius:15px; padding:20px; max-width:600px; max-height:90vh; overflow-y:auto; font-family: monospace; position: relative;" onclick="event.stopPropagation()">
                    <button onclick="document.getElementById('education-card-overlay').remove()" style="position:absolute; top:10px; right:10px; background: rgba(255,0,0,0.2); border:1px solid #ff0000; color:#ff0000; width:30px; height:30px; border-radius:50%; cursor:pointer;">×</button>
                    <div style="text-align:center; margin-bottom:10px;">
                        <div style="font-size:48px;">${info.icon || ''}</div>
                        <h2 style="color:#00ffff; margin:6px 0;">${info.name || ''}</h2>
                        <div style="color:#aaa; font-size:14px;">${info.type || ''} • ${info.country || ''}</div>
                    </div>
                    <div style="background: rgba(0,0,0,0.3); padding:10px; border-radius:8px; margin:10px 0;">
                        <h3 style="color:#00ffff; margin:0 0 6px 0;">📊 Orbital Parameters</h3>
                        <div style="color:#fff; line-height:1.6;">
                            <p style="margin:4px 0;"><b>Orbit Type:</b> ${info.orbitType || 'N/A'}</p>
                            <p style="margin:4px 0;"><b>Altitude:</b> ${(info.altitudeKm || 0).toFixed(2)} km</p>
                            <p style="margin:4px 0;"><b>Velocity:</b> ${(info.velocity || 0).toFixed(2)} km/s</p>
                            <p style="margin:4px 0;"><b>Current Position:</b> ${(info.latitude || 0).toFixed(4)}°, ${(info.longitude || 0).toFixed(4)}°</p>
                        </div>
                    </div>
                    <div style="background: rgba(0,0,0,0.3); padding:10px; border-radius:8px; margin:10px 0;">
                        <h3 style="color:#00ffff; margin:0 0 6px 0;">🎯 Mission Purpose</h3>
                        <p style="color:#fff; margin:0;">${info.purpose || ''}</p>
                        <p style="color:#fff; margin-top:6px;">${info.missionDescription || ''}</p>
                    </div>
                    <div style="background: rgba(0,0,0,0.3); padding:10px; border-radius:8px; margin:10px 0;">
                        <h3 style="color:#00ffff; margin:0 0 6px 0;">💡 Fun Facts</h3>
                        ${(info.funFacts || []).map(f => `<p style="color:#fff; margin:6px 0;">• ${f}</p>`).join('')}
                    </div>
                    <button onclick="document.getElementById('education-card-overlay').remove()" style="width:100%; padding:10px; border-radius:20px; border:none; background: linear-gradient(90deg,#00ffff,#0080ff); color:#000; font-weight:bold;">Got it! Start Mission 🚀</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        setTimeout(() => {
            const card = document.getElementById('education-card-overlay');
            if (card) card.remove();
        }, 45000);
    } catch (error) {
        console.error('Error showing satellite info:', error);
        addConsoleOutput('❌ Failed to load satellite info from N2YO');
    }
}

// =========== KEYBOARD SHORTCUTS ===========
document.addEventListener('keydown', (e) => {
    if (document.activeElement === commandInput) return;
    switch (e.key) {
        case 'Escape':
            viewer.trackedEntity = undefined;
            isTracking = false;
            showNotification('Free roam mode');
            break;
        case 'p':
        case 'P':
            viewer.clock.shouldAnimate = !viewer.clock.shouldAnimate;
            showNotification(viewer.clock.shouldAnimate ? 'Time resumed' : 'Time paused');
            break;
        case '+':
        case '=':
            viewer.clock.multiplier = Math.min(viewer.clock.multiplier * 2, 1000);
            showNotification(`Speed: ${viewer.clock.multiplier}x`);
            break;
        case '-':
        case '_':
            viewer.clock.multiplier = Math.max(viewer.clock.multiplier / 2, 0.1);
            showNotification(`Speed: ${viewer.clock.multiplier}x`);
            break;
        case 'h':
        case 'H':
            viewer.camera.flyHome(2);
            viewer.trackedEntity = undefined;
            isTracking = false;
            break;
    }
});

// =========== SYSTEM TIME ===========
function updateSystemTime() {
    const now = new Date();
    if (systemTime) systemTime.textContent = formatTime(now);
}
setInterval(updateSystemTime, 1000);
updateSystemTime();

// =========== INITIALIZATION ===========
(async function init() {
    addConsoleOutput('🚀 SatOpsDSL v2.0 (optimized) — loading...');
    addConsoleOutput('📡 Connecting to backend...');

    const connected = await checkBackendHealth();
    if (!connected) {
        addConsoleOutput('⚠️ Backend offline (continuing in offline mode)');
    }

    // Load ground stations & satellites
    await loadGroundStations();
    await loadSatellitesFromDB();
    renderSatelliteList();
    await loadCommandHistory();

    // Update communication links regularly (but links themselves are dynamic callbacks, not recreations)
    await updateCommunicationLinks();
    setInterval(updateCommunicationLinks, 3000);

    // Periodically refresh satellites (fetch but do not recreate unless new)
    setInterval(async () => {
        await loadSatellitesFromDB();
        renderSatelliteList();
    }, 15000); // 15s refresh to pick up new deployments (tweak as needed)

    // Periodically refresh command history
    setInterval(loadCommandHistory, 10000);

    addConsoleOutput('✅ System ready. Use DSL commands or click a satellite to track.');
    addConsoleOutput('💡 Example: deploy iss with id 25544;');
})();

