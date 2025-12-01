// ============================================
// API CONFIGURATION
// ============================================
// const API_BASE = 'http://localhost:1302/api/frontend';
// const DSL_ENDPOINT = 'http://localhost:1302/dsl/run';
// /api/ping
const API_BASE = "https://supreme-eureka-h5f8.onrender.com/api/frontend";
const DSL_ENDPOINT = "https://supreme-eureka-h5f8.onrender.com/dsl/run";
// ============================================
// CESIUM VIEWER INITIALIZATION
// ============================================
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxYWZiNDJkNy0yZWEwLTQ5OWQtYjk0MS0xOThlMTIxMDg1YTgiLCJpZCI6MzMyOTY1LCJpYXQiOjE3NTU1MTcyNzR9.raBDIk08ACyJ5JbAiqca_PFRHh1MyGLi3Bqfej5sL9Q";

/* const viewer = new Cesium.Viewer('cesiumContainer', {
        animation: true,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: true,
        infoBox: true,
        imageryProvider: new Cesium.OpenStreetMapImageryProvider({
            url: 'https://a.tile.openstreetmap.org/'
        }),
        sceneModePicker: false,
        selectionIndicator: true,
        timeline: true,
        navigationHelpButton: false,
        scene3DOnly: true,
        terrainProvider: Cesium.createWorldTerrain()
    });

    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.depthTestAgainstTerrain = false;
    viewer.scene.backgroundColor = Cesium.Color.BLACK;
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.clock.shouldAnimate = true;
    viewer.clock.multiplier = 1;*/

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: Cesium.createWorldTerrain(),
  baseLayerPicker: false,
  geocoder: false,
  timeline: false,
  animation: false,
  fullscreenButton: false,
  homeButton: false,
  navigationHelpButton: false,
  sceneModePicker: false,
  infoBox: false,
  selectionIndicator: false,

  imageryProvider: new Cesium.IonImageryProvider({ assetId: 3 }), // Bing high-res imagery
});

// Enable atmospheric effects
viewer.scene.skyAtmosphere.show = true;

// Enable beautiful shadows
viewer.shadows = true;
viewer.scene.globe.enableLighting = true;

// Enable water specular reflections
viewer.scene.globe.enableLighting = true;
viewer.scene.globe.showWaterEffect = true;

// HDR + Bloom
viewer.scene.highDynamicRange = true;
viewer.scene.bloomEnabled = true;

// Enable MSAA for smooth edges (Cesium 1.90+)
viewer.scene.msaaSamples = 4;

// Eye candy tone mapping
viewer.scene.gamma = 1.8;
viewer.scene.minimumBrightness = 0.4;

viewer.scene.globe.enableLighting = true;
viewer.scene.globe.nightFadeIn = 0.2;
viewer.scene.globe.nightFadeOut = 0.6;

viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(78, 20, 20000000),
  orientation: {
    heading: 0,
    pitch: -1.57,
    roll: 0,
  },
});

// ============================================
// ENHANCED CAMERA CONTROLS
// ============================================
let isTracking = false;

// Smooth camera flyTo function
function flyToSatellite(satId, duration = 2) {
  const entity = viewer.entities.getById(satId);
  if (entity) {
    viewer
      .flyTo(entity, {
        duration: duration,
        offset: new Cesium.HeadingPitchRange(
          0,
          Cesium.Math.toRadians(-45),
          5000000 // 5000 km distance
        ),
      })
      .then(() => {
        isTracking = true;
        showNotification(`Tracking ${satId.toUpperCase()}`);
      });
  }
}

// ============================================
// ENHANCED SOLAR SYSTEM VISUALIZATION
// ============================================

