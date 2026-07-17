import * as THREE from "./vendor/three.module.min.js";

var root = document.querySelector("[data-infra-scene]");
var canvas = document.querySelector("[data-infra-canvas]");

if (root && canvas) {
  try {
    startProjectJourney(root, canvas);
  } catch (error) {
    root.dataset.sceneError = "true";
    console.error("Project journey scene failed to start", error);
  }
}

function startProjectJourney(sceneRoot, sceneCanvas) {
  var viewport = sceneRoot.querySelector("[data-scene-viewport]");
  var originElement = sceneRoot.querySelector("[data-journey-origin]");
  var projectElements = Array.from(sceneRoot.querySelectorAll("[data-journey-project]"));
  var previousButton = sceneRoot.querySelector("[data-scene-prev]");
  var nextButton = sceneRoot.querySelector("[data-scene-next]");
  var statusIndex = sceneRoot.querySelector("[data-scene-index]");
  var statusTitle = sceneRoot.querySelector("[data-scene-title]");
  var statusDescription = sceneRoot.querySelector("[data-scene-description]");
  var mobileTitle = sceneRoot.querySelector("[data-scene-mobile-title]");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TERRAFORM_PURPLE = 0xa067da;
  var TERRAFORM_DEEP_PURPLE = 0x853ec3;

  var projects = [
    {
      id: "vm",
      index: "01",
      title: "VM networking",
      description: "A secured Windows VM and the Azure network boundary around it.",
      kind: "rack",
      color: 0x4aa3ff,
      position: [2.2, 0.62, -2.9]
    },
    {
      id: "storage",
      index: "02",
      title: "Storage SAS",
      description: "Private Blob storage with access limited by permission, time, and source.",
      kind: "storage",
      color: 0xd36db4,
      position: [4.45, -0.58, -5.8]
    },
    {
      id: "dns",
      index: "03",
      title: "DNS delivery",
      description: "A custom domain delivered through Azure Static Web Apps and GitHub Actions.",
      kind: "dns",
      color: 0x63d8e5,
      position: [6.8, 0.7, -8.65]
    },
    {
      id: "ovision",
      index: "04",
      title: "Ovision application",
      description: "A Shopify application with authentication, containers, and persistent data.",
      kind: "application",
      color: 0xdb8068,
      position: [9.05, -0.46, -11.55]
    },
    {
      id: "identity",
      index: "05",
      title: "Identity and RBAC",
      description: "Entra ID, scoped roles, Azure Policy, management groups, and governance.",
      kind: "identity",
      color: 0xe5a04d,
      position: [11.4, 0.76, -14.45]
    },
    {
      id: "monitoring",
      index: "06",
      title: "Monitoring and recovery",
      description: "Signals, KQL, alerts, Network Watcher, Backup, and an agent migration.",
      kind: "monitoring",
      color: 0x91bd69,
      position: [13.72, -0.64, -17.35]
    },
    {
      id: "load-balancer",
      index: "07",
      title: "Load balancer",
      description: "Two backends, health-aware routing, NAT egress, and validated failover.",
      kind: "loadBalancer",
      color: 0x67b7d4,
      position: [16.05, 0.56, -20.25]
    },
    {
      id: "terraform",
      index: "08",
      title: "Terraform hub-and-spoke",
      description: "The newest build: reusable modules, private workloads, and forced routing.",
      kind: "terraform",
      color: TERRAFORM_PURPLE,
      position: [18.6, 0, -23.2]
    }
  ];

  var ROUTE_PHASE_END = 0.4;
  var COMPLETION_RING_RADIUS = 1.2;
  var COMPLETION_RING_TUBE_RADIUS = 0.025;
  var ROUTE_MARKER_RADIUS = 0.075;
  var HANDOFF_ANGLE = -Math.PI / 2;
  var COMPLETION_RING_SWEEP = Math.PI * 2;
  var CLOUD_TRAIL_COLOR = 0x3d9fc4;

  projects.forEach(function (project, index) {
    project.element = projectElements.find(function (element) {
      return element.dataset.journeyProject === project.id;
    });
    project.label = sceneRoot.querySelector('[data-scene-target="' + project.id + '"]');
    project.positionVector = new THREE.Vector3().fromArray(project.position);
    project.trackPoint = project.positionVector.clone().add(new THREE.Vector3(
      Math.cos(HANDOFF_ANGLE) * COMPLETION_RING_RADIUS,
      Math.sin(HANDOFF_ANGLE) * COMPLETION_RING_RADIUS,
      0.22
    ));
    project.order = index;
    if (project.label) {
      project.label.style.setProperty("--node-color", "#" + project.color.toString(16).padStart(6, "0"));
    }
    if (project.element) {
      project.element.style.setProperty("--journey-accent", "#" + project.color.toString(16).padStart(6, "0"));
    }
  });

  var renderer = new THREE.WebGLRenderer({
    canvas: sceneCanvas,
    alpha: false,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setClearColor(0x0d1113, 1);
  if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1113);
  scene.fog = new THREE.Fog(0x0d1113, 10, 27);

  var camera = new THREE.PerspectiveCamera(44, 1, 0.1, 70);
  camera.position.set(4.2, 1, 6.45);

  scene.add(new THREE.HemisphereLight(0xb9e9f2, 0x111315, 1.7));

  var keyLight = new THREE.PointLight(0x49b4e8, 18, 18, 2);
  keyLight.position.set(3.5, 3.8, 5.2);
  camera.add(keyLight);
  scene.add(camera);

  var warmLight = new THREE.PointLight(0xe5a04d, 10, 14, 2);
  warmLight.position.set(1, -3, 2.5);
  scene.add(warmLight);

  var cameraPoints = [new THREE.Vector3(0, 0, 0)].concat(projects.map(function (project) {
    return project.positionVector.clone();
  }));
  var cameraCurve = new THREE.CatmullRomCurve3(cameraPoints, false, "centripetal", 0.35);
  var routeSegments = [];
  var routeSamplesPerSegment = 64;
  var routeLineClearance = ROUTE_MARKER_RADIUS + COMPLETION_RING_TUBE_RADIUS;
  for (var routeSegmentIndex = 0; routeSegmentIndex < projects.length; routeSegmentIndex += 1) {
    var segmentStart = routeSegmentIndex === 0
      ? new THREE.Vector3(0, -1.18, 0)
      : projects[routeSegmentIndex - 1].trackPoint.clone();
    var segmentEnd = projects[routeSegmentIndex].trackPoint.clone();
    var handoffLength = Math.min(0.9, Math.max(0.42, segmentStart.distanceTo(segmentEnd) * 0.24));
    var segmentControlOne = segmentStart.clone().add(new THREE.Vector3(handoffLength, 0, 0));
    var segmentControlTwo = segmentEnd.clone().add(new THREE.Vector3(-handoffLength, 0, 0));
    var segmentCurve = new THREE.CubicBezierCurve3(
      segmentStart,
      segmentControlOne,
      segmentControlTwo,
      segmentEnd
    );
    var segmentLength = Math.max(segmentCurve.getLength(), 0.001);
    var segmentStartOffset = routeSegmentIndex === 0
      ? 0
      : Math.min(0.04, routeLineClearance / segmentLength);
    var segmentEndOffset = Math.min(0.04, routeLineClearance / segmentLength);
    var visibleSegmentSpan = 1 - segmentStartOffset - segmentEndOffset;
    var segmentSamples = [];
    var segmentColors = [];
    var segmentStartColor = new THREE.Color(
      routeSegmentIndex === 0 ? CLOUD_TRAIL_COLOR : projects[routeSegmentIndex - 1].color
    );
    var segmentEndColor = new THREE.Color(projects[routeSegmentIndex].color);
    for (var routeSampleIndex = 0; routeSampleIndex <= routeSamplesPerSegment; routeSampleIndex += 1) {
      var routeSampleProgress = routeSampleIndex / routeSamplesPerSegment;
      var sampleProgress = segmentStartOffset
        + visibleSegmentSpan * routeSampleProgress;
      segmentSamples.push(segmentCurve.getPoint(sampleProgress));
      var routeColorProgress = routeSampleProgress * routeSampleProgress * (3 - 2 * routeSampleProgress);
      var routeSampleColor = segmentStartColor.clone().lerp(segmentEndColor, routeColorProgress);
      segmentColors.push(routeSampleColor.r, routeSampleColor.g, routeSampleColor.b);
    }
    var segmentGeometry = new THREE.BufferGeometry().setFromPoints(segmentSamples);
    segmentGeometry.setAttribute("color", new THREE.Float32BufferAttribute(segmentColors, 3));
    segmentGeometry.setDrawRange(0, 0);
    var segmentMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });
    var segmentLine = new THREE.Line(segmentGeometry, segmentMaterial);
    segmentLine.frustumCulled = false;
    segmentLine.renderOrder = 0;
    scene.add(segmentLine);
    routeSegments.push({
      geometry: segmentGeometry,
      material: segmentMaterial,
      line: segmentLine,
      curve: segmentCurve,
      sampleCount: segmentSamples.length,
      startOffset: segmentStartOffset,
      endOffset: segmentEndOffset,
      startColor: segmentStartColor,
      endColor: segmentEndColor
    });
  }

  var starCount = window.innerWidth < 760 ? 130 : 300;
  var starPositions = new Float32Array(starCount * 3);
  for (var starIndex = 0; starIndex < starCount; starIndex += 1) {
    var starOffset = starIndex * 3;
    starPositions[starOffset] = -7 + Math.random() * 34;
    starPositions[starOffset + 1] = -6 + Math.random() * 12;
    starPositions[starOffset + 2] = 5 - Math.random() * 36;
  }
  var starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  var stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0x6f98a8,
      size: 0.035,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    })
  );
  scene.add(stars);

  function standardMaterial(color, opacity) {
    var material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.48,
      metalness: 0.28,
      roughness: 0.4,
      transparent: opacity < 1,
      opacity: opacity,
      depthWrite: opacity >= 1
    });
    material.userData.baseOpacity = opacity;
    material.userData.baseEmissive = material.emissiveIntensity;
    return material;
  }

  function basicMaterial(color, opacity, wireframe) {
    var material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      wireframe: Boolean(wireframe),
      depthWrite: false
    });
    material.userData.baseOpacity = opacity;
    return material;
  }

  function lineMaterial(color, opacity) {
    var material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      depthWrite: false
    });
    material.userData.baseOpacity = opacity;
    return material;
  }

  function trackMaterial(entry, material) {
    entry.materials.push(material);
    return material;
  }

  function addMesh(entry, parent, geometry, material) {
    var mesh = new THREE.Mesh(geometry, trackMaterial(entry, material));
    parent.add(mesh);
    return mesh;
  }

  function addLine(entry, parent, points, color, opacity) {
    var geometry = new THREE.BufferGeometry().setFromPoints(points);
    var line = new THREE.Line(geometry, trackMaterial(entry, lineMaterial(color, opacity)));
    parent.add(line);
    return line;
  }

  function makeCloud() {
    var group = new THREE.Group();
    var solidMaterial = standardMaterial(0x3d9fc4, 0.9);
    solidMaterial.emissiveIntensity = 0.7;
    var wireMaterial = basicMaterial(0x9be4f0, 0.22, true);
    var lobeGeometry = new THREE.SphereGeometry(0.62, 28, 20);
    var wireGeometry = new THREE.SphereGeometry(0.66, 14, 10);
    var lobes = [
      { position: [-0.78, -0.02, 0], scale: [0.92, 0.78, 0.72] },
      { position: [-0.25, 0.34, 0.04], scale: [1.05, 1.02, 0.86] },
      { position: [0.42, 0.42, -0.03], scale: [1.18, 1.2, 0.94] },
      { position: [0.98, 0.02, 0.02], scale: [0.94, 0.82, 0.72] },
      { position: [0.18, -0.18, 0.08], scale: [1.65, 0.72, 0.9] }
    ];
    var lobeMeshes = [];

    lobes.forEach(function (lobe, index) {
      var mesh = new THREE.Mesh(lobeGeometry, solidMaterial.clone());
      mesh.material.userData.baseOpacity = 0.9;
      mesh.material.userData.baseEmissive = 0.7;
      mesh.position.fromArray(lobe.position);
      mesh.scale.fromArray(lobe.scale);
      mesh.userData.phase = index * 0.72;
      group.add(mesh);
      lobeMeshes.push(mesh);

      var wire = new THREE.Mesh(wireGeometry, wireMaterial.clone());
      wire.material.userData.baseOpacity = 0.22;
      wire.position.copy(mesh.position);
      wire.scale.copy(mesh.scale);
      group.add(wire);
    });

    var orbitMaterials = [];
    [1.48, 1.74].forEach(function (radius, index) {
      var material = basicMaterial(index ? 0x91bd69 : 0x63d8e5, index ? 0.28 : 0.38, false);
      var ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.014, 6, 96), material);
      ring.rotation.set(Math.PI / 2.4 + index * 0.34, index * 0.72, index * 0.43);
      group.add(ring);
      orbitMaterials.push(ring);
    });

    var dataDots = [];
    for (var dotIndex = 0; dotIndex < 7; dotIndex += 1) {
      var dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 12, 8),
        basicMaterial(dotIndex % 2 ? 0x91bd69 : 0x8ed4ed, 0.9, false)
      );
      dot.userData.phase = dotIndex / 7;
      group.add(dot);
      dataDots.push(dot);
    }

    var anchor = new THREE.Object3D();
    anchor.position.set(0.25, 1.25, 0);
    group.add(anchor);

    var materials = [];
    group.traverse(function (object) {
      if (!object.material) {
        return;
      }
      var materialList = Array.isArray(object.material) ? object.material : [object.material];
      materialList.forEach(function (material) {
        if (material.userData.baseOpacity == null) {
          material.userData.baseOpacity = material.opacity;
        }
        materials.push(material);
      });
    });

    return {
      group: group,
      lobes: lobeMeshes,
      rings: orbitMaterials,
      dots: dataDots,
      anchor: anchor,
      materials: materials
    };
  }

  var cloud = makeCloud();
  scene.add(cloud.group);

  var clickTargets = [];
  var originClickTarget = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 16, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  originClickTarget.userData.projectId = "origin";
  cloud.group.add(originClickTarget);
  clickTargets.push(originClickTarget);

  function buildRack(entry, parent, color) {
    var frame = addMesh(entry, parent, new THREE.BoxGeometry(1.18, 1.2, 0.52), standardMaterial(0x193748, 0.95));
    frame.position.z = -0.04;
    entry.buildParts.frame = frame;
    entry.buildParts.rows = [];
    for (var index = 0; index < 3; index += 1) {
      var row = new THREE.Group();
      row.position.y = -0.38 + index * 0.39;
      parent.add(row);
      var server = addMesh(entry, row, new THREE.BoxGeometry(0.98, 0.25, 0.58), standardMaterial(color, 0.94));
      server.position.z = 0.08;
      var slot = addMesh(entry, row, new THREE.BoxGeometry(0.62, 0.045, 0.025), basicMaterial(0xbceaf4, 0.72, false));
      slot.position.set(0.08, 0, 0.385);
      var light = addMesh(entry, row, new THREE.SphereGeometry(0.035, 8, 6), basicMaterial(0x91bd69, 0.95, false));
      light.position.set(-0.34, 0, 0.41);
      entry.buildParts.rows.push({ group: row, light: light, homeY: row.position.y });
    }
  }

  function buildStorage(entry, parent, color) {
    entry.buildParts.levels = [];
    entry.buildParts.dataOrbs = [];
    for (var index = 0; index < 3; index += 1) {
      var level = new THREE.Group();
      level.position.y = -0.36 + index * 0.34;
      parent.add(level);
      var cylinder = addMesh(entry, level, new THREE.CylinderGeometry(0.57, 0.57, 0.3, 32), standardMaterial(color, 0.92));
      var rim = addMesh(entry, level, new THREE.TorusGeometry(0.57, 0.028, 8, 48), basicMaterial(0xf3c3e2, 0.64, false));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.15;
      entry.buildParts.levels.push({ group: level, homeY: level.position.y });
    }
    for (var orbIndex = 0; orbIndex < 5; orbIndex += 1) {
      var orb = addMesh(entry, parent, new THREE.SphereGeometry(0.04, 10, 7), basicMaterial(orbIndex % 2 ? 0xf3c3e2 : 0x8ed4ed, 0.9, false));
      orb.position.set((orbIndex % 2 ? 1 : -1) * 0.2, -0.58 + orbIndex * 0.19, 0.42);
      orb.userData.homePosition = orb.position.clone();
      entry.buildParts.dataOrbs.push(orb);
    }
  }

  function buildDns(entry, parent, color) {
    var core = addMesh(entry, parent, new THREE.SphereGeometry(0.58, 22, 16), standardMaterial(0x246b7a, 0.76));
    var globe = addMesh(entry, parent, new THREE.SphereGeometry(0.67, 14, 10), basicMaterial(color, 0.58, true));
    globe.rotation.y = 0.4;
    entry.buildParts.core = core;
    entry.buildParts.globe = globe;
    entry.buildParts.signalRings = [];
    [0, Math.PI / 2].forEach(function (rotation, index) {
      var ring = addMesh(entry, parent, new THREE.TorusGeometry(0.82 + index * 0.1, 0.018, 6, 72), basicMaterial(index ? 0x91bd69 : color, 0.46, false));
      ring.rotation.set(rotation, 0.5 + index * 0.45, 0.25);
      ring.userData.homeRotation = ring.rotation.clone();
      entry.buildParts.signalRings.push(ring);
    });
  }

  function buildApplication(entry, parent, color) {
    var windowMesh = addMesh(entry, parent, new THREE.BoxGeometry(1.18, 0.86, 0.16), standardMaterial(0x4e2c2a, 0.96));
    windowMesh.position.z = -0.02;
    var header = addMesh(entry, parent, new THREE.BoxGeometry(1, 0.12, 0.04), basicMaterial(color, 0.9, false));
    header.position.set(0, 0.29, 0.12);
    entry.buildParts.window = windowMesh;
    entry.buildParts.header = header;
    entry.buildParts.panels = [];
    [-0.3, 0, 0.3].forEach(function (x, index) {
      var panel = addMesh(entry, parent, new THREE.BoxGeometry(0.22, 0.32 + index * 0.05, 0.04), standardMaterial(index === 1 ? 0x63d8e5 : color, 0.9));
      panel.position.set(x, -0.08, 0.13);
      panel.userData.homePosition = panel.position.clone();
      entry.buildParts.panels.push(panel);
    });
  }

  function buildIdentity(entry, parent, color) {
    function roundedRectangle(width, height, radius) {
      var left = -width * 0.5;
      var right = width * 0.5;
      var bottom = -height * 0.5;
      var top = height * 0.5;
      var shape = new THREE.Shape();
      shape.moveTo(left + radius, bottom);
      shape.lineTo(right - radius, bottom);
      shape.quadraticCurveTo(right, bottom, right, bottom + radius);
      shape.lineTo(right, top - radius);
      shape.quadraticCurveTo(right, top, right - radius, top);
      shape.lineTo(left + radius, top);
      shape.quadraticCurveTo(left, top, left, top - radius);
      shape.lineTo(left, bottom + radius);
      shape.quadraticCurveTo(left, bottom, left + radius, bottom);
      shape.closePath();
      return shape;
    }

    var cardGroup = new THREE.Group();
    cardGroup.rotation.y = -0.08;
    parent.add(cardGroup);

    var cardBase = addMesh(
      entry,
      cardGroup,
      new THREE.ExtrudeGeometry(roundedRectangle(1.58, 0.98, 0.12), {
        depth: 0.12,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.025,
        bevelThickness: 0.025
      }),
      standardMaterial(color, 0.96)
    );
    cardBase.position.z = -0.1;

    var cardFace = addMesh(
      entry,
      cardGroup,
      new THREE.ExtrudeGeometry(roundedRectangle(1.43, 0.83, 0.08), {
        depth: 0.055,
        bevelEnabled: false
      }),
      standardMaterial(0x1b272c, 0.98)
    );
    cardFace.position.z = 0.035;

    var portraitPanel = addMesh(entry, cardGroup, new THREE.BoxGeometry(0.5, 0.58, 0.035), standardMaterial(0x25434d, 0.96));
    portraitPanel.position.set(0.4, -0.02, 0.18);
    var portraitRim = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.57, 0.65, 0.025)),
      trackMaterial(entry, lineMaterial(0x8ed4ed, 0.82))
    );
    portraitRim.position.set(0.4, -0.02, 0.205);
    cardGroup.add(portraitRim);

    var avatarHead = addMesh(entry, cardGroup, new THREE.SphereGeometry(0.13, 22, 14), standardMaterial(0xf0c66f, 0.98));
    avatarHead.scale.z = 0.34;
    avatarHead.position.set(0.4, 0.1, 0.245);
    var avatarBody = addMesh(entry, cardGroup, new THREE.SphereGeometry(0.23, 22, 14), standardMaterial(0x63a7c1, 0.96));
    avatarBody.scale.set(1, 0.58, 0.28);
    avatarBody.position.set(0.4, -0.2, 0.235);

    var credentialLines = [];
    [0.34, 0.42, 0.28].forEach(function (width, index) {
      var line = addMesh(entry, cardGroup, new THREE.BoxGeometry(width, 0.055, 0.035), basicMaterial(index === 0 ? 0xdaf5f8 : 0x8ed4ed, 0.9, false));
      line.position.set(0.09 - width * 0.5, 0.2 - index * 0.18, 0.205);
      credentialLines.push(line);
    });

    var statusDot = addMesh(entry, cardGroup, new THREE.SphereGeometry(0.055, 14, 9), basicMaterial(0x91bd69, 0.96, false));
    statusDot.position.set(-0.2, -0.29, 0.225);
    var lanyardSlot = addMesh(entry, cardGroup, new THREE.BoxGeometry(0.32, 0.07, 0.04), standardMaterial(0x0f1619, 1));
    lanyardSlot.position.set(0, 0.38, 0.205);

    entry.buildParts.cardGroup = cardGroup;
    entry.buildParts.cardBase = cardBase;
    entry.buildParts.cardFace = cardFace;
    entry.buildParts.portraitPanel = portraitPanel;
    entry.buildParts.portraitRim = portraitRim;
    entry.buildParts.avatarHead = avatarHead;
    entry.buildParts.avatarBody = avatarBody;
    entry.buildParts.credentialLines = credentialLines;
    entry.buildParts.statusDot = statusDot;
    entry.buildParts.lanyardSlot = lanyardSlot;
  }

  function buildMonitoring(entry, parent, color) {
    function eyeShape(width, height) {
      var shape = new THREE.Shape();
      shape.moveTo(-width, 0);
      shape.bezierCurveTo(-width * 0.52, height, width * 0.52, height, width, 0);
      shape.bezierCurveTo(width * 0.52, -height, -width * 0.52, -height, -width, 0);
      shape.closePath();
      return shape;
    }

    var eyeGroup = new THREE.Group();
    parent.add(eyeGroup);

    var outerEye = addMesh(entry, eyeGroup, new THREE.ShapeGeometry(eyeShape(0.82, 0.5), 28), standardMaterial(color, 0.94));
    outerEye.position.z = 0.02;
    var sclera = addMesh(entry, eyeGroup, new THREE.ShapeGeometry(eyeShape(0.72, 0.38), 28), standardMaterial(0xb8e7ef, 0.9));
    sclera.position.z = 0.1;
    var iris = addMesh(entry, eyeGroup, new THREE.CircleGeometry(0.27, 40), standardMaterial(0x397b70, 0.98));
    iris.position.z = 0.18;
    var irisRing = addMesh(entry, eyeGroup, new THREE.TorusGeometry(0.28, 0.022, 8, 64), basicMaterial(color, 0.9, false));
    irisRing.position.z = 0.21;
    var pupil = addMesh(entry, eyeGroup, new THREE.SphereGeometry(0.11, 20, 14), standardMaterial(0x101719, 1));
    pupil.scale.z = 0.38;
    pupil.position.z = 0.25;
    var highlight = addMesh(entry, eyeGroup, new THREE.SphereGeometry(0.038, 12, 8), basicMaterial(0xe8fbff, 0.96, false));
    highlight.position.set(-0.045, 0.055, 0.35);

    var upperLidPoints = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-0.82, 0, 0.24),
      new THREE.Vector3(-0.44, 0.58, 0.24),
      new THREE.Vector3(0.44, 0.58, 0.24),
      new THREE.Vector3(0.82, 0, 0.24)
    ).getPoints(32);
    var lowerLidPoints = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-0.82, 0, 0.24),
      new THREE.Vector3(-0.44, -0.58, 0.24),
      new THREE.Vector3(0.44, -0.58, 0.24),
      new THREE.Vector3(0.82, 0, 0.24)
    ).getPoints(32);
    var upperLid = addLine(entry, eyeGroup, upperLidPoints, 0xd7f0c2, 0.9);
    var lowerLid = addLine(entry, eyeGroup, lowerLidPoints, 0x63d8e5, 0.74);

    entry.buildParts.eyeGroup = eyeGroup;
    entry.buildParts.outerEye = outerEye;
    entry.buildParts.sclera = sclera;
    entry.buildParts.iris = iris;
    entry.buildParts.irisRing = irisRing;
    entry.buildParts.pupil = pupil;
    entry.buildParts.highlight = highlight;
    entry.buildParts.eyeLids = [upperLid, lowerLid];
  }

  function buildLoadBalancer(entry, parent, color) {
    var hub = addMesh(entry, parent, new THREE.SphereGeometry(0.28, 20, 14), standardMaterial(color, 0.96));
    hub.position.z = 0.06;
    entry.buildParts.hub = hub;
    entry.buildParts.backends = [];
    entry.buildParts.healthLights = [];
    entry.buildParts.connectionLines = [];
    [-0.62, 0.62].forEach(function (x, index) {
      var backend = addMesh(entry, parent, new THREE.BoxGeometry(0.42, 0.55, 0.38), standardMaterial(index ? 0x3c819c : 0x275d78, 0.94));
      backend.position.set(x, -0.22, 0);
      backend.userData.homePosition = backend.position.clone();
      entry.buildParts.backends.push(backend);
      var backendLine = addLine(entry, parent, [new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, -0.18, 0)], color, 0.75);
      entry.buildParts.connectionLines.push(backendLine);
      var health = addMesh(entry, parent, new THREE.SphereGeometry(0.045, 8, 6), basicMaterial(0x91bd69, 0.96, false));
      health.position.set(x, 0.16, 0.24);
      entry.buildParts.healthLights.push(health);
    });
    entry.buildParts.connectionLines.push(addLine(entry, parent, [new THREE.Vector3(0, 0.8, 0), new THREE.Vector3(0, 0.22, 0)], 0xb8e7ef, 0.76));
  }

  function buildTerraform(entry, parent, color) {
    var core = addMesh(entry, parent, new THREE.CylinderGeometry(0.46, 0.46, 0.24, 6), standardMaterial(color, 0.96));
    core.rotation.x = Math.PI / 2;
    entry.buildParts.core = core;
    entry.buildParts.modules = [];
    entry.buildParts.moduleLines = [];
    var positions = [new THREE.Vector3(-0.68, -0.44, 0), new THREE.Vector3(0.68, -0.44, 0), new THREE.Vector3(0, 0.7, 0)];
    positions.forEach(function (position, index) {
      var moduleColor = index === 2 ? TERRAFORM_DEEP_PURPLE : color;
      var module = addMesh(entry, parent, new THREE.BoxGeometry(0.36, 0.36, 0.36), standardMaterial(moduleColor, 0.92));
      module.position.copy(position);
      module.userData.homePosition = position.clone();
      entry.buildParts.modules.push(module);
      entry.buildParts.moduleLines.push(addLine(entry, parent, [new THREE.Vector3(0, 0, 0), position.clone()], moduleColor, 0.74));
    });
    var hex = addMesh(entry, parent, new THREE.TorusGeometry(0.98, 0.018, 6, 6), basicMaterial(color, 0.54, false));
    hex.rotation.z = Math.PI / 6;
    entry.buildParts.hex = hex;
  }

  function createProjectNode(project) {
    var entry = {
      project: project,
      group: new THREE.Group(),
      visual: new THREE.Group(),
      materials: [],
      rings: [],
      buildParts: {},
      anchor: new THREE.Object3D(),
      revealed: false,
      completion: 0
    };
    entry.group.position.copy(project.positionVector);
    entry.group.scale.setScalar(0.001);
    entry.group.add(entry.visual);

    var routeOccluder = new THREE.Mesh(
      new THREE.TorusGeometry(
        COMPLETION_RING_RADIUS,
        COMPLETION_RING_TUBE_RADIUS * 1.55,
        8,
        96
      ),
      new THREE.MeshBasicMaterial({
        color: 0x0d1113,
        transparent: true,
        opacity: 1,
        depthTest: false,
        depthWrite: false
      })
    );
    routeOccluder.position.z = 0.2;
    routeOccluder.renderOrder = 10;
    entry.group.add(routeOccluder);
    entry.routeOccluder = routeOccluder;

    entry.buildParts.backplateSegments = [];
    var backplateSegmentCount = 10;
    var backplateSegmentAngle = (Math.PI * 2) / backplateSegmentCount;
    for (var backplateIndex = 0; backplateIndex < backplateSegmentCount; backplateIndex += 1) {
      var backplateSegment = addMesh(
        entry,
        entry.group,
        new THREE.CircleGeometry(
          0.9,
          8,
          backplateIndex * backplateSegmentAngle,
          backplateSegmentAngle + 0.008
        ),
        standardMaterial(0x172024, 0.9)
      );
      backplateSegment.position.z = -0.18;
      backplateSegment.renderOrder = 15;
      backplateSegment.userData.assemblyDirection = backplateIndex % 2 ? 1 : -1;
      entry.buildParts.backplateSegments.push(backplateSegment);
    }

    var orbit = addMesh(entry, entry.group, new THREE.TorusGeometry(1.02, 0.018, 6, 88), basicMaterial(project.color, 0.34, false));
    orbit.rotation.set(0.12, 0.22, project.order * 0.24);
    orbit.renderOrder = 20;
    entry.rings.push(orbit);

    var completionSegments = 96;
    var completionRadialSegments = 8;
    var completionCurve = new THREE.Curve();
    completionCurve.getPoint = function (progress, target) {
      var point = target || new THREE.Vector3();
      var completionAngle = HANDOFF_ANGLE + progress * COMPLETION_RING_SWEEP;
      return point.set(
        Math.cos(completionAngle) * COMPLETION_RING_RADIUS,
        Math.sin(completionAngle) * COMPLETION_RING_RADIUS,
        0.22
      );
    };
    var completionGeometry = new THREE.TubeGeometry(
      completionCurve,
      completionSegments,
      COMPLETION_RING_TUBE_RADIUS,
      completionRadialSegments,
      true
    );

    var completionTrackMaterial = basicMaterial(0x536068, 0.42, false);
    completionTrackMaterial.depthTest = false;
    var completionTrack = new THREE.Mesh(completionGeometry.clone(), completionTrackMaterial);
    completionTrack.frustumCulled = false;
    completionTrack.renderOrder = 30;
    entry.group.add(completionTrack);
    entry.completionTrack = completionTrack;

    completionGeometry.setDrawRange(0, 0);
    var completionMaterial = basicMaterial(project.color, 0.96, false);
    completionMaterial.depthTest = false;
    var completionRing = new THREE.Mesh(completionGeometry, completionMaterial);
    completionRing.frustumCulled = false;
    completionRing.renderOrder = 40;
    entry.group.add(completionRing);
    entry.completionRing = completionRing;
    entry.completionIndexCount = completionGeometry.index
      ? completionGeometry.index.count
      : completionSegments * completionRadialSegments * 6;

    if (project.kind === "rack") {
      buildRack(entry, entry.visual, project.color);
    } else if (project.kind === "storage") {
      buildStorage(entry, entry.visual, project.color);
    } else if (project.kind === "dns") {
      buildDns(entry, entry.visual, project.color);
    } else if (project.kind === "application") {
      buildApplication(entry, entry.visual, project.color);
    } else if (project.kind === "identity") {
      buildIdentity(entry, entry.visual, project.color);
    } else if (project.kind === "monitoring") {
      buildMonitoring(entry, entry.visual, project.color);
    } else if (project.kind === "loadBalancer") {
      buildLoadBalancer(entry, entry.visual, project.color);
    } else {
      buildTerraform(entry, entry.visual, project.color);
    }

    entry.visual.traverse(function (object) {
      if (object.isMesh || object.isLine || object.isLineSegments) {
        object.renderOrder = 20;
      }
    });

    entry.anchor.position.set(0, 1.38, 0);
    entry.group.add(entry.anchor);

    var clickTarget = new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 16, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    clickTarget.userData.projectId = project.id;
    entry.group.add(clickTarget);
    clickTargets.push(clickTarget);
    scene.add(entry.group);
    return entry;
  }

  var entries = projects.map(createProjectNode);
  var entryById = new Map(entries.map(function (entry) {
    return [entry.project.id, entry];
  }));

  var markerGeometry = new THREE.SphereGeometry(ROUTE_MARKER_RADIUS, 12, 8);
  var progressMarker = new THREE.Mesh(markerGeometry, basicMaterial(0xdaf5f8, 0.95, false));
  progressMarker.material.depthTest = false;
  progressMarker.renderOrder = 50;
  scene.add(progressMarker);

  var orbitMarker = new THREE.Mesh(markerGeometry, basicMaterial(projects[0].color, 0.98, false));
  orbitMarker.material.depthTest = false;
  orbitMarker.renderOrder = 50;
  orbitMarker.visible = false;
  scene.add(orbitMarker);

  var state = {
    width: 1,
    height: 1,
    targetProgress: 0,
    progress: 0,
    markerProgress: 0,
    activeIndex: -1,
    lastActiveIndex: null,
    hoveredId: null,
    pointerX: 0,
    pointerY: 0,
    pointerDownX: 0,
    pointerDownY: 0,
    pointerDownId: null,
    visible: true,
    stageCenters: []
  };

  var centerSnap = {
    active: false,
    direction: 0,
    frame: 0,
    idleTimer: 0,
    lastScrollY: window.scrollY,
    restoreScrollBehavior: "",
    targetStage: -1
  };

  var CENTER_SNAP_DELAY = 150;
  var CENTER_SNAP_RELEASE = 72;

  var raycaster = new THREE.Raycaster();
  var pointerNdc = new THREE.Vector2(4, 4);
  var projectedPosition = new THREE.Vector3();
  var routePosition = new THREE.Vector3();
  var trackPosition = new THREE.Vector3();
  var orbitMarkerLocal = new THREE.Vector3();
  var orbitMarkerWorld = new THREE.Vector3();
  var cameraGoal = new THREE.Vector3();
  var lookGoal = new THREE.Vector3();
  var lookTarget = new THREE.Vector3(-1.8, 0, 0);
  var lastFrameTime = 0;
  var elapsedTime = 0;

  function setStageLocation(stageIndex) {
    var projectId = stageIndex > 0 ? projects[stageIndex - 1].id : "origin";
    window.history.replaceState(null, "", projectId === "origin" ? "#top" : "#project-" + projectId);
  }

  function restoreDocumentScrollBehavior() {
    document.documentElement.style.scrollBehavior = centerSnap.restoreScrollBehavior;
    centerSnap.restoreScrollBehavior = "";
  }

  function cancelCenterSnap() {
    window.clearTimeout(centerSnap.idleTimer);
    if (centerSnap.frame) {
      window.cancelAnimationFrame(centerSnap.frame);
    }
    centerSnap.frame = 0;
    centerSnap.active = false;
    centerSnap.direction = 0;
    centerSnap.targetStage = -1;
    restoreDocumentScrollBehavior();
    centerSnap.lastScrollY = window.scrollY;
    sceneRoot.dataset.scrollAssist = "manual";
  }

  function easeScrollProgress(progress) {
    return progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  }

  function startCenterSnap(stageIndex) {
    if (stageIndex < 0 || stageIndex >= state.stageCenters.length) {
      return;
    }

    cancelCenterSnap();

    var startY = window.scrollY;
    var targetY = Math.max(0, state.stageCenters[stageIndex] - window.innerHeight * 0.52);
    var distance = targetY - startY;
    if (Math.abs(distance) < 2) {
      setStageLocation(stageIndex);
      updateScrollState();
      return;
    }

    var duration = Math.min(620, Math.max(280, 220 + Math.abs(distance) * 0.65));
    var startedAt = window.performance.now();
    centerSnap.active = true;
    centerSnap.direction = distance > 0 ? 1 : -1;
    centerSnap.targetStage = stageIndex;
    centerSnap.restoreScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    sceneRoot.dataset.scrollAssist = "centering";
    setStageLocation(stageIndex);

    function step(frameTime) {
      if (!centerSnap.active || centerSnap.targetStage !== stageIndex) {
        return;
      }

      var progress = THREE.MathUtils.clamp((frameTime - startedAt) / duration, 0, 1);
      window.scrollTo(0, startY + distance * easeScrollProgress(progress));

      if (progress < 1) {
        centerSnap.frame = window.requestAnimationFrame(step);
        return;
      }

      centerSnap.frame = 0;
      centerSnap.active = false;
      centerSnap.direction = 0;
      centerSnap.targetStage = -1;
      restoreDocumentScrollBehavior();
      centerSnap.lastScrollY = window.scrollY;
      updateScrollState();
      sceneRoot.dataset.scrollAssist = "centered";
    }

    centerSnap.frame = window.requestAnimationFrame(step);
  }

  function isJourneyCenter(center) {
    var rect = sceneRoot.getBoundingClientRect();
    var top = rect.top + window.scrollY;
    var bottom = top + rect.height;
    return center >= top && center <= bottom;
  }

  function nearestStageTo(center) {
    var nearestStage = -1;
    var nearestDistance = Infinity;
    state.stageCenters.forEach(function (stageCenter, index) {
      var distance = Math.abs(stageCenter - center);
      if (distance < nearestDistance) {
        nearestStage = index;
        nearestDistance = distance;
      }
    });
    return { index: nearestStage, distance: nearestDistance };
  }

  function shouldIgnoreCenterSnap(target) {
    return reducedMotion ||
      document.documentElement.classList.contains("menu-open") ||
      Boolean(document.querySelector("dialog[open]")) ||
      Boolean(target && target.closest && target.closest("input, textarea, select, [contenteditable='true']"));
  }

  function settleNearestStage() {
    if (centerSnap.active || shouldIgnoreCenterSnap(document.activeElement)) {
      return;
    }

    updateStageCenters();
    var center = window.scrollY + window.innerHeight * 0.52;
    if (!isJourneyCenter(center)) {
      return;
    }

    var nearest = nearestStageTo(center);
    if (nearest.index < 0 || nearest.distance > Math.min(window.innerHeight * 0.72, 560)) {
      return;
    }

    var lastStage = state.stageCenters.length - 1;
    var leavingAfterFinal = nearest.index === lastStage &&
      centerSnap.direction > 0 &&
      center > state.stageCenters[lastStage] + CENTER_SNAP_RELEASE;
    var leavingBeforeStart = nearest.index === 0 &&
      centerSnap.direction < 0 &&
      center < state.stageCenters[0] - CENTER_SNAP_RELEASE;
    if (leavingAfterFinal || leavingBeforeStart) {
      return;
    }

    startCenterSnap(nearest.index);
  }

  function handleJourneyScroll() {
    updateScrollState();
    var currentScrollY = window.scrollY;
    if (!centerSnap.active && Math.abs(currentScrollY - centerSnap.lastScrollY) > 0.5) {
      centerSnap.direction = currentScrollY > centerSnap.lastScrollY ? 1 : -1;
    }
    centerSnap.lastScrollY = currentScrollY;

    if (centerSnap.active || reducedMotion) {
      return;
    }

    window.clearTimeout(centerSnap.idleTimer);
    centerSnap.idleTimer = window.setTimeout(settleNearestStage, CENTER_SNAP_DELAY);
  }

  function navigateTo(projectId, immediate) {
    cancelCenterSnap();
    var target = projectId === "origin"
      ? originElement
      : projects.find(function (project) { return project.id === projectId; }).element;
    if (!target) {
      return;
    }
    var rect = target.getBoundingClientRect();
    var targetTop = projectId === "origin"
      ? 0
      : rect.top + window.scrollY - (window.innerHeight - rect.height) * 0.5;
    window.history.replaceState(null, "", projectId === "origin" ? "#top" : "#project-" + projectId);
    if (immediate) {
      var previousScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, Math.max(0, targetTop));
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    } else {
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: reducedMotion ? "auto" : "smooth"
      });
    }
  }

  function updateStatus(activeIndex) {
    var project = activeIndex >= 0 ? projects[activeIndex] : null;
    statusIndex.textContent = project ? project.index + " / 08" : "00 / 08";
    statusTitle.textContent = project ? project.title : "Project timeline";
    statusDescription.textContent = project
      ? project.description
      : "Eight implementations, shown in the order they were built.";
    mobileTitle.textContent = project ? project.index + "  " + project.title : "Project timeline";

    projects.forEach(function (item, index) {
      if (item.label) {
        item.label.setAttribute("aria-pressed", index === activeIndex ? "true" : "false");
      }
      if (item.element) {
        item.element.dataset.active = index === activeIndex ? "true" : "false";
      }
    });

    sceneRoot.dataset.journeyProject = project ? project.id : "origin";
    state.lastActiveIndex = activeIndex;
  }

  function updateStageCenters() {
    var elements = [originElement].concat(projects.map(function (project) { return project.element; }));
    state.stageCenters = elements.map(function (element) {
      var rect = element.getBoundingClientRect();
      return rect.top + window.scrollY + rect.height * 0.5;
    });
  }

  function updateScrollState() {
    if (!state.stageCenters.length) {
      updateStageCenters();
    }

    var center = window.scrollY + window.innerHeight * 0.52;
    var centers = state.stageCenters;
    var segment = 0;
    var segmentProgress = 0;

    if (center <= centers[0]) {
      segment = 0;
      segmentProgress = 0;
    } else if (center >= centers[centers.length - 1]) {
      segment = centers.length - 2;
      segmentProgress = 1;
    } else {
      for (var index = 0; index < centers.length - 1; index += 1) {
        if (center >= centers[index] && center < centers[index + 1]) {
          segment = index;
          segmentProgress = (center - centers[index]) / Math.max(centers[index + 1] - centers[index], 1);
          break;
        }
      }
    }

    state.targetProgress = THREE.MathUtils.clamp(
      (segment + segmentProgress) / (centers.length - 1),
      0,
      1
    );

    var nearestStage = segmentProgress < 0.5 ? segment : segment + 1;
    state.activeIndex = THREE.MathUtils.clamp(nearestStage - 1, -1, projects.length - 1);
    if (state.activeIndex !== state.lastActiveIndex) {
      updateStatus(state.activeIndex);
    }
  }

  projects.forEach(function (project) {
    if (project.label) {
      project.label.addEventListener("click", function () {
        navigateTo(project.id);
      });
    }
  });

  previousButton.addEventListener("click", function () {
    if (state.activeIndex <= 0) {
      navigateTo("origin");
      return;
    }
    navigateTo(projects[state.activeIndex - 1].id);
  });

  nextButton.addEventListener("click", function () {
    var nextIndex = state.activeIndex < 0 ? 0 : Math.min(state.activeIndex + 1, projects.length - 1);
    navigateTo(projects[nextIndex].id);
  });

  function updatePointer(event) {
    var rect = sceneCanvas.getBoundingClientRect();
    var relativeX = (event.clientX - rect.left) / Math.max(rect.width, 1);
    var relativeY = (event.clientY - rect.top) / Math.max(rect.height, 1);
    state.pointerX = relativeX * 2 - 1;
    state.pointerY = relativeY * 2 - 1;
    pointerNdc.set(state.pointerX, -state.pointerY);
  }

  function updateRaycast() {
    raycaster.setFromCamera(pointerNdc, camera);
    var hits = raycaster.intersectObjects(clickTargets, false);
    var hitId = hits.length ? hits[0].object.userData.projectId : null;
    if (hitId !== "origin") {
      var hitEntry = entryById.get(hitId);
      if (!hitEntry || !hitEntry.revealed) {
        hitId = null;
      }
    }
    state.hoveredId = hitId;
    sceneCanvas.dataset.hovering = hitId ? "true" : "false";
  }

  sceneCanvas.addEventListener("pointermove", function (event) {
    updatePointer(event);
  });

  sceneCanvas.addEventListener("pointerdown", function (event) {
    updatePointer(event);
    updateRaycast();
    state.pointerDownX = event.clientX;
    state.pointerDownY = event.clientY;
    state.pointerDownId = state.hoveredId;
  });

  sceneCanvas.addEventListener("pointerup", function (event) {
    updatePointer(event);
    updateRaycast();
    var distance = Math.abs(event.clientX - state.pointerDownX) + Math.abs(event.clientY - state.pointerDownY);
    if (distance < 9 && state.hoveredId && state.hoveredId === state.pointerDownId) {
      navigateTo(state.hoveredId);
    }
    state.pointerDownId = null;
  });

  sceneCanvas.addEventListener("pointerleave", function () {
    state.pointerX = 0;
    state.pointerY = 0;
    state.hoveredId = null;
    pointerNdc.set(4, 4);
    sceneCanvas.dataset.hovering = "false";
  });

  function resizeScene() {
    var rect = viewport.getBoundingClientRect();
    state.width = Math.max(1, Math.round(rect.width));
    state.height = Math.max(1, Math.round(rect.height));
    var mobile = state.width < 760;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.65));
    renderer.setSize(state.width, state.height, false);
    camera.aspect = state.width / state.height;
    camera.fov = mobile ? 52 : 44;
    camera.updateProjectionMatrix();
    updateStageCenters();
    updateScrollState();
    renderScene(0.016);
  }

  function updateLabels() {
    if (state.width < 760) {
      return;
    }

    entries.forEach(function (entry, index) {
      var label = entry.project.label;
      if (!label) {
        return;
      }

      entry.anchor.getWorldPosition(projectedPosition);
      projectedPosition.project(camera);
      var inFrame = projectedPosition.z > -1 && projectedPosition.z < 1;
      var useful = index === state.activeIndex || index === state.activeIndex + 1;
      var visible = entry.revealed && inFrame && useful;
      var x = (projectedPosition.x * 0.5 + 0.5) * state.width;
      var y = (-projectedPosition.y * 0.5 + 0.5) * state.height;
      x = THREE.MathUtils.clamp(x + 42, state.width * 0.56, state.width - 92);
      y = THREE.MathUtils.clamp(y, 78, state.height - 112);
      label.style.left = Math.round(x) + "px";
      label.style.top = Math.round(y) + "px";
      label.dataset.visible = visible ? "true" : "false";
    });
  }

  function animateCloud(delta, elapsed) {
    var cloudVisibility = THREE.MathUtils.clamp(1 - state.progress * 14, 0, 1);
    cloud.group.visible = cloudVisibility > 0.01;
    cloud.materials.forEach(function (material) {
      material.opacity = material.userData.baseOpacity * cloudVisibility;
      material.transparent = true;
      material.depthWrite = false;
    });
    cloud.group.rotation.y = Math.sin(elapsed * 0.18) * 0.08;
    cloud.lobes.forEach(function (lobe, index) {
      var base = 1 + Math.sin(elapsed * 0.85 + lobe.userData.phase) * 0.025;
      lobe.scale.multiplyScalar(1 / (lobe.userData.lastPulse || 1));
      lobe.scale.multiplyScalar(base);
      lobe.userData.lastPulse = base;
      lobe.material.emissiveIntensity = 0.66 + Math.sin(elapsed * 0.72 + index) * 0.09;
    });
    cloud.rings.forEach(function (ring, index) {
      ring.rotation.z += delta * (index ? -0.12 : 0.16);
    });
    cloud.dots.forEach(function (dot, index) {
      var angle = elapsed * (0.32 + index * 0.018) + dot.userData.phase * Math.PI * 2;
      var radius = 1.28 + (index % 3) * 0.2;
      dot.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.18) * 0.72, Math.sin(angle) * 0.45);
    });
  }

  function clamp01(value) {
    return THREE.MathUtils.clamp(value, 0, 1);
  }

  function smoothProgress(value) {
    var clamped = clamp01(value);
    return clamped * clamped * (3 - 2 * clamped);
  }

  function stagedProgress(progress, start, end) {
    return smoothProgress((progress - start) / Math.max(end - start, 0.001));
  }

  function setUniformScale(object, value) {
    object.scale.setScalar(Math.max(0.001, value));
  }

  function buildCompletionFor(index, progress) {
    var stageProgress = progress * projects.length - index;
    return smoothProgress((stageProgress - ROUTE_PHASE_END) / (1 - ROUTE_PHASE_END));
  }

  function markerProgressFor(progress) {
    var scaled = THREE.MathUtils.clamp(progress, 0, 1) * projects.length;
    if (scaled >= projects.length) {
      return 1;
    }
    var segment = Math.floor(scaled);
    var local = scaled - segment;
    var travel = smoothProgress(local / ROUTE_PHASE_END);
    return (segment + travel) / projects.length;
  }

  function applyProjectBuild(entry, completion, elapsed) {
    var parts = entry.buildParts;
    var kind = entry.project.kind;

    parts.backplateSegments.forEach(function (segment, index) {
      var segmentProgress = stagedProgress(
        completion,
        0.03 + index * 0.035,
        0.24 + index * 0.04
      );
      segment.rotation.z = (1 - segmentProgress) * segment.userData.assemblyDirection * 0.12;
      setUniformScale(segment, segmentProgress);
    });

    if (kind === "rack") {
      var frameProgress = stagedProgress(completion, 0, 0.28);
      setUniformScale(parts.frame, frameProgress);
      parts.rows.forEach(function (row, index) {
        var rowProgress = stagedProgress(completion, 0.18 + index * 0.18, 0.48 + index * 0.17);
        row.group.position.set(
          (index % 2 ? 1 : -1) * (1 - rowProgress) * 0.82,
          row.homeY,
          0
        );
        setUniformScale(row.group, rowProgress);
        var bootProgress = stagedProgress(completion, 0.82 + index * 0.035, 0.94 + index * 0.02);
        var bootPulse = completion > 0.98 ? 0.88 + Math.sin(elapsed * 3.4 + index) * 0.12 : 1;
        setUniformScale(row.light, bootProgress * bootPulse);
      });
      return;
    }

    if (kind === "storage") {
      parts.levels.forEach(function (level, index) {
        var levelProgress = stagedProgress(completion, 0.06 + index * 0.19, 0.4 + index * 0.19);
        level.group.position.set(0, level.homeY - (1 - levelProgress) * 0.72, 0);
        setUniformScale(level.group, levelProgress);
      });
      parts.dataOrbs.forEach(function (orb, index) {
        var dataProgress = stagedProgress(completion, 0.46 + index * 0.065, 0.72 + index * 0.055);
        orb.position.copy(orb.userData.homePosition);
        orb.position.y -= (1 - dataProgress) * 0.34;
        if (completion > 0.98) {
          orb.position.y += Math.sin(elapsed * 1.8 + index * 0.8) * 0.035;
        }
        setUniformScale(orb, dataProgress);
      });
      return;
    }

    if (kind === "dns") {
      var coreProgress = stagedProgress(completion, 0.04, 0.42);
      var globeProgress = stagedProgress(completion, 0.2, 0.66);
      setUniformScale(parts.core, coreProgress);
      setUniformScale(parts.globe, globeProgress);
      parts.globe.rotation.y = 0.4 + (1 - globeProgress) * Math.PI * 1.4 + (completion > 0.98 ? elapsed * 0.08 : 0);
      parts.signalRings.forEach(function (ring, index) {
        var ringProgress = stagedProgress(completion, 0.48 + index * 0.16, 0.78 + index * 0.15);
        setUniformScale(ring, ringProgress);
        ring.rotation.copy(ring.userData.homeRotation);
        ring.rotation.z += (1 - ringProgress) * Math.PI * (index ? -0.8 : 0.8);
      });
      return;
    }

    if (kind === "application") {
      var windowProgress = stagedProgress(completion, 0.02, 0.4);
      parts.window.scale.set(Math.max(0.035, windowProgress), THREE.MathUtils.lerp(0.7, 1, windowProgress), 1);
      var headerProgress = stagedProgress(completion, 0.3, 0.62);
      parts.header.position.set(-0.62 * (1 - headerProgress), 0.29, 0.12);
      parts.header.scale.set(Math.max(0.035, headerProgress), 1, 1);
      parts.panels.forEach(function (panel, index) {
        var panelProgress = stagedProgress(completion, 0.48 + index * 0.1, 0.74 + index * 0.08);
        panel.position.copy(panel.userData.homePosition);
        panel.position.y -= (1 - panelProgress) * 0.36;
        panel.scale.set(1, Math.max(0.035, panelProgress), 1);
      });
      return;
    }

    if (kind === "identity") {
      var cardProgress = stagedProgress(completion, 0.03, 0.46);
      parts.cardGroup.position.y = THREE.MathUtils.lerp(-0.22, 0, cardProgress);
      parts.cardGroup.rotation.z = (1 - cardProgress) * -0.16;
      parts.cardGroup.scale.set(
        Math.max(0.035, cardProgress),
        THREE.MathUtils.lerp(0.72, 1, cardProgress),
        1
      );

      var faceProgress = stagedProgress(completion, 0.24, 0.58);
      setUniformScale(parts.cardFace, faceProgress);
      var portraitProgress = stagedProgress(completion, 0.4, 0.7);
      parts.portraitPanel.scale.set(Math.max(0.035, portraitProgress), Math.max(0.035, portraitProgress), 1);
      parts.portraitRim.scale.set(Math.max(0.035, portraitProgress), Math.max(0.035, portraitProgress), 1);
      var avatarHeadProgress = stagedProgress(completion, 0.55, 0.77);
      parts.avatarHead.scale.set(
        Math.max(0.035, avatarHeadProgress),
        Math.max(0.035, avatarHeadProgress),
        Math.max(0.035, avatarHeadProgress * 0.34)
      );
      var avatarBodyProgress = stagedProgress(completion, 0.62, 0.82);
      parts.avatarBody.scale.set(
        Math.max(0.035, avatarBodyProgress),
        Math.max(0.035, avatarBodyProgress * 0.58),
        Math.max(0.035, avatarBodyProgress * 0.28)
      );

      parts.credentialLines.forEach(function (line, index) {
        var lineProgress = stagedProgress(completion, 0.56 + index * 0.08, 0.78 + index * 0.07);
        line.scale.set(Math.max(0.035, lineProgress), 1, 1);
      });
      setUniformScale(parts.lanyardSlot, stagedProgress(completion, 0.72, 0.9));
      var statusProgress = stagedProgress(completion, 0.8, 0.97);
      var statusPulse = completion > 0.98 ? 0.88 + Math.sin(elapsed * 3.2) * 0.12 : 1;
      setUniformScale(parts.statusDot, statusProgress * statusPulse);
      return;
    }

    if (kind === "monitoring") {
      var eyeOpenProgress = stagedProgress(completion, 0.02, 0.42);
      var scleraProgress = stagedProgress(completion, 0.18, 0.54);
      var irisProgress = stagedProgress(completion, 0.4, 0.72);
      var pupilProgress = stagedProgress(completion, 0.58, 0.84);
      var glintProgress = stagedProgress(completion, 0.74, 0.96);
      var blink = 1;
      if (completion > 0.98) {
        var blinkPhase = elapsed % 5.4;
        blink = blinkPhase > 5.06
          ? 1 - Math.sin(((blinkPhase - 5.06) / 0.34) * Math.PI) * 0.88
          : 1;
      }
      parts.eyeGroup.scale.set(1, Math.max(0.035, eyeOpenProgress * blink), 1);
      parts.outerEye.scale.set(Math.max(0.035, eyeOpenProgress), 1, 1);
      parts.sclera.scale.set(Math.max(0.035, scleraProgress), 1, 1);
      setUniformScale(parts.iris, irisProgress);
      setUniformScale(parts.irisRing, irisProgress);
      setUniformScale(parts.pupil, pupilProgress);
      parts.pupil.scale.z = Math.max(0.035, pupilProgress * 0.38);
      setUniformScale(parts.highlight, glintProgress);
      parts.eyeLids.forEach(function (lid, index) {
        lid.scale.set(Math.max(0.035, stagedProgress(completion, 0.08 + index * 0.08, 0.48 + index * 0.08)), 1, 1);
      });
      var gazeOffset = completion > 0.98 ? Math.sin(elapsed * 0.72) * 0.075 : 0;
      parts.iris.position.x = gazeOffset;
      parts.irisRing.position.x = gazeOffset;
      parts.pupil.position.x = gazeOffset;
      parts.highlight.position.x = gazeOffset - 0.045;
      return;
    }

    if (kind === "loadBalancer") {
      var hubProgress = stagedProgress(completion, 0.02, 0.36);
      setUniformScale(parts.hub, hubProgress);
      parts.backends.forEach(function (backend, index) {
        var backendProgress = stagedProgress(completion, 0.28 + index * 0.08, 0.65 + index * 0.08);
        backend.position.set(
          backend.userData.homePosition.x * backendProgress,
          backend.userData.homePosition.y,
          backend.userData.homePosition.z
        );
        setUniformScale(backend, backendProgress);
      });
      parts.connectionLines.forEach(function (line, index) {
        var lineProgress = stagedProgress(completion, 0.5 + index * 0.06, 0.78 + index * 0.05);
        setUniformScale(line, lineProgress);
      });
      parts.healthLights.forEach(function (light, index) {
        var healthProgress = stagedProgress(completion, 0.76 + index * 0.05, 0.94 + index * 0.03);
        var healthPulse = completion > 0.98 ? 0.88 + Math.sin(elapsed * 3 + index) * 0.12 : 1;
        setUniformScale(light, healthProgress * healthPulse);
      });
      return;
    }

    var terraformCoreProgress = stagedProgress(completion, 0.02, 0.34);
    setUniformScale(parts.core, terraformCoreProgress);
    parts.modules.forEach(function (module, index) {
      var moduleProgress = stagedProgress(completion, 0.28 + index * 0.12, 0.62 + index * 0.1);
      module.position.set(
        module.userData.homePosition.x * moduleProgress,
        module.userData.homePosition.y * moduleProgress,
        module.userData.homePosition.z * moduleProgress
      );
      setUniformScale(module, moduleProgress);
      setUniformScale(parts.moduleLines[index], stagedProgress(completion, 0.5 + index * 0.08, 0.78 + index * 0.07));
    });
    var hexProgress = stagedProgress(completion, 0.68, 0.98);
    setUniformScale(parts.hex, hexProgress);
    parts.hex.rotation.z = Math.PI / 6 + (1 - hexProgress) * Math.PI * 0.8;
  }

  function updateNodeVisual(entry, index, delta, elapsed) {
    var threshold = (index + 0.08) / projects.length;
    var revealed = state.progress >= threshold;
    var active = index === state.activeIndex;
    var hovered = entry.project.id === state.hoveredId;
    var past = index < state.activeIndex;
    var completion = buildCompletionFor(index, state.progress);
    entry.revealed = revealed;
    entry.completion = completion;
    entry.visual.visible = past || completion > 0.001;

    var settled = completion >= 0.985;
    var targetScale = revealed ? (hovered && !settled ? 1.04 : 1) : 0.001;
    var scale = reducedMotion || settled
      ? targetScale
      : THREE.MathUtils.damp(entry.group.scale.x, targetScale, 6.5, Math.max(delta, 0.016));
    entry.group.scale.setScalar(scale);

    var verticalDrift = reducedMotion || active ? 0 : Math.sin(elapsed * 0.7 + index * 0.9) * 0.045;
    entry.group.position.y = entry.project.positionVector.y;
    entry.visual.position.y = verticalDrift;
    entry.visual.rotation.y = Math.sin(elapsed * 0.28 + index) * 0.09;
    entry.rings.forEach(function (ring, ringIndex) {
      ring.rotation.z += delta * (ringIndex ? -0.08 : 0.13);
    });

    var displayedCompletion = completion >= 0.985 ? 1 : completion;
    var completionCount = displayedCompletion <= 0
      ? 0
      : Math.min(
        entry.completionIndexCount,
        Math.max(6, Math.ceil(displayedCompletion * entry.completionIndexCount / 6) * 6)
      );
    entry.completionRing.geometry.setDrawRange(0, completionCount);
    entry.completionTrack.material.opacity = !revealed
      ? 0
      : active ? 0.42 : hovered ? 0.36 : past ? 0.14 : 0.28;
    entry.completionRing.material.opacity = !revealed
      ? 0
      : active ? 0.96 : hovered ? 0.72 : past ? 0.2 : 0.48;
    applyProjectBuild(entry, completion, elapsed);
    if (entry.project.element) {
      entry.project.element.dataset.buildProgress = completion.toFixed(2);
      entry.project.element.dataset.emblemVisible = entry.visual.visible ? "true" : "false";
    }

    entry.materials.forEach(function (material) {
      var baseOpacity = material.userData.baseOpacity == null ? 1 : material.userData.baseOpacity;
      var opacityFactor = !revealed ? 0 : active ? 1 : hovered ? 0.92 : past ? 0.16 : 0.72;
      var targetOpacity = baseOpacity * opacityFactor;
      material.opacity = reducedMotion
        ? targetOpacity
        : THREE.MathUtils.damp(material.opacity, targetOpacity, 7, Math.max(delta, 0.016));
      material.transparent = true;
      material.depthWrite = false;
      if (material.userData.baseEmissive != null) {
        var targetEmissive = material.userData.baseEmissive * (active ? 1.8 : hovered ? 1.35 : 1);
        material.emissiveIntensity = THREE.MathUtils.damp(
          material.emissiveIntensity,
          targetEmissive,
          7,
          Math.max(delta, 0.016)
        );
      }
    });

  }

  function updateProgressMarkers(progress) {
    var scaledProgress = clamp01(progress) * projects.length;
    var journeyComplete = scaledProgress >= projects.length;
    var segment = journeyComplete ? projects.length - 1 : Math.floor(scaledProgress);
    var localProgress = journeyComplete ? 1 : scaledProgress - segment;
    var building = localProgress >= ROUTE_PHASE_END;
    var entry = entries[segment];

    if (!building) {
      var travelProgress = smoothProgress(localProgress / ROUTE_PHASE_END);
      var activeRoute = routeSegments[segment];
      var spawnProgress = segment === 0
        ? 1
        : stagedProgress(travelProgress, 0, Math.max(activeRoute.startOffset, 0.001));
      activeRoute.curve.getPoint(travelProgress, trackPosition);
      progressMarker.visible = spawnProgress > 0.001;
      progressMarker.position.copy(trackPosition);
      progressMarker.scale.setScalar(Math.max(0.001, spawnProgress));
      progressMarker.material.opacity = 0.95 * spawnProgress;
      progressMarker.material.color
        .copy(activeRoute.startColor)
        .lerp(activeRoute.endColor, travelProgress);
      orbitMarker.visible = false;
      sceneRoot.dataset.markerMode = "route";
      sceneRoot.dataset.markerProject = entry.project.id;
      return;
    }

    var completion = buildCompletionFor(segment, progress);
    var mergeProgress = 1 - stagedProgress(completion, 0.9, 1);
    var angle = HANDOFF_ANGLE + completion * COMPLETION_RING_SWEEP;
    orbitMarkerLocal.set(
      Math.cos(angle) * COMPLETION_RING_RADIUS,
      Math.sin(angle) * COMPLETION_RING_RADIUS,
      0.22
    );
    entry.group.updateWorldMatrix(true, false);
    orbitMarkerWorld.copy(orbitMarkerLocal);
    entry.group.localToWorld(orbitMarkerWorld);

    progressMarker.visible = false;
    orbitMarker.visible = mergeProgress > 0.001;
    orbitMarker.position.copy(orbitMarkerWorld);
    orbitMarker.scale.setScalar(Math.max(0.001, mergeProgress));
    orbitMarker.material.opacity = 0.98 * mergeProgress;
    orbitMarker.material.color.setHex(entry.project.color);
    sceneRoot.dataset.markerMode = journeyComplete ? "complete" : "orbit";
    sceneRoot.dataset.markerProject = entry.project.id;
  }

  function updateRouteSegments(progress) {
    var scaledProgress = clamp01(progress) * projects.length;
    var journeyComplete = scaledProgress >= projects.length;
    var activeSegment = journeyComplete ? projects.length - 1 : Math.floor(scaledProgress);
    var localProgress = journeyComplete ? 1 : scaledProgress - activeSegment;
    var activeTravel = smoothProgress(localProgress / ROUTE_PHASE_END);

    routeSegments.forEach(function (routeSegment, index) {
      var segmentProgress = index < activeSegment
        ? 1
        : index > activeSegment
          ? 0
          : clamp01(
            (activeTravel - routeSegment.startOffset)
            / Math.max(0.001, 1 - routeSegment.startOffset - routeSegment.endOffset)
          );
      var drawCount = segmentProgress <= 0
        ? 0
        : Math.max(2, Math.floor(segmentProgress * (routeSegment.sampleCount - 1)) + 1);
      routeSegment.geometry.setDrawRange(0, drawCount);
      routeSegment.material.opacity = index < activeSegment ? 0.38 : 0.72;
    });
  }

  function renderScene(delta) {
    var safeDelta = Math.max(delta, 0.016);
    state.progress = reducedMotion
      ? state.targetProgress
      : THREE.MathUtils.damp(state.progress, state.targetProgress, 3.6, safeDelta);
    state.markerProgress = markerProgressFor(state.progress);
    sceneRoot.dataset.cameraProgress = state.progress.toFixed(3);
    sceneRoot.dataset.markerProgress = state.markerProgress.toFixed(3);

    cameraCurve.getPointAt(state.progress, routePosition);
    var mobile = state.width < 760;
    if (mobile) {
      cameraGoal.set(routePosition.x + 3.15, routePosition.y + 1.15, routePosition.z + 6.8);
      lookGoal.set(routePosition.x, routePosition.y - 1.8, routePosition.z);
    } else {
      cameraGoal.set(routePosition.x + 4.2, routePosition.y + 0.92, routePosition.z + 6.45);
      var desktopLookOffset = THREE.MathUtils.lerp(-1.5, -0.9, state.progress);
      lookGoal.set(routePosition.x + desktopLookOffset, routePosition.y, routePosition.z);
      cameraGoal.x += state.pointerX * 0.12;
      cameraGoal.y -= state.pointerY * 0.1;
    }

    camera.position.x = reducedMotion ? cameraGoal.x : THREE.MathUtils.damp(camera.position.x, cameraGoal.x, 4.2, safeDelta);
    camera.position.y = reducedMotion ? cameraGoal.y : THREE.MathUtils.damp(camera.position.y, cameraGoal.y, 4.2, safeDelta);
    camera.position.z = reducedMotion ? cameraGoal.z : THREE.MathUtils.damp(camera.position.z, cameraGoal.z, 4.2, safeDelta);
    lookTarget.lerp(lookGoal, reducedMotion ? 1 : 1 - Math.exp(-4.2 * safeDelta));
    camera.lookAt(lookTarget);

    animateCloud(delta, elapsedTime);
    entries.forEach(function (entry, index) {
      updateNodeVisual(entry, index, delta, elapsedTime);
    });

    updateRouteSegments(state.progress);
    updateProgressMarkers(state.progress);

    var activeEntry = state.activeIndex >= 0 ? entries[state.activeIndex] : null;
    sceneRoot.dataset.activeBuildProgress = activeEntry ? activeEntry.completion.toFixed(2) : "0.00";

    stars.position.x = routePosition.x * 0.04;
    stars.position.z = routePosition.z * 0.02;
    stars.rotation.y += delta * 0.003;

    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    updateRaycast();
    updateLabels();
    renderer.render(scene, camera);

    var visibleCount = entries.filter(function (entry) { return entry.revealed; }).length;
    sceneRoot.dataset.visibleNodes = String(visibleCount);
  }

  function animate(frameTime) {
    if (lastFrameTime && frameTime - lastFrameTime < 24) {
      return;
    }
    var delta = lastFrameTime ? Math.min((frameTime - lastFrameTime) / 1000, 0.05) : 0.016;
    lastFrameTime = frameTime;
    elapsedTime += delta;
    if (state.visible) {
      renderScene(delta);
    }
  }

  var resizeObserver = new ResizeObserver(resizeScene);
  resizeObserver.observe(viewport);

  window.addEventListener("scroll", handleJourneyScroll, { passive: true });
  window.addEventListener("wheel", cancelCenterSnap, { passive: true });
  window.addEventListener("touchstart", cancelCenterSnap, { passive: true });
  window.addEventListener("pointerdown", cancelCenterSnap, { passive: true });
  window.addEventListener("keydown", function (event) {
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].indexOf(event.key) >= 0) {
      cancelCenterSnap();
    }
  });
  window.addEventListener("resize", function () {
    cancelCenterSnap();
    updateStageCenters();
    updateScrollState();
  });

  var visibilityObserver = new IntersectionObserver(function (entriesList) {
    state.visible = entriesList[0].isIntersecting;
  }, { threshold: 0.01 });
  visibilityObserver.observe(sceneRoot);

  document.addEventListener("visibilitychange", function () {
    state.visible = document.visibilityState === "visible";
  });

  updateStageCenters();
  updateScrollState();
  resizeScene();
  updateStatus(-1);
  var initialProjectId = window.location.hash.indexOf("#project-") === 0
    ? window.location.hash.slice("#project-".length)
    : null;
  if (initialProjectId && projects.some(function (project) { return project.id === initialProjectId; })) {
    navigateTo(initialProjectId, true);
    updateStageCenters();
    updateScrollState();
  }
  sceneRoot.dataset.sceneDesign = "chronological-project-handoffs";
  sceneRoot.dataset.sceneReady = "true";
  renderScene(0.016);

  if (!reducedMotion) {
    renderer.setAnimationLoop(animate);
  }
}
