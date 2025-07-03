// Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.3));
scene.add(new THREE.PointLight(0xffffff, 2));

// Sun
const sunGeometry = new THREE.SphereGeometry(2, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planets Data with Descriptions
const planets = [
  { name: 'Mercury', size: 0.2, distance: 5, orbitSpeed: 0.04, color: 0xaaaaaa, inclination: 20, description: 'Closest to Sun. Diameter ~4,880 km.' },
  { name: 'Venus', size: 0.4, distance: 8, orbitSpeed: 0.035, color: 0xffcc99, inclination: 8.4, description: 'Hottest planet. Diameter ~12,104 km.' },
  { name: 'Earth', size: 0.5, distance: 11, orbitSpeed: 0.03, color: 0x3399ff, inclination: 3, description: 'Our home planet. Diameter ~12,742 km.' },
  { name: 'Mars', size: 0.3, distance: 14, orbitSpeed: 0.025, color: 0xff6633, inclination: 16.85, description: 'Red Planet. Diameter ~6,779 km.' },
  { name: 'Jupiter', size: 1.1, distance: 18, orbitSpeed: 0.02, color: 0xffcc66, inclination: 51.3, description: 'Largest planet. Diameter ~139,820 km.' },
  { name: 'Saturn', size: 0.9, distance: 22, orbitSpeed: 0.015, color: 0xffcc33, inclination: 25.5, description: 'Has rings. Diameter ~116,460 km.' },
  { name: 'Uranus', size: 0.7, distance: 26, orbitSpeed: 0.01, color: 0x66ccff, inclination: 10.8, description: 'Icy giant. Diameter ~50,724 km.' },
  { name: 'Neptune', size: 0.7, distance: 30, orbitSpeed: 0.008, color: 0x3366ff, inclination: 31.77, description: 'Farthest planet. Diameter ~49,244 km.' }
];

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById('tooltip');

let zoomedIn = false;
let originalCameraPos = camera.position.clone();

planets.forEach(planet => {
  const planetGroup = new THREE.Group();
  scene.add(planetGroup);

  // Orbit Path Line (XZ circle first)
  const points = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const x = Math.cos(theta) * planet.distance;
    const y = 0;
    const z = Math.sin(theta) * planet.distance;
    points.push(new THREE.Vector3(x, y, z));
  }

  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true });
  const orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);
  planetGroup.add(orbitLine);

  // Planet Mesh
  const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color: planet.color });
  planet.mesh = new THREE.Mesh(geometry, material);
  planetGroup.add(planet.mesh);

  // Inclination (tilt whole orbit group)
  const inclinationRad = THREE.MathUtils.degToRad(planet.inclination);
  planetGroup.rotation.x = inclinationRad;

  // Initial Angle
  planet.angle = Math.random() * Math.PI * 2;
  planet.speedMultiplier = 1;
  planet.group = planetGroup;

  // Speed Slider UI
  const label = document.createElement('label');
  label.innerText = `${planet.name} Speed:`;
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 0;
  slider.max = 5;
  slider.step = 0.1;
  slider.value = 1;
  slider.addEventListener('input', () => {
    planet.speedMultiplier = parseFloat(slider.value);
  });
  document.getElementById('controls').appendChild(label);
  document.getElementById('controls').appendChild(slider);
});

// Background Stars
function createStars(count) {
  const starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });
  const starVertices = [];
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 1000;
    const y = (Math.random() - 0.5) * 1000;
    const z = (Math.random() - 0.5) * 1000;
    starVertices.push(x, y, z);
  }
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}
createStars(1000);

// Camera
camera.position.z = 70;

// Resize Handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Pause/Resume Button
let paused = false;
document.getElementById('pauseResume').addEventListener('click', () => {
  paused = !paused;
  document.getElementById('pauseResume').innerText = paused ? 'Resume' : 'Pause';
});

// Dark/Light Mode Toggle
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
});

// Mousemove for Tooltip
window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  tooltip.style.left = event.clientX + 10 + 'px';
  tooltip.style.top = event.clientY + 10 + 'px';
});

// Click-to-Zoom with toggle + Info popup
window.addEventListener('click', () => {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));

  if (intersects.length > 0) {
    const clickedPlanet = planets.find(p => p.mesh === intersects[0].object);
    const target = clickedPlanet.mesh.getWorldPosition(new THREE.Vector3());

    if (!zoomedIn) {
      originalCameraPos = camera.position.clone();
      camera.position.set(target.x, target.y + 5, target.z + 10);
      camera.lookAt(target);
      zoomedIn = true;

      // Info popup
      alert(`🌍 ${clickedPlanet.name}\n\n${clickedPlanet.description}\n\nDistance from Sun: ${clickedPlanet.distance} AU\nOrbit Speed: ${clickedPlanet.orbitSpeed}\nSize: ${clickedPlanet.size}`);
    } else {
      camera.position.copy(originalCameraPos);
      camera.lookAt(new THREE.Vector3(0, 0, 0));
      zoomedIn = false;
    }
  }
});

// Animation Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (!paused) {
    planets.forEach(planet => {
      planet.angle += planet.orbitSpeed * planet.speedMultiplier * delta * 60;

      const x = Math.cos(planet.angle) * planet.distance;
      const z = Math.sin(planet.angle) * planet.distance;
      planet.mesh.position.x = x;
      planet.mesh.position.z = z;
      planet.mesh.rotation.y += 0.02;
    });
  }

  // Tooltip Hover Detection
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));

  if (intersects.length > 0) {
    const hoveredPlanet = planets.find(p => p.mesh === intersects[0].object);
    tooltip.style.display = 'block';
    tooltip.innerHTML = `
      <strong>${hoveredPlanet.name}</strong><br>
      ${hoveredPlanet.description}<br>
      Distance: ${hoveredPlanet.distance} AU<br>
      Orbit Speed: ${hoveredPlanet.orbitSpeed.toFixed(3)}<br>
      Size: ${hoveredPlanet.size}
    `;
  } else {
    tooltip.style.display = 'none';
  }

  renderer.render(scene, camera);
}

animate();