function createEnhancedSolarSystem() {
  const currentDate = Cesium.JulianDate.now();

  // More accurate planetary data (semi-major axis in meters, orbital periods in Earth days)
  const planets = [
    {
      name: "Mercury",
      color: Cesium.Color.fromCssColorString("#8C7853"),
      radius: 2439700,
      distance: 57.9e9,
      period: 88,
      size: 8,
      inclination: 7.0,
      description: "Closest planet to the Sun",
    },
    {
      name: "Venus",
      color: Cesium.Color.fromCssColorString("#FFC649"),
      radius: 6051800,
      distance: 108.2e9,
      period: 225,
      size: 12,
      inclination: 3.4,
      description: "Earth's sister planet",
    },
    {
      name: "Earth",
      color: Cesium.Color.fromCssColorString("#6B93D6"),
      radius: 6371000,
      distance: 149.6e9,
      period: 365.25,
      size: 12,
      inclination: 0.0,
      description: "Our home planet",
    },
    {
      name: "Mars",
      color: Cesium.Color.fromCssColorString("#CD5C5C"),
      radius: 3389500,
      distance: 227.9e9,
      period: 687,
      size: 10,
      inclination: 1.8,
      description: "The red planet",
    },
    {
      name: "Jupiter",
      color: Cesium.Color.fromCssColorString("#D8CA9D"),
      radius: 69911000,
      distance: 778.5e9,
      period: 4333,
      size: 20,
      inclination: 1.3,
      description: "Largest planet in solar system",
    },
    {
      name: "Saturn",
      color: Cesium.Color.fromCssColorString("#F4A460"),
      radius: 58232000,
      distance: 1434e9,
      period: 10759,
      size: 18,
      inclination: 2.5,
      description: "Famous for its rings",
    },
    {
      name: "Uranus",
      color: Cesium.Color.fromCssColorString("#4FD0E7"),
      radius: 25362000,
      distance: 2871e9,
      period: 30687,
      size: 15,
      inclination: 0.8,
      description: "Ice giant tilted on its side",
    },
    {
      name: "Neptune",
      color: Cesium.Color.fromCssColorString("#4B70DD"),
      radius: 24622000,
      distance: 4495e9,
      period: 60190,
      size: 15,
      inclination: 1.8,
      description: "The windiest planet",
    },
  ];

  // Add the Sun at center
  viewer.entities.add({
    name: "Sun",
    position: Cesium.Cartesian3.ZERO,
    point: {
      pixelSize: 25,
      color: Cesium.Color.YELLOW,
      outlineColor: Cesium.Color.ORANGE,
      outlineWidth: 2,
      scaleByDistance: new Cesium.NearFarScalar(1e9, 1.0, 1e12, 0.3),
    },
    label: {
      text: "SUN",
      font: "16pt monospace",
      fillColor: Cesium.Color.YELLOW,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -25),
      scale: 0.8,
    },
  });

  planets.forEach((planet) => {
    // Enhanced orbital position with inclination
    const positionProperty = new Cesium.CallbackProperty(function (
      time,
      result
    ) {
      const daysSinceStart = Cesium.JulianDate.daysDifference(
        time,
        currentDate
      );
      const angle = (daysSinceStart / planet.period) * 2 * Math.PI;

      // Add orbital inclination
      const inclination = Cesium.Math.toRadians(planet.inclination);

      const x = planet.distance * Math.cos(angle);
      const y = planet.distance * Math.sin(angle) * Math.cos(inclination);
      const z = planet.distance * Math.sin(angle) * Math.sin(inclination);

      return new Cesium.Cartesian3(x, y, z);
    },
    false);

    // Create planet entity with enhanced visuals
    const planetEntity = viewer.entities.add({
      name: planet.name,
      position: positionProperty,
      point: {
        pixelSize: planet.size,
        color: planet.color,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.7),
        outlineWidth: 1,
        scaleByDistance: new Cesium.NearFarScalar(1e9, 1.5, 1e12, 0.3),
        heightReference: Cesium.HeightReference.NONE,
      },
      label: {
        text: planet.name.toUpperCase(),
        font: "12pt monospace",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -planet.size - 5),
        scaleByDistance: new Cesium.NearFarScalar(1e9, 1.0, 1e12, 0.0),
        translucencyByDistance: new Cesium.NearFarScalar(1e9, 1.0, 1e12, 0.0),
      },
      description: `
                    <div style="padding: 15px; font-family: monospace; background: rgba(0,0,0,0.8); border: 1px solid #00ffff;">
                        <h2 style="color: #00ffff; margin: 0 0 10px 0;">${
                          planet.name
                        }</h2>
                        <p style="margin: 5px 0; color: #aaa;">${
                          planet.description
                        }</p>
                        <hr style="border-color: #00ffff; margin: 10px 0;">
                        <p style="margin: 5px 0;"><b>Distance from Sun:</b> <span style="color: #00ffaa;">${(
                          planet.distance / 1e9
                        ).toFixed(1)} million km</span></p>
                        <p style="margin: 5px 0;"><b>Orbital Period:</b> <span style="color: #00ffaa;">${
                          planet.period
                        } days</span></p>
                        <p style="margin: 5px 0;"><b>Radius:</b> <span style="color: #00ffaa;">${(
                          planet.radius / 1000
                        ).toFixed(0)} km</span></p>
                        <p style="margin: 5px 0;"><b>Orbital Inclination:</b> <span style="color: #00ffaa;">${
                          planet.inclination
                        }°</span></p>
                    </div>
                `,
    });

    // Enhanced orbital path with better visibility
    const orbitPoints = [];
    const segments = 200; // More segments for smoother orbit

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const inclination = Cesium.Math.toRadians(planet.inclination);

      const x = planet.distance * Math.cos(angle);
      const y = planet.distance * Math.sin(angle) * Math.cos(inclination);
      const z = planet.distance * Math.sin(angle) * Math.sin(inclination);

      orbitPoints.push(new Cesium.Cartesian3(x, y, z));
    }

    viewer.entities.add({
      name: planet.name + " Orbit",
      polyline: {
        positions: orbitPoints,
        width: 1.5,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.2,
          color: planet.color.withAlpha(0.4),
        }),
        arcType: Cesium.ArcType.NONE,
        clampToGround: false,
      },
    });

    // Add orbital period information
    viewer.entities.add({
      name: planet.name + " Period Marker",
      position: new Cesium.CallbackProperty(function (time) {
        const daysSinceStart = Cesium.JulianDate.daysDifference(
          time,
          currentDate
        );
        const angle = (daysSinceStart / planet.period) * 2 * Math.PI;
        const x = planet.distance * Math.cos(angle);
        const y = planet.distance * Math.sin(angle);
        return new Cesium.Cartesian3(x, y, 0);
      }, false),
      label: {
        text: `${planet.period}d`,
        font: "10pt monospace",
        fillColor: planet.color,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1,
        pixelOffset: new Cesium.Cartesian2(15, 0),
        scale: 0.7,
      },
    });
  });

  // Add asteroid belt between Mars and Jupiter
  createAsteroidBelt();
}
// ============================================
// SHOW SATELLITE EDUCATION CARD (N2YO API)
// ============================================
async function showSatelliteEducationCard(noradId) {
  try {
    console.log("Fetching satellite info for NORAD:", noradId);

    const response = await fetch(`${API_BASE}/satellite-info/${noradId}`);

    if (!response.ok) {
      console.error("Failed to fetch satellite info:", response.status);
      return;
    }

    const info = await response.json();
    console.log("Satellite info received:", info);

    // Remove any existing card
    const existing = document.getElementById("education-card-overlay");
    if (existing) existing.remove();

    // Create overlay + card
    const overlay = document.createElement("div");
    overlay.id = "education-card-overlay";
    overlay.innerHTML = `
            <!-- Dark overlay background -->
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease-out;
            " onclick="this.parentElement.remove()">
                
                <!-- Education Card -->
                <div style="
                    background: linear-gradient(135deg, rgba(0, 20, 40, 0.98), rgba(0, 40, 80, 0.98));
                    border: 2px solid #00ffff;
                    border-radius: 15px;
                    padding: 30px;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 0 50px rgba(0, 255, 255, 0.5);
                    animation: slideIn 0.5s ease-out;
                    font-family: monospace;
                    position: relative;
                " onclick="event.stopPropagation()">
                    
                    <!-- Close button -->
                    <button onclick="document.getElementById('education-card-overlay').remove()" style="
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        background: rgba(255, 0, 0, 0.2);
                        border: 1px solid #ff0000;
                        color: #ff0000;
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 18px;
                        line-height: 1;
                    ">×</button>
                    
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 48px;">${info.icon}</div>
                        <h2 style="color: #00ffff; margin: 10px 0;">${
                          info.name
                        }</h2>
                        <div style="color: #aaa; font-size: 14px;">${
                          info.type
                        } • ${info.country}</div>
                    </div>
                    
                    <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="color: #00ffff; margin: 0 0 10px 0;">📊 Orbital Parameters</h3>
                        <div style="color: #fff; line-height: 1.8;">
                            <p style="margin: 5px 0;"><b>Orbit Type:</b> ${
                              info.orbitType
                            }</p>
                            <p style="margin: 5px 0;"><b>Altitude:</b> ${info.altitudeKm.toFixed(
                              2
                            )} km</p>
                            <p style="margin: 5px 0;"><b>Velocity:</b> ${info.velocity.toFixed(
                              2
                            )} km/s</p>
                            <p style="margin: 5px 0;"><b>Current Position:</b> ${info.latitude.toFixed(
                              4
                            )}°, ${info.longitude.toFixed(4)}°</p>
                        </div>
                    </div>
                    
                    <div style="background: rgba(0, 100, 200, 0.2); padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="color: #00ffff; margin: 0 0 10px 0;">🎯 Mission Purpose</h3>
                        <p style="color: #fff; line-height: 1.6; margin: 0;"><b>${
                          info.purpose
                        }</b></p>
                        <p style="color: #fff; line-height: 1.6; margin: 10px 0 0 0;">${
                          info.missionDescription
                        }</p>
                    </div>
                    
                    <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="color: #00ffff; margin: 0 0 10px 0;">💡 Fun Facts</h3>
                        ${info.funFacts
                          .map(
                            (fact) =>
                              `<p style="color: #fff; margin: 8px 0;">• ${fact}</p>`
                          )
                          .join("")}
                    </div>
                    
                    <button onclick="document.getElementById('education-card-overlay').remove()" style="
                        background: linear-gradient(90deg, #00ffff, #0080ff);
                        border: none;
                        padding: 12px 30px;
                        border-radius: 25px;
                        color: #000;
                        font-weight: bold;
                        cursor: pointer;
                        width: 100%;
                        font-size: 16px;
                        margin-top: 20px;
                    ">Got it! Start Mission 🚀</button>
                </div>
            </div>
        `;

    document.body.appendChild(overlay);

    // Auto-remove after 45 seconds
    setTimeout(() => {
      const card = document.getElementById("education-card-overlay");
      if (card) card.remove();
    }, 45000);
  } catch (error) {
    console.error("Error showing satellite info:", error);
    addConsoleOutput("❌ Failed to load satellite info from N2YO");
  }
}

function createAsteroidBelt() {
  const beltInnerRadius = 329e9; // 329 million km
  const beltOuterRadius = 478e9; // 478 million km

  // Create a representative asteroid belt visualization
  for (let i = 0; i < 50; i++) {
    const distance =
      beltInnerRadius + Math.random() * (beltOuterRadius - beltInnerRadius);
    const angle = Math.random() * Math.PI * 2;

    const positionProperty = new Cesium.CallbackProperty(function (
      time,
      result
    ) {
      const daysSinceStart = Cesium.JulianDate.daysDifference(
        time,
        Cesium.JulianDate.now()
      );
      const orbitSpeed = 0.1 + Math.random() * 0.2; // Varying speeds

      const currentAngle =
        angle + (daysSinceStart / 1680) * orbitSpeed * 2 * Math.PI;
      const x = distance * Math.cos(currentAngle);
      const y = distance * Math.sin(currentAngle);

      return new Cesium.Cartesian3(x, y, 0);
    },
    false);

    viewer.entities.add({
      position: positionProperty,
      point: {
        pixelSize: 1 + Math.random() * 2,
        color: Cesium.Color.GRAY.withAlpha(0.7),
        outlineColor: Cesium.Color.DARKGRAY,
        outlineWidth: 0.5,
      },
    });
  }
}

// Enhanced solar system view controls
function flyToSolarSystemView() {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromElements(0, -8e11, 3e11), // Better viewing angle
    orientation: {
      heading: 0,
      pitch: -0.8, // Better perspective
      roll: 0,
    },
    duration: 4,
    complete: function () {
      showNotification("Solar System View - Press H for Earth view");
    },
  });
}

// Add solar system scale information
function showSolarSystemScale() {
  addConsoleOutput("Solar System Scale:");
  addConsoleOutput("• 1 AU = 149.6 million km");
  addConsoleOutput("• Inner Planets: Mercury to Mars");
  addConsoleOutput("• Outer Planets: Jupiter to Neptune");
  addConsoleOutput("• Distances not to scale for visibility");
}

// Enable Sun and Moon (Cesium built-in)
viewer.scene.sun = new Cesium.Sun();
viewer.scene.moon = new Cesium.Moon();

// Add realistic starfield background
viewer.scene.skyBox = new Cesium.SkyBox({
  sources: {
    positiveX:
      "https://cesium.com/downloads/cesiumjs/releases/1.95/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_px.jpg",
    negativeX:
      "https://cesium.com/downloads/cesiumjs/releases/1.95/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_mx.jpg",
    positiveY:
      "https://cesium.com/downloads/cesiumjs/releases/1.95/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_py.jpg",
    negativeY:
      "https://cesium.com/downloads/cesiumjs/releases/1.95/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_my.jpg",
    positiveZ:
      "https://cesium.com/downloads/cesiumjs/releases/1.95/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_pz.jpg",
    negativeZ:
      "https://cesium.com/downloads/cesiumjs/releases/1.95/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_mz.jpg",
  },
});

// Initialize enhanced solar system
createEnhancedSolarSystem();

// Add keyboard shortcut to zoom out to solar system view
document.addEventListener("keydown", (e) => {
  if (e.key === "s" || e.key === "S") {
    flyToSolarSystemView();
  }
});

// Stop tracking and return to free roam
function stopTracking() {
  viewer.trackedEntity = undefined;
  isTracking = false;
  showNotification("Free roam mode");
}

// ============================================

// ============================================
document.addEventListener("keydown", (e) => {
  // ❌ REMOVE Space bar pause/resume (it interferes with typing)
  // Only trigger shortcuts when NOT typing in input field
  if (document.activeElement === commandInput) {
    return; // Don't trigger shortcuts when typing
  }

  switch (e.key) {
    case "Escape":
      stopTracking();
      break;
    case "p": // ✅ Changed from Space to P key
    case "P":
      viewer.clock.shouldAnimate = !viewer.clock.shouldAnimate;
      showNotification(
        viewer.clock.shouldAnimate ? "Time resumed" : "Time paused"
      );
      break;
    case "+":
    case "=":
      viewer.clock.multiplier = Math.min(viewer.clock.multiplier * 2, 1000);
      showNotification(`Speed: ${viewer.clock.multiplier}x`);
      break;
    case "-":
    case "_":
      viewer.clock.multiplier = Math.max(viewer.clock.multiplier / 2, 0.1);
      showNotification(`Speed: ${viewer.clock.multiplier}x`);
      break;
    // case 'h':
    // case 'H':
    //     viewer.camera.flyHome(2);
    //     stopTracking();
    case "h":
    case "H":
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(78.9629, 20.5937, 20000000),
        duration: 2,
      });
      stopTracking();
      showNotification("Centered on India");
      break;

      break;
    case "s":
    case "S":
      // Solar system view
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromElements(0, -5e11, 2e11),
        duration: 3,
      });
      showNotification("Solar System View");
      break;
  }
});

// ============================================
// ENHANCED SATELLITE SELECTION
// ============================================

function selectSatellite(satId) {
  const sat = satellites.find((s) => (s.satelliteId || s.id) === satId);
  if (sat) {
    flyToSatellite(satId);

    // Update telemetry display
    updateTelemetryDisplay(sat);
  }
}

// Show real-time telemetry for selected satellite
function updateTelemetryDisplay(satellite) {
  const satId = satellite.satelliteId || satellite.id;
  const entity = viewer.entities.getById(satId);

  if (entity) {
    // Update telemetry every frame
    const updateInterval = setInterval(() => {
      if (!viewer.trackedEntity || viewer.trackedEntity.id !== satId) {
        clearInterval(updateInterval);
        return;
      }

      const position = entity.position.getValue(viewer.clock.currentTime);
      if (position) {
        const cartographic = Cesium.Cartographic.fromCartesian(position);
        const lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4);
        const lon = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4);
        const alt = (cartographic.height / 1000).toFixed(2);

        // You can update a telemetry panel here
        console.log(`${satId} - Lat: ${lat}, Lon: ${lon}, Alt: ${alt} km`);
      }
    }, 1000);
  }
}

// ============================================
// DOM ELEMENTS
// ============================================
const commandInput = document.getElementById("command-input");
const consoleOutput = document.getElementById("console-output");
const satelliteList = document.getElementById("satellite-list");
const commandHistory = document.getElementById("command-history");
const systemTime = document.getElementById("system-time");
const notification = document.getElementById("notification");
const connectionStatus = document.getElementById("connection-status");
const networkStatusText = document.getElementById("network-status-text");
const activeSatellitesCount = document.getElementById("active-satellites");

// ============================================
// STATE MANAGEMENT
// ============================================
let satellites = [];
let selectedSatellite = null;

// ============================================
// REAL-TIME SATELLITE TRAIL FUNCTION REMOVED
// ============================================
// The 'createSatelliteTrail' function was causing the 'undefined' height crash.
// It has been removed to ensure stability.

// ============================================
// ANIMATED ORBIT VISUALIZATION
// ============================================

// Deterministic color per satellite id (stable between updates)
// Stable deterministic orbit color for each satellite
function getStableOrbitColor(id, alpha = 0.9) {
  // Hash id string → integer
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }

  // Map hash → hue 0..359 (unique color region)
  const hue = Math.abs(hash) % 360;

  // Convert HSL to Cesium color (stable & readable)
  return Cesium.Color.fromHsl(hue / 80, 0.85, 0.6).withAlpha(alpha);
}

function createSatelliteEntityWithOrbit(satellite) {
  const satId = satellite.satelliteId || satellite.id;
  const existing = viewer.entities.getById(satId);
  if (existing) {
    viewer.entities.remove(existing);
  }

  // Remove old orbit path if exists
  const oldOrbit = viewer.entities.getById(satId + "_orbit");
  if (oldOrbit) {
    viewer.entities.remove(oldOrbit);
  }

  if (
    !satellite.tleLine1 ||
    !satellite.tleLine2 ||
    satellite.tleLine1.length < 50 ||
    satellite.tleLine2.length < 50
  ) {
    console.warn("Invalid TLE for " + satId);
    return createSimpleSatellite(satellite);
  }

  try {
    console.log("🛰️ Creating animated orbit for " + satId);

    const satrec = window.satellite.twoline2satrec(
      satellite.tleLine1,
      satellite.tleLine2
    );

    if (!satrec || satrec.error) {
      console.error("TLE parsing error for " + satId);
      return createSimpleSatellite(satellite);
    }

    // Create callback for real-time position
    const positionProperty = new Cesium.CallbackProperty(function (
      time,
      result
    ) {
      const jsDate = Cesium.JulianDate.toDate(time);
      const positionAndVelocity = window.satellite.propagate(satrec, jsDate);

      if (positionAndVelocity.position && !positionAndVelocity.position.error) {
        const positionEci = positionAndVelocity.position;
        const gmst = window.satellite.gstime(jsDate);
        const positionGd = window.satellite.eciToGeodetic(positionEci, gmst);

        const longitude = positionGd.longitude * (180 / Math.PI);
        const latitude = positionGd.latitude * (180 / Math.PI);
        const height = positionGd.height * 1000;

        return Cesium.Cartesian3.fromDegrees(
          longitude,
          latitude,
          height,
          Cesium.Ellipsoid.WGS84,
          result
        );
      }
      return Cesium.Cartesian3.ZERO;
    },
    false);

    // ✅ FIXED: Generate complete orbital path centered on Earth
    const orbitPositions = [];
    const startDate = new Date();

    // Calculate orbital period from TLE mean motion
    const meanMotion = satrec.no; // radians per minute
    const orbitalPeriod = ((2 * Math.PI) / meanMotion) * 60; // seconds

    const numPoints = 120; // More points for smoother orbit

    for (let i = 0; i <= numPoints; i++) {
      const timeOffset = (orbitalPeriod / numPoints) * i;
      const date = new Date(startDate.getTime() + timeOffset * 1000);

      const positionAndVelocity = window.satellite.propagate(satrec, date);

      if (positionAndVelocity.position && !positionAndVelocity.position.error) {
        const positionEci = positionAndVelocity.position;
        const gmst = window.satellite.gstime(date);
        const positionGd = window.satellite.eciToGeodetic(positionEci, gmst);

        const longitude = positionGd.longitude * (180 / Math.PI);
        const latitude = positionGd.latitude * (180 / Math.PI);
        const height = positionGd.height * 1000;

        // ✅ Create position from Earth center (WGS84 ellipsoid)
        const position = Cesium.Cartesian3.fromDegrees(
          longitude,
          latitude,
          height,
          Cesium.Ellipsoid.WGS84
        );

        orbitPositions.push(position);
      }
    }

    // ✅ Only create orbit path if we have valid positions
    const orbitColor = Cesium.Color.fromRandom({ alpha: 0.9 });

    if (orbitPositions.length > 10) {
      viewer.entities.add({
        id: satId + "_orbit",
        polyline: {
          positions: orbitPositions,
          width: 4,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.35,
            taperPower: 0.3,
            color: getStableOrbitColor(satId), // << stable unique color per sat
          }),
          clampToGround: false,
          arcType: Cesium.ArcType.NONE,
        },
      });

      console.log(`✅ Orbit path created with ${orbitPositions.length} points`);
    } else {
      console.warn(
        `⚠️ Not enough valid positions for orbit: ${orbitPositions.length}`
      );
    }

    // Create satellite entity with billboard (satellite icon)
    const entity = viewer.entities.add({
      id: satId,
      name: satellite.name,
      position: positionProperty,

      // ✅ Satellite icon instead of dot
      billboard: {
        image:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCI+PHBhdGggZmlsbD0iIzAwZmZmZiIgZD0iTTMyIDhsLTggOGg2djEyaC00djRoNHYxMmgtNmw4IDggOC04aC02VjI4aDR2LTRoLTRWMTJoNmwtOC04eiIvPjwvc3ZnPg==",
        width: 24,
        height: 24,
        color: Cesium.Color.CYAN,
        heightReference: Cesium.HeightReference.NONE,
        scaleByDistance: new Cesium.NearFarScalar(1.5e6, 1.5, 8.0e6, 0.5),
        pixelOffset: new Cesium.Cartesian2(0, 0),
      },

      // Label only appears when zoomed in
      label: {
        text: satId.toUpperCase(),
        font: "12pt monospace",
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -12),
        fillColor: Cesium.Color.CYAN,
        outlineColor: Cesium.Color.BLACK,
        showBackground: false,
        scaleByDistance: new Cesium.NearFarScalar(1.5e6, 1.0, 8.0e6, 0.0),
        translucencyByDistance: new Cesium.NearFarScalar(
          1.5e6,
          1.0,
          8.0e6,
          0.0
        ),
      },

      description: `
                <div style="font-family: monospace; color: #00ffff; padding: 10px;">
                    <h3 style="margin: 0 0 10px 0;">${satellite.name}</h3>
                    <p style="margin: 5px 0;"><b>ID:</b> ${satId}</p>
                    <p style="margin: 5px 0;"><b>NORAD:</b> ${
                      satellite.noradId
                    }</p>
                    <p style="margin: 5px 0;"><b>Status:</b> ${
                      satellite.status
                    }</p>
                    <p style="margin: 5px 0;"><b>Altitude:</b> ${
                      satellite.altitude
                        ? satellite.altitude.toFixed(2) + " km"
                        : "N/A"
                    }</p>
                </div>
            `,
    });

    console.log("✅ Animated orbit created for " + satId);
    return entity;
  } catch (error) {
    console.error("❌ Error creating orbit for " + satId + ":", error);
    return createSimpleSatellite(satellite);
  }
}

function createSimpleSatellite(satellite) {
  const satId = satellite.satelliteId || satellite.id;
  return viewer.entities.add({
    id: satId,
    name: satellite.name,
    position: Cesium.Cartesian3.fromDegrees(
      satellite.longitude || 0,
      satellite.latitude || 0,
      (satellite.altitude || 400) * 1000
    ),
    point: {
      pixelSize: 10,
      color: Cesium.Color.YELLOW,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
    },
    label: {
      text: satId.toUpperCase(),
      font: "14pt monospace",
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -15),
      fillColor: Cesium.Color.YELLOW,
      outlineColor: Cesium.Color.BLACK,
    },
  });
}

// ============================================
// API FUNCTIONS
// ============================================
async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    if (data.status === "UP") {
      connectionStatus.classList.remove("offline");
      networkStatusText.textContent = "ONLINE";
      addConsoleOutput("✅ Backend connected");
      console.log("backend online");
      return true;
    }
  } catch (error) {
    connectionStatus.classList.add("offline");
    networkStatusText.textContent = "OFFLINE";
    addConsoleOutput("❌ Backend offline");
    console.log("backend offline");
    return false;
  }
}

async function loadSatellitesFromDB() {
  try {
    const response = await fetch(`${API_BASE}/satellites`);
    const dbSatellites = await response.json();

    satellites = dbSatellites;
    activeSatellitesCount.textContent = satellites.length;

    if (satellites.length === 0) {
      satelliteList.innerHTML =
        '<li style="color: #aaa; padding: 20px; text-align: center;">No satellites deployed</li>';
    } else {
      renderSatelliteList();
      satellites.forEach((sat) => {
        createSatelliteEntityWithOrbit(sat);
      });
    }
  } catch (error) {
    addConsoleOutput("❌ Error loading satellites: " + error.message);
  }
}

async function loadCommandHistory() {
  try {
    const response = await fetch(`${API_BASE}/command-history`);
    const history = await response.json();

    if (history.length === 0) {
      commandHistory.innerHTML =
        '<div style="color: #aaa; padding: 10px; text-align: center;">No commands yet</div>';
    } else {
      commandHistory.innerHTML = "";
      history.slice(0, 10).forEach((cmd) => {
        const item = document.createElement("div");
        item.className = "history-item";
        const time = new Date(cmd.executedAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
        item.innerHTML = `<span class="history-time">${time}</span><span class="history-command">${cmd.command}</span>`;
        commandHistory.appendChild(item);
      });
    }
  } catch (error) {
    console.error("Error loading history:", error);
  }
}

function renderSatelliteList() {
  satelliteList.innerHTML = "";
  satellites.forEach((sat, index) => {
    const satId = sat.satelliteId || sat.id;
    const listItem = document.createElement("li");
    listItem.className = "satellite-item";
    listItem.style.animationDelay = `${index * 0.1}s`;
    listItem.innerHTML = `
            <div class="sat-name">${sat.name}</div>
            <div class="sat-info">ID: ${satId} | NORAD: ${sat.noradId}</div>
        `;

    // Better click interaction
    listItem.addEventListener("click", () => {
      document
        .querySelectorAll(".satellite-item")
        .forEach((i) => i.classList.remove("active"));
      listItem.classList.add("active");
      selectSatellite(satId);
    });

    // Add hover tooltip
    listItem.addEventListener("mouseenter", (e) => {
      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.textContent = "Click to track satellite";
      tooltip.style.left = e.pageX + 15 + "px";
      tooltip.style.top = e.pageY - 10 + "px";
      document.body.appendChild(tooltip);

      listItem.addEventListener(
        "mouseleave",
        () => {
          document.body.removeChild(tooltip);
        },
        { once: true }
      );
    });

    satelliteList.appendChild(listItem);
  });
}

function selectSatellite(satId) {
  const entity = viewer.entities.getById(satId);
  if (entity) {
    viewer.trackedEntity = entity;
  }
}

commandInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    const text = commandInput.value.trim();
    if (text) {
      await executeCommand(text);
      commandInput.value = "";
    }
  }
});

async function executeCommand(dslCommand) {
  addConsoleOutput(`<span class="prompt">satops></span> ${dslCommand}`);

  try {
    const response = await fetch(DSL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: dslCommand,
    });

    const result = await response.text();
    const lines = result.split("\n");
    lines.forEach((line) => {
      if (line.trim()) {
        addConsoleOutput(line);
      }
    });

    await loadSatellitesFromDB();
    await loadCommandHistory();
  } catch (error) {
    addConsoleOutput("❌ Error: " + error.message);
  }

  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}
// Fetch ground stations from backend
async function loadGroundStations() {
  try {
    const response = await fetch(`${API_BASE}/ground-stations`);
    const stations = await response.json();

    stations.forEach((station) => {
      viewer.entities.add({
        id: "gs_" + station.code,
        name: station.name,
        position: Cesium.Cartesian3.fromDegrees(
          station.longitude,
          station.latitude,
          0
        ),
        billboard: {
          image:
            "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCI+PHBhdGggZmlsbD0iIzAwZmYwMCIgZD0iTTI0IDRsMTIgMTJoLTZ2MTZoLTEyVjE2aC02bDEyLTEyek0xMiAzNmgyNHY0SDEyeiIvPjwvc3ZnPg==",
          width: 32,
          height: 32,
        },
        label: {
          text: station.code,
          font: "14pt monospace",
          fillColor: Cesium.Color.LIME,
        },
      });
    });

    console.log(`✅ Loaded ${stations.length} ground stations`);
  } catch (error) {
    console.error("Failed to load ground stations:", error);
  }
}

// Update communication links from backend
async function updateCommunicationLinks() {
  try {
    const response = await fetch(`${API_BASE}/communication-links`);
    const links = await response.json();

    // Remove old links
    viewer.entities.removeAll();
    await loadSatellitesFromDB();
    await loadGroundStations();

    // Draw new links
    links.forEach((link) => {
      const sat = viewer.entities.getById(link.satelliteId);
      const gs = viewer.entities.getById("gs_" + link.groundStationCode);

      if (sat && gs) {
        viewer.entities.add({
          polyline: {
            positions: [
              gs.position.getValue(Cesium.JulianDate.now()),
              sat.position.getValue(Cesium.JulianDate.now()),
            ],
            width: 3,
            material: Cesium.Color.fromCssColorString(link.linkColor),
          },
        });
      }
    });
  } catch (error) {
    console.error("Failed to update links:", error);
  }
}

// Initialize
loadGroundStations();
setInterval(updateCommunicationLinks, 3000);

function addConsoleOutput(text) {
  const line = document.createElement("div");
  line.className = "console-line";
  line.innerHTML = text;
  consoleOutput.appendChild(line);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function showNotification(msg) {
  notification.textContent = msg;
  notification.classList.add("show");
  setTimeout(() => notification.classList.remove("show"), 3000);
}

function updateSystemTime() {
  const now = new Date();

  // IST = UTC + 5 hours 30 minutes
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);

  const hh = String(istTime.getUTCHours()).padStart(2, "0");
  const mm = String(istTime.getUTCMinutes()).padStart(2, "0");
  const ss = String(istTime.getUTCSeconds()).padStart(2, "0");

  systemTime.textContent = `${hh}:${mm}:${ss} IST`;
}

setInterval(updateSystemTime, 1000);
updateSystemTime();

document.getElementById("console-toggle").addEventListener("click", () => {
  document.getElementById("console-panel").classList.toggle("minimized");
});

(async function init() {
  addConsoleOutput("🚀 SatOpsDSL v1.0");
  addConsoleOutput("📡 Connecting to backend...");

  const connected = await checkBackendHealth();

  if (connected) {
    await loadSatellitesFromDB();
    await loadCommandHistory();
    addConsoleOutput("✅ System ready. Use your DSL commands!");
    addConsoleOutput("💡 Example: deploy iss with id 25544;");

    // Show solar system info after initialization
    setTimeout(showSolarSystemScale, 5000);
  } else {
    addConsoleOutput("⚠️ Backend offline");
  }
})();

setInterval(loadCommandHistory, 10000);

// Auto-hide any "Click to track satellite" custom tooltip across the page.
// Works for dynamically created tooltips and for tooltips already present.
// Paste this at the end of app1.js (or inside your DOM-ready / init function).

(function () {
  const AUTO_HIDE_MS = 3000; // milliseconds before auto-hiding
  const FADEOUT_MS = 250; // should match CSS transition time below
  const TOOLTIP_TEXT = "Click to track satellite"; // matching text

  // Helper: checks if an element contains the tooltip phrase (case-insensitive)
  function isSatelliteTooltip(el) {
    if (!el || !el.textContent) return false;
    return el.textContent
      .trim()
      .toLowerCase()
      .includes(TOOLTIP_TEXT.toLowerCase());
  }

  // Hide tooltip with fadeout; if hovered, postpone hiding
  function scheduleHide(el, delay = AUTO_HIDE_MS) {
    if (!el) return;

    // Clear previous timer if present
    if (el.__autoHideTimer) {
      clearTimeout(el.__autoHideTimer);
      el.__autoHideTimer = null;
    }

    el.__autoHideTimer = setTimeout(() => {
      // If user is hovering the tooltip itself, wait until they leave
      if (el.matches(":hover")) {
        // try again shortly after mouse leaves (polling until not hovered)
        const tryLater = () => {
          if (!el.matches(":hover")) {
            doHide(el);
          } else {
            setTimeout(tryLater, 400);
          }
        };
        tryLater();
      } else {
        doHide(el);
      }
    }, delay);
  }

  function doHide(el) {
    if (!el) return;
    // add fadeout class (CSS will handle transition)
    el.classList.add("auto-hide-tooltip-fadeout");

    // remove element after fade duration; if it's reused in DOM, you can hide instead
    setTimeout(() => {
      // If element was re-attached or changed, ensure we only remove the same node
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, FADEOUT_MS + 30);

    // clear timer reference
    if (el.__autoHideTimer) {
      clearTimeout(el.__autoHideTimer);
      el.__autoHideTimer = null;
    }
  }

  // MutationObserver: watch for tooltip nodes being added anywhere in the page
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      // Check added nodes for matching tooltip
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;

        // If the added node itself is a matching tooltip
        if (isSatelliteTooltip(node)) {
          // mark it so we don't double-process
          if (!node.__autoHideApplied) {
            node.__autoHideApplied = true;
            scheduleHide(node);
            attachMouseHandlers(node);
          }
        }

        // Also search descendants (covers complex structures)
        const found = node.querySelectorAll && node.querySelectorAll("*");
        if (found && found.length) {
          for (const child of found) {
            if (isSatelliteTooltip(child) && !child.__autoHideApplied) {
              child.__autoHideApplied = true;
              scheduleHide(child);
              attachMouseHandlers(child);
            }
          }
        }
      }

      // Clear timers for removed nodes to avoid leaks
      for (const node of m.removedNodes) {
        if (node && node.__autoHideTimer) {
          clearTimeout(node.__autoHideTimer);
          node.__autoHideTimer = null;
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Also handle tooltips that may already exist in DOM at script load time
  document.querySelectorAll("*").forEach((el) => {
    if (isSatelliteTooltip(el) && !el.__autoHideApplied) {
      el.__autoHideApplied = true;
      scheduleHide(el);
      attachMouseHandlers(el);
    }
  });

  // When tooltip is hovered, cancel scheduled hide; when mouse leaves, restart timer
  function attachMouseHandlers(tooltipEl) {
    if (!tooltipEl) return;
    tooltipEl.addEventListener("mouseenter", () => {
      if (tooltipEl.__autoHideTimer) {
        clearTimeout(tooltipEl.__autoHideTimer);
        tooltipEl.__autoHideTimer = null;
      }
    });
    tooltipEl.addEventListener("mouseleave", () => {
      // restart hide timer when leaving tooltip
      scheduleHide(tooltipEl, AUTO_HIDE_MS / 2); // shorter after leave
    });
  }

  // Optional: If tooltips are shown by hovering parent items and removed on mouseout,
  // we can also detect parent's mouseenter and schedule hide of its tooltip (safe fallback).
  document.addEventListener(
    "mouseenter",
    function (e) {
      const parent = e.target;
      // search for a tooltip node inside this parent (or immediate sibling)
      if (!parent) return;
      const potential = parent.querySelector && parent.querySelector("*");
      // quick search in parent and next sibling
      let tip = null;
      if (parent.querySelectorAll) {
        tip = Array.from(parent.querySelectorAll("*")).find(isSatelliteTooltip);
      }
      if (
        !tip &&
        parent.nextElementSibling &&
        isSatelliteTooltip(parent.nextElementSibling)
      ) {
        tip = parent.nextElementSibling;
      }
      if (tip && !tip.__autoHideApplied) {
        tip.__autoHideApplied = true;
        scheduleHide(tip);
        attachMouseHandlers(tip);
      }
    },
    true
  );
})();
