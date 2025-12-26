/*
 * @name Cox
 * @description Interactive crystallographic symmetry group visualizer
 */

// Grid state
var cells;
var grid_width;
var grid_width_px;
var cell_size_px;

// Grid position
var grid_corner_x, grid_corner_y;

// Domain/lattice parameters
var domain_a, domain_a1, domain_b;
var lattice_a, lattice_a1, lattice_b;

var n_classes;

// Interaction state
var filling;
var filling_state;

// Symmetry
var symmetry_group;
var SYMGROUPS;

// Domain selector
var domainSelector;
var showDomain;

// Game of Life
var golInterval = null;
var golRunning = false;

// Hex mode
var isHexMode = false;
var hexFlatTop = false; // false = pointy-top (*333, 632, *632), true = flat-top (333, 3*3)
var hexSize = 12; // radius from center to vertex
var hexCells = {}; // sparse storage for hex cells keyed by "q,r"
var hexWidth, hexHeight; // number of hexes in each direction

function setup() {
  // Initialize grid dimensions
  grid_width_px = 750;
  grid_width = 60;
  cell_size_px = Math.floor(grid_width_px / grid_width);
  grid_width_px = grid_width * cell_size_px;

  grid_corner_x = 0;
  grid_corner_y = 0;

  // Create canvas in container
  var canvas = createCanvas(grid_width_px, grid_width_px);
  canvas.parent('canvas-container');

  // Initialize domain
  domain_a = 10;
  domain_a1 = 0;
  domain_b = 10;

  lattice_a = domain_a;
  lattice_a1 = domain_a1;
  lattice_b = domain_b;

  filling = false;
  filling_state = 0;
  showDomain = false;

  symmetry_group = "2*22";

  SYMGROUPS = ["o",
    "2222", "22x", "22*", "2*22", "*2222",
    "442", "4*2", "*442",
    "xx", "x*", "**",
    "333", "3*3", "*333",
    "632", "*632"];

  // Initialize cells
  initCells();

  // Set up the symmetry group first
  setSymmetryGroup(symmetry_group);

  // Randomly initialize domain cells
  for (var i = 0; i < domain_a; i++) {
    for (var j = 0; j < domain_b; j++) {
      cells[i][j].setState(random() < 0.3 ? 1 : 0);
    }
  }

  computeEqClasses();
  enforceSymmetry();

  // Initialize domain selector
  domainSelector = new DomainSelector(domain_a, domain_b, cell_size_px, grid_corner_x, grid_corner_y);
  updateDomainSelector();

  // Wire up HTML controls
  var symmetrySelect = document.getElementById('symmetry-select');
  symmetrySelect.addEventListener('change', function() {
    updateSymmetryGroup(this.value);
  });

  var refineBtn = document.getElementById('refine-btn');
  refineBtn.addEventListener('click', function() {
    refineGrid();
  });

  var coarsenBtn = document.getElementById('coarsen-btn');
  coarsenBtn.addEventListener('click', function() {
    coarsenGrid();
  });

  var showDomainCheckbox = document.getElementById('show-domain');
  showDomainCheckbox.addEventListener('change', function() {
    showDomain = this.checked;
  });

  var startBtn = document.getElementById('start-btn');
  startBtn.addEventListener('click', function() {
    startGameOfLife();
  });

  var stopBtn = document.getElementById('stop-btn');
  stopBtn.addEventListener('click', function() {
    stopGameOfLife();
  });
}

function draw() {
  background(255);

  if (isHexMode) {
    drawHexCells();
    if (showDomain) {
      drawHexDomain();
    }
  } else {
    drawCells();
    if (showDomain) {
      drawDomain();
    }
  }
}

function initCells() {
  var x, y;
  cells = [];
  for (var i = 0; i < grid_width; i++) {
    cells[i] = [];
    for (var j = 0; j < grid_width; j++) {
      x = grid_corner_x + cell_size_px * i;
      y = grid_corner_y + cell_size_px * j;
      cells[i][j] = new Cell(i, j, x, y);
      cells[i][j].setSize(cell_size_px);
    }
  }
}

function drawCells() {
  for (var i = 0; i < grid_width; i++) {
    for (var j = 0; j < grid_width; j++) {
      cells[i][j].display();
    }
  }
}

function drawDomain() {
  domainSelector.update();
  domainSelector.display();

  if (!domainSelector.dragging) {
    if (domain_a != domainSelector.dwidth || domain_b != domainSelector.dheight) {
      domain_a = domainSelector.dwidth;
      domain_b = domainSelector.dheight;
      setSymmetryGroup(symmetry_group);
      computeEqClasses();
      enforceSymmetry();
      updateDomainSelector();
    }
  }
}

// Grid refinement/coarsening
function refineGrid() {
  if (isHexMode) {
    if (hexSize / 2 < 4) {
      console.log("Hex cells are too small to refine");
      return;
    }
    setHexGrid(hexSize / 2);
  } else {
    if (cell_size_px / 2 < 3) {
      console.log("Cells are too small to refine");
      return;
    }
    setGrid(grid_width * 2);
  }
}

function coarsenGrid() {
  if (isHexMode) {
    if (hexSize * 2 > 40) {
      console.log("Hex cells are too large to coarsen");
      return;
    }
    setHexGrid(hexSize * 2);
  } else {
    if (grid_width / 2 < 15) {
      console.log("Grid is too coarse");
      return;
    }
    setGrid(Math.floor(grid_width / 2));
  }
}

function setHexGrid(newHexSize) {
  var oldHexSize = hexSize;
  var scale = oldHexSize / newHexSize;

  // Scale domain proportionally
  domain_a = Math.round(domain_a * scale);
  domain_b = Math.round(domain_b * scale);
  lattice_a = Math.round(lattice_a * scale);
  lattice_b = Math.round(lattice_b * scale);

  // Ensure minimum domain size
  domain_a = max(domain_a, 2);
  domain_b = max(domain_b, 2);
  lattice_a = max(lattice_a, 2);
  lattice_b = max(lattice_b, 2);

  // Store old cells and size
  var oldHexCells = hexCells;

  // Update hex size and reinitialize
  hexSize = newHexSize;
  initHexCells();

  // Copy states from old cells by finding the nearest old hex for each new hex
  for (var key in hexCells) {
    var cell = hexCells[key];
    // Scale coordinates back to old grid
    var oldQ = Math.round(cell.q / scale);
    var oldR = Math.round(cell.r / scale);
    var oldKey = hexKey(oldQ, oldR);

    if (oldHexCells[oldKey]) {
      cell.setState(oldHexCells[oldKey].state);
    }
  }

  // Recompute equivalence classes and enforce symmetry
  computeHexEqClasses();
  enforceHexSymmetry();
}

function setGrid(newGridWidth) {
  var oldGridWidth = grid_width;

  // Scale domain and lattice proportionally
  domain_a = Math.round(domain_a * newGridWidth / oldGridWidth);
  domain_b = Math.round(domain_b * newGridWidth / oldGridWidth);
  domain_a1 = Math.round(domain_a1 * newGridWidth / oldGridWidth);
  lattice_a = Math.round(lattice_a * newGridWidth / oldGridWidth);
  lattice_b = Math.round(lattice_b * newGridWidth / oldGridWidth);
  lattice_a1 = Math.round(lattice_a1 * newGridWidth / oldGridWidth);

  // Ensure minimum domain size
  domain_a = max(domain_a, 1);
  domain_b = max(domain_b, 1);
  lattice_a = max(lattice_a, 1);
  lattice_b = max(lattice_b, 1);

  // Update grid dimensions
  grid_width = newGridWidth;
  cell_size_px = Math.floor(grid_width_px / grid_width);

  // Store old cells
  var oldCells = cells;

  // Create new cells
  initCells();

  // Copy states from old cells (nearest neighbor interpolation)
  for (var i = 0; i < grid_width; i++) {
    for (var j = 0; j < grid_width; j++) {
      var oldI = Math.floor(i * oldGridWidth / newGridWidth);
      var oldJ = Math.floor(j * oldGridWidth / newGridWidth);
      oldI = min(oldI, oldGridWidth - 1);
      oldJ = min(oldJ, oldGridWidth - 1);
      cells[i][j].setState(oldCells[oldI][oldJ].state);
    }
  }

  // Recompute symmetry
  computeEqClasses();
  enforceSymmetry();

  // Update domain selector
  updateDomainSelector();
}

function updateDomainSelector() {
  domainSelector.setDomain(domain_a, domain_b);
  domainSelector.setRatio(
    lattice_a / domain_a,
    lattice_b / domain_b
  );
  domainSelector.cell_size_px = cell_size_px;
  domainSelector.square = symmetry_group.indexOf("4") >= 0;
}

function enforceSymmetry() {
  for (var i = 0; i < domain_a; i++) {
    for (var j = 0; j < domain_b; j++) {
      var state = cells[i][j].state;
      var domain_rep = latticeToDomain(i, j);
      var eq_class = cellToInt(domain_rep[0], domain_rep[1], domain_b);
      setClass(eq_class, state);
    }
  }
}

function setClass(eq_class, state) {
  for (var i = 0; i < grid_width; i++) {
    for (var j = 0; j < grid_width; j++) {
      if (cells[i][j].eq_class == eq_class) {
        cells[i][j].setState(state);
      }
    }
  }
}

function computeEqClasses() {
  n_classes = domain_a * domain_b;
  for (var i = 0; i < grid_width; i++) {
    for (var j = 0; j < grid_width; j++) {
      var lattice_rep = modLattice(i, j);
      var domain_rep = latticeToDomain(lattice_rep[0], lattice_rep[1]);
      var eq_class = cellToInt(domain_rep[0], domain_rep[1], domain_b);
      cells[i][j].eq_class = eq_class;
    }
  }
}

function modLattice(a, b) {
  var b_remainder = ((b % lattice_b) + lattice_b) % lattice_b;
  var a_offset = lattice_a1 * (b - b_remainder) / lattice_b;
  var a_remainder = (((a - a_offset) % lattice_a) + lattice_a) % lattice_a;
  return [a_remainder, b_remainder];
}

function latticeToDomain(ia, ib) {
  var a = ia + 0.5;
  var b = ib + 0.5;
  var A = domain_a;
  var B = domain_b;

  if (symmetry_group == "o") {
    // no transformation
  } else if (symmetry_group == "2222") {
    if (a > A) {
      a = 2 * A - a;
      b = B - b;
    }
  } else if (symmetry_group == "22x") {
    if (a > A) {
      a = 2 * A - a;
      b = (b + B) % (2 * B);
    }
    if (b > B) {
      a = A - a;
      b = 2 * B - b;
    }
  } else if (symmetry_group == "22*") {
    if (a > A)
      a = 2 * A - a;
    if (b > B) {
      a = A - a;
      b = 2 * B - b;
    }
  } else if (symmetry_group == "2*22") {
    if (a > A)
      a = 2 * A - a;
    if (b > 2 * B)
      b = 4 * B - b;
    if (b > B) {
      b = 2 * B - b;
      a = A - a;
    }
  } else if (symmetry_group == "*2222") {
    if (a > A)
      a = 2 * A - a;
    if (b > B)
      b = 2 * B - b;
  } else if (symmetry_group == "442") {
    while (a > A || b > A) {
      var b_new = a;
      var a_new = 2 * A - b;
      a = a_new;
      b = b_new;
    }
  } else if (symmetry_group == "4*2") {
    while (a > A || b > A) {
      var b_new = a;
      var a_new = 2 * A - b;
      a = a_new;
      b = b_new;
    }
    if (a + b > A) {
      var b_new = A - a;
      var a_new = A - b;
      a = a_new;
      b = b_new;
    }
  } else if (symmetry_group == "*442") {
    while (a > A || b > A) {
      var b_new = a;
      var a_new = 2 * A - b;
      a = a_new;
      b = b_new;
    }
    if (b > a) {
      var b_new = a;
      var a_new = b;
      a = a_new;
      b = b_new;
    }
  } else if (symmetry_group == "xx") {
    if (a > A) {
      b = (b + B / 2) % B;
      a = 2 * A - a;
    }
  } else if (symmetry_group == "x*") {
    if (a > 2 * A) {
      a = 4 * A - a;
      b = (b + B / 2) % B;
    }
    if (a > A) {
      a = 2 * A - a;
    }
  } else if (symmetry_group == "**") {
    if (a > A)
      a = 2 * A - a;
  } else if (symmetry_group == "333") {
    console.log("no triangles yet");
  } else if (symmetry_group == "3*3") {
    console.log("no triangles yet");
  } else if (symmetry_group == "*333") {
    console.log("no triangles yet");
  } else if (symmetry_group == "632") {
    console.log("no triangles yet");
  } else if (symmetry_group == "*632") {
    console.log("no triangles yet");
  } else {
    console.log("invalid symmetry group (lattice)");
  }

  var oa = Math.round(a - 0.5);
  var ob = Math.round(b - 0.5);

  return [oa, ob];
}

function updateSymmetryGroup(sg) {
  if (sg == symmetry_group)
    return;

  var wasHexMode = isHexMode;
  var wasHexFlatTop = hexFlatTop;
  setSymmetryGroup(sg);

  if (isHexMode) {
    // Initialize hex grid if switching to hex mode or changing hex orientation
    // (3*3 uses flat-top, *333 uses pointy-top - need to reinit on orientation change)
    if (!wasHexMode || hexFlatTop !== wasHexFlatTop) {
      initHexCells();
      // Randomly initialize domain cells
      for (var r = 0; r < domain_b; r++) {
        for (var q = 0; q < domain_a; q++) {
          var key = hexKey(q, r);
          if (hexCells[key]) {
            hexCells[key].setState(random() < 0.3 ? 1 : 0);
          }
        }
      }
    }
    computeHexEqClasses();
    enforceHexSymmetry();
  } else {
    // Reinitialize square grid if switching from hex mode
    if (wasHexMode) {
      initCells();
      for (var i = 0; i < domain_a; i++) {
        for (var j = 0; j < domain_b; j++) {
          cells[i][j].setState(random() < 0.3 ? 1 : 0);
        }
      }
    }
    computeEqClasses();
    enforceSymmetry();
    updateDomainSelector();
  }
}

function setSymmetryGroup(sg) {
  lattice_a1 = domain_a1;
  isHexMode = false; // Default to square grid

  if (sg == "o") {
    lattice_a = domain_a;
    lattice_b = domain_b;
    symmetry_group = sg;
  } else if (sg == "2222") {
    lattice_a = 2 * domain_a;
    lattice_b = domain_b;
    lattice_a1 = domain_a1;
    symmetry_group = sg;
  } else if (sg == "22x") {
    lattice_a = 2 * domain_a;
    lattice_b = 2 * domain_b;
    symmetry_group = sg;
  } else if (sg == "22*") {
    lattice_a = 2 * domain_a;
    lattice_b = 2 * domain_b;
    symmetry_group = sg;
  } else if (sg == "2*22") {
    lattice_a = 2 * domain_a;
    lattice_b = 4 * domain_b;
    symmetry_group = sg;
  } else if (sg == "*2222") {
    lattice_a = 2 * domain_a;
    lattice_b = 2 * domain_b;
    symmetry_group = sg;
  } else if (sg == "442") {
    domain_b = domain_a;
    lattice_a = 2 * domain_a;
    lattice_b = 2 * domain_b;
    symmetry_group = sg;
  } else if (sg == "4*2") {
    domain_b = domain_a;
    lattice_a = 2 * domain_a;
    lattice_b = 2 * domain_b;
    symmetry_group = sg;
  } else if (sg == "*442") {
    domain_b = domain_a;
    lattice_a = 2 * domain_a;
    lattice_b = 2 * domain_b;
    symmetry_group = sg;
  } else if (sg == "xx") {
    lattice_a = 2 * domain_a;
    lattice_b = domain_b;
    symmetry_group = sg;
  } else if (sg == "x*") {
    lattice_a = 4 * domain_a;
    lattice_b = domain_b;
    symmetry_group = sg;
  } else if (sg == "**") {
    lattice_a = 2 * domain_a;
    lattice_b = domain_b;
    symmetry_group = sg;
  } else if (sg == "333") {
    // p3: Three 3-fold rotations
    isHexMode = true;
    hexFlatTop = false; // pointy-top
    lattice_a = domain_a;
    lattice_b = domain_b;
    symmetry_group = sg;
  } else if (sg == "3*3") {
    // p31m: 3-fold with mirrors through edges (flat-top orientation)
    isHexMode = true;
    hexFlatTop = true; // flat-top - mirrors pass through edge midpoints
    lattice_a = domain_a;
    lattice_b = domain_b;
    symmetry_group = sg;
  } else if (sg == "*333") {
    // p3m1: 3-fold all on mirrors (pointy-top orientation)
    isHexMode = true;
    hexFlatTop = false; // pointy-top - mirrors pass through vertices
    lattice_a = domain_a;
    lattice_b = domain_b;
    symmetry_group = sg;
  } else if (sg == "632") {
    // p6: 6-fold, 3-fold, 2-fold rotations
    isHexMode = true;
    hexFlatTop = false;
    domain_b = domain_a; // Keep square domain for 6-fold
    lattice_a = domain_a;
    lattice_b = domain_b;
    symmetry_group = sg;
  } else if (sg == "*632") {
    // p6m: Most symmetric hexagonal
    isHexMode = true;
    hexFlatTop = false;
    domain_b = domain_a;
    lattice_a = domain_a;
    lattice_b = domain_b;
    symmetry_group = sg;
  } else {
    console.log("invalid symmetry group selected");
  }
}

function cellToInt(a, b, dim) {
  return dim * a + b;
}

function currentCell() {
  if (overGrid(mouseX, mouseY)) {
    var cell_a = floor((mouseX - grid_corner_x) / cell_size_px);
    var cell_b = floor((mouseY - grid_corner_y) / cell_size_px);
    cell_a = constrain(cell_a, 0, grid_width - 1);
    cell_b = constrain(cell_b, 0, grid_width - 1);
    return cells[cell_a][cell_b];
  } else {
    return null;
  }
}

function overGrid(x, y) {
  if (x > grid_corner_x && x < grid_corner_x + grid_width_px) {
    if (y > grid_corner_y && y < grid_corner_y + grid_width_px) {
      return true;
    }
  }
  return false;
}

// Check if mouse is over the canvas element
function mouseOverCanvas() {
  return mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height;
}

// Mouse interactions
function mousePressed() {
  // Only handle mouse events on the canvas
  if (!mouseOverCanvas()) {
    return;
  }

  if (isHexMode) {
    var cell = hexCellAtPixel(mouseX, mouseY);
    if (cell) {
      filling_state = 1 - cell.state;
      var eq_class = cell.eq_class;
      fadeHexClass(eq_class, filling_state);
      filling = true;
    }
  } else {
    // Don't paint if dragging domain handle
    if (showDomain && domainSelector.overHandle()) {
      return;
    }

    if (overGrid(mouseX, mouseY)) {
      var cell = currentCell();
      if (cell) {
        filling_state = 1 - cell.state;
        var eq_class = cell.eq_class;
        fadeClass(eq_class, filling_state);
        filling = true;
      }
    }
  }
}

function mouseDragged() {
  if (isHexMode) {
    if (filling) {
      var cell = hexCellAtPixel(mouseX, mouseY);
      if (cell) {
        var eq_class = cell.eq_class;
        fadeHexClass(eq_class, filling_state);
      }
    }
    return false;
  } else {
    // Don't paint if dragging domain handle
    if (showDomain && domainSelector.dragging) {
      return false;
    }

    if (filling && overGrid(mouseX, mouseY)) {
      var cell = currentCell();
      if (cell) {
        var eq_class = cell.eq_class;
        fadeClass(eq_class, filling_state);
      }
    }
    return false;
  }
}

function mouseReleased() {
  filling = false;
  return false;
}

function fadeClass(eq_class, state) {
  for (var i = 0; i < grid_width; i++) {
    for (var j = 0; j < grid_width; j++) {
      var cell = cells[i][j];
      if (cell.eq_class == eq_class && cell.state != state) {
        cell.toggle();
        cell.startFade();
      }
    }
  }
}

// DomainSelector class
function DomainSelector(domain_a, domain_b, icell_size_px, dcx, dcy) {
  this.dwidth = domain_a;
  this.dheight = domain_b;

  this.cell_size_px = icell_size_px;
  this.handle_size_px = 12;

  this.dcorner_x = dcx;
  this.dcorner_y = dcy;

  this.handle_x = this.dcorner_x + this.cell_size_px * this.dwidth;
  this.handle_y = this.dcorner_y + this.cell_size_px * this.dheight;

  this.widthRatio = 1;
  this.heightRatio = 1;

  this.dragging = false;
  this.square = false;

  this.domain_color = color(156, 121, 255);      // #9C79FF
  this.light_domain_color = color(203, 185, 255); // #CBB9FF
  this.lattice_color = color(121, 202, 255);      // #79CAFF

  this.update = function() {
    if (this.dragging) {
      this.handle_x = mouseX;
      this.handle_y = mouseY;

      if (this.square) {
        // Force square domain for 4-fold symmetry
        var size = max(this.handle_x - this.dcorner_x, this.handle_y - this.dcorner_y);
        this.handle_x = this.dcorner_x + size;
        this.handle_y = this.dcorner_y + size;
      }

      if (!mouseIsPressed) {
        this.dragging = false;
        this.snapHandle();
      }
    }

    if (!this.dragging) {
      // Only start dragging if mouse is over the canvas
      if (mouseOverCanvas() && this.overHandle() && mouseIsPressed) {
        this.dragging = true;
      }
    }
  };

  this.snapHandle = function() {
    this.dwidth = Math.round((this.handle_x - this.dcorner_x) / this.cell_size_px);
    this.dheight = Math.round((this.handle_y - this.dcorner_y) / this.cell_size_px);

    this.dwidth = max(this.dwidth, 1);
    this.dheight = max(this.dheight, 1);

    // Limit to grid size
    this.dwidth = min(this.dwidth, grid_width / 2);
    this.dheight = min(this.dheight, grid_width / 2);

    this.handle_x = this.dcorner_x + this.cell_size_px * this.dwidth;
    this.handle_y = this.dcorner_y + this.cell_size_px * this.dheight;
  };

  this.overHandle = function() {
    var x = mouseX - this.handle_x;
    var y = mouseY - this.handle_y;
    return (x * x + y * y < this.handle_size_px * this.handle_size_px * 4);
  };

  this.setRatio = function(wr, hr) {
    this.widthRatio = wr;
    this.heightRatio = hr;
  };

  this.setDomain = function(da, db) {
    this.dwidth = da;
    this.dheight = db;
    this.handle_x = this.dcorner_x + this.cell_size_px * this.dwidth;
    this.handle_y = this.dcorner_y + this.cell_size_px * this.dheight;
  };

  this.display = function() {
    push();

    noFill();
    strokeWeight(2);

    // Draw lattice rectangle (blue)
    stroke(this.lattice_color);
    var latticeWidth = (this.handle_x - this.dcorner_x) * this.widthRatio;
    var latticeHeight = (this.handle_y - this.dcorner_y) * this.heightRatio;
    rect(this.dcorner_x, this.dcorner_y, latticeWidth, latticeHeight);

    // Draw domain rectangle (purple)
    stroke(this.domain_color);
    rect(this.dcorner_x, this.dcorner_y, this.handle_x - this.dcorner_x, this.handle_y - this.dcorner_y);

    // Draw handle
    if (this.overHandle()) {
      fill(this.light_domain_color);
    } else {
      fill(this.domain_color);
    }
    noStroke();
    ellipse(this.handle_x, this.handle_y, this.handle_size_px * 2, this.handle_size_px * 2);

    pop();
    strokeWeight(1);
  };
}

// Cell class
function Cell(_a, _b, _x, _y) {
  this.full_stroke = 0;
  this.full_fill = 0;
  this.empty_stroke = 200;
  this.empty_fill = 255;

  this.fade_duration = 100.0;
  this.pulse_period = 2000.0;

  this.pulsing = false;
  this.fading = false;

  this.state = 0;
  this.eq_class = 0;

  this.fade_start = null;
  this.pulse_start = null;

  this.a = _a;
  this.b = _b;
  this.x = _x;
  this.y = _y;
  this.size = 0;

  this.setSize = function(isize) {
    this.size = isize;
  };

  this.startFade = function() {
    this.fade_start = millis();
    this.fading = true;
    this.pulsing = false;
  };

  this.startPulse = function() {
    this.pulse_start = millis();
    this.fading = false;
    this.pulsing = true;
  };

  this.stopPulse = function() {
    this.pulsing = false;
  };

  this.togglePulse = function() {
    if (this.pulsing) {
      this.stopPulse();
    } else {
      this.startPulse();
    }
  };

  this.toggle = function() {
    this.state = 1 - this.state;
  };

  this.setState = function(st) {
    this.state = st;
  };

  this.intensity = function() {
    var t = millis();
    if (this.fading && t - this.fade_start > this.fade_duration) {
      this.fading = false;
    }

    var lambda = this.state;
    if (this.fading) {
      lambda = (t - this.fade_start) / this.fade_duration;
      if (this.state == 0) {
        lambda = 1 - lambda;
      }
    } else if (this.pulsing) {
      lambda = sin((t - this.pulse_start) / this.pulse_period * TWO_PI);
      if (this.state == 1) {
        lambda = 1 - lambda;
      }
    }
    return lambda;
  };

  this.display = function() {
    var lambda = this.intensity();

    fill(map(lambda, 0, 1, this.empty_fill, this.full_fill));
    stroke(map(lambda, 0, 1, this.empty_stroke, this.full_stroke));

    rect(this.x, this.y, this.size, this.size);
  };
}

// Game of Life functions

// Get the state at any position by mapping through symmetry
function getStateAt(a, b) {
  var lattice_rep = modLattice(a, b);
  var domain_rep = latticeToDomain(lattice_rep[0], lattice_rep[1]);
  var da = domain_rep[0];
  var db = domain_rep[1];
  // Clamp to domain bounds
  da = Math.max(0, Math.min(domain_a - 1, da));
  db = Math.max(0, Math.min(domain_b - 1, db));
  return cells[da][db].state;
}

// Count live neighbors at position (a, b) using infinite tiling
function countNeighbors(a, b) {
  var count = 0;
  for (var di = -1; di <= 1; di++) {
    for (var dj = -1; dj <= 1; dj++) {
      if (di === 0 && dj === 0) continue;
      count += getStateAt(a + di, b + dj);
    }
  }
  return count;
}

// Perform one step of Game of Life
function golStep() {
  // Compute next states for domain cells only
  var nextStates = [];
  for (var i = 0; i < domain_a; i++) {
    nextStates[i] = [];
    for (var j = 0; j < domain_b; j++) {
      var neighbors = countNeighbors(i, j);
      var currentState = cells[i][j].state;
      var nextState;

      if (currentState === 1) {
        // Live cell: survives with 2 or 3 neighbors
        nextState = (neighbors === 2 || neighbors === 3) ? 1 : 0;
      } else {
        // Dead cell: born with exactly 3 neighbors
        nextState = (neighbors === 3) ? 1 : 0;
      }
      nextStates[i][j] = nextState;
    }
  }

  // Apply next states to domain
  for (var i = 0; i < domain_a; i++) {
    for (var j = 0; j < domain_b; j++) {
      if (cells[i][j].state !== nextStates[i][j]) {
        cells[i][j].setState(nextStates[i][j]);
        cells[i][j].startFade();
      }
    }
  }

  // Propagate to full grid via symmetry
  enforceSymmetry();
}

function startGameOfLife() {
  if (golRunning) return;
  golRunning = true;
  if (isHexMode) {
    golInterval = setInterval(golHexStep, 1000);
  } else {
    golInterval = setInterval(golStep, 1000);
  }
}

function stopGameOfLife() {
  if (!golRunning) return;
  golRunning = false;
  if (golInterval) {
    clearInterval(golInterval);
    golInterval = null;
  }
}

// ============================================
// Hexagonal Grid Implementation
// ============================================

// Hex groups that use hexagonal rendering
var HEX_GROUPS = ["333", "3*3", "*333", "632", "*632"];

function isHexGroup(sg) {
  return HEX_GROUPS.indexOf(sg) >= 0;
}

// Convert axial hex coordinates to pixel (supports both orientations)
function hexToPixel(q, r) {
  if (hexFlatTop) {
    // Flat-top orientation (rotated 30° from pointy-top)
    var x = hexSize * 1.5 * q;
    var y = hexSize * Math.sqrt(3) * (r + q / 2.0);
    return { x: x, y: y };
  } else {
    // Pointy-top orientation (default)
    var x = hexSize * Math.sqrt(3) * (q + r / 2.0);
    var y = hexSize * 1.5 * r;
    return { x: x, y: y };
  }
}

// Convert pixel to axial hex coordinates (supports both orientations)
function pixelToHex(x, y) {
  var q, r;
  if (hexFlatTop) {
    // Flat-top orientation
    q = (2.0 / 3 * x) / hexSize;
    r = (Math.sqrt(3) / 3 * y - 1.0 / 3 * x) / hexSize;
  } else {
    // Pointy-top orientation
    q = (Math.sqrt(3) / 3 * x - 1.0 / 3 * y) / hexSize;
    r = (2.0 / 3 * y) / hexSize;
  }
  return hexRound(q, r);
}

// Round fractional hex coordinates to nearest hex
function hexRound(q, r) {
  var s = -q - r;
  var rq = Math.round(q);
  var rr = Math.round(r);
  var rs = Math.round(s);

  var q_diff = Math.abs(rq - q);
  var r_diff = Math.abs(rr - r);
  var s_diff = Math.abs(rs - s);

  if (q_diff > r_diff && q_diff > s_diff) {
    rq = -rr - rs;
  } else if (r_diff > s_diff) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
}

// Get hex cell key for storage
function hexKey(q, r) {
  return q + "," + r;
}

// Draw a single hexagon at pixel position (supports both orientations)
function drawHexagon(cx, cy, size, fillColor, strokeColor) {
  push();
  fill(fillColor);
  stroke(strokeColor);
  beginShape();
  // Start angle: 30° for pointy-top, 0° for flat-top
  var startAngle = hexFlatTop ? 0 : Math.PI / 6;
  for (var i = 0; i < 6; i++) {
    var angle = startAngle + i * Math.PI / 3;
    var vx = cx + size * Math.cos(angle);
    var vy = cy + size * Math.sin(angle);
    vertex(vx, vy);
  }
  endShape(CLOSE);
  pop();
}

// HexCell class
function HexCell(q, r) {
  this.q = q;
  this.r = r;
  this.state = 0;
  this.eq_class = 0;

  this.full_stroke = 0;
  this.full_fill = 0;
  this.empty_stroke = 200;
  this.empty_fill = 255;

  this.fade_duration = 100.0;
  this.fading = false;
  this.fade_start = null;

  this.toggle = function() {
    this.state = 1 - this.state;
  };

  this.setState = function(st) {
    this.state = st;
  };

  this.startFade = function() {
    this.fade_start = millis();
    this.fading = true;
  };

  this.intensity = function() {
    var t = millis();
    if (this.fading && t - this.fade_start > this.fade_duration) {
      this.fading = false;
    }

    var lambda = this.state;
    if (this.fading) {
      lambda = (t - this.fade_start) / this.fade_duration;
      if (this.state == 0) {
        lambda = 1 - lambda;
      }
    }
    return lambda;
  };

  this.display = function() {
    var lambda = this.intensity();
    var fillVal = map(lambda, 0, 1, this.empty_fill, this.full_fill);
    var strokeVal = map(lambda, 0, 1, this.empty_stroke, this.full_stroke);

    var pos = hexToPixel(this.q, this.r);
    var cx = grid_width_px / 2 + pos.x;
    var cy = grid_width_px / 2 + pos.y;

    drawHexagon(cx, cy, hexSize * 0.95, fillVal, strokeVal);
  };
}

// Initialize hexagonal grid
function initHexCells() {
  hexCells = {};

  // Calculate how many hexes we need to cover the canvas
  var hexW = hexSize * Math.sqrt(3); // width of hex
  var hexH = hexSize * 1.5; // vertical spacing

  hexWidth = Math.ceil(grid_width_px / hexW) + 4;
  hexHeight = Math.ceil(grid_width_px / hexH) + 4;

  // Create hex cells - need to cover all corners of the square canvas
  // The axial coordinate system is skewed, so we need a larger range
  var halfH = Math.floor(hexHeight / 2) + 4;

  // For each r, we need to adjust q range to cover the full canvas width
  // In pointy-top axial coords, pixel x = hexSize * sqrt(3) * (q + r/2)
  // So at the edges of the canvas, we need q values that span the full width
  for (var r = -halfH; r <= halfH; r++) {
    // Calculate q range needed for this r to cover canvas width
    var minQ = Math.floor(-hexWidth/2 - r/2) - 2;
    var maxQ = Math.ceil(hexWidth/2 - r/2) + 2;

    for (var q = minQ; q <= maxQ; q++) {
      // Check if this hex is within canvas bounds
      var pos = hexToPixel(q, r);
      var cx = grid_width_px / 2 + pos.x;
      var cy = grid_width_px / 2 + pos.y;

      // Include hex if its center is within reasonable bounds (with margin)
      var margin = hexSize * 2;
      if (cx > -margin && cx < grid_width_px + margin &&
          cy > -margin && cy < grid_width_px + margin) {
        var key = hexKey(q, r);
        hexCells[key] = new HexCell(q, r);
      }
    }
  }
}

// Draw all hex cells
function drawHexCells() {
  for (var key in hexCells) {
    hexCells[key].display();
  }
}

// Get hex cell at coordinates, creating if needed
function getHexCell(q, r) {
  var key = hexKey(q, r);
  if (!hexCells[key]) {
    hexCells[key] = new HexCell(q, r);
  }
  return hexCells[key];
}

// Draw hex domain/lattice boundary
function drawHexDomain() {
  push();
  noFill();
  strokeWeight(2);

  var L = lattice_a;

  // Domain colors
  var domainColor = color(156, 121, 255);   // #9C79FF purple
  var latticeColor = color(121, 202, 255);  // #79CAFF blue
  var mirrorColor = color(255, 121, 156);   // pink for mirror lines

  // Get pixel positions of lattice corners (rhombus)
  // Lattice is spanned by vectors (L, 0) and (0, L) in axial coords
  var origin = hexToPixel(0, 0);
  var corner1 = hexToPixel(L, 0);
  var corner2 = hexToPixel(L, L);
  var corner3 = hexToPixel(0, L);

  var cx = grid_width_px / 2;
  var cy = grid_width_px / 2;

  // Draw lattice rhombus (blue)
  stroke(latticeColor);
  beginShape();
  vertex(cx + origin.x, cy + origin.y);
  vertex(cx + corner1.x, cy + corner1.y);
  vertex(cx + corner2.x, cy + corner2.y);
  vertex(cx + corner3.x, cy + corner3.y);
  endShape(CLOSE);

  // Draw fundamental domain (purple) - depends on symmetry group
  stroke(domainColor);

  if (symmetry_group === "333") {
    // p3: fundamental domain is 1/3 of the rhombus (triangle)
    var mid = hexToPixel(L/3, L/3);
    beginShape();
    vertex(cx + origin.x, cy + origin.y);
    vertex(cx + corner1.x/3, cy + corner1.y/3);
    vertex(cx + mid.x, cy + mid.y);
    vertex(cx + corner3.x/3, cy + corner3.y/3);
    endShape(CLOSE);
  } else if (symmetry_group === "3*3") {
    // p31m: mirrors through edges (hexMirrorS axis: q=r line)
    var mid = hexToPixel(L/3, L/3);
    beginShape();
    vertex(cx + origin.x, cy + origin.y);
    vertex(cx + corner1.x/3, cy + corner1.y/3);
    vertex(cx + mid.x, cy + mid.y);
    endShape(CLOSE);
    // Draw mirror line (along q=r direction)
    stroke(mirrorColor);
    var mEnd = hexToPixel(L/2, L/2);
    line(cx + origin.x, cy + origin.y, cx + mEnd.x, cy + mEnd.y);
  } else if (symmetry_group === "*333") {
    // p3m1: mirrors through vertices (hexMirrorQ axis: r=0 line)
    var mid = hexToPixel(L/3, L/3);
    beginShape();
    vertex(cx + origin.x, cy + origin.y);
    vertex(cx + corner1.x/3, cy + corner1.y/3);
    vertex(cx + mid.x, cy + mid.y);
    endShape(CLOSE);
    // Draw mirror line (along r=0 direction, i.e., q axis)
    stroke(mirrorColor);
    var mEnd = hexToPixel(L/2, 0);
    line(cx + origin.x, cy + origin.y, cx + mEnd.x, cy + mEnd.y);
  } else if (symmetry_group === "632") {
    // p6: fundamental domain is 1/6 of the rhombus
    var sixth = hexToPixel(L/3, L/6);
    beginShape();
    vertex(cx + origin.x, cy + origin.y);
    vertex(cx + corner1.x/3, cy + corner1.y/3);
    vertex(cx + sixth.x, cy + sixth.y);
    endShape(CLOSE);
  } else if (symmetry_group === "*632") {
    // p6m: fundamental domain is 1/12 of the rhombus (smallest)
    var twelfth = hexToPixel(L/6, L/6);
    beginShape();
    vertex(cx + origin.x, cy + origin.y);
    vertex(cx + corner1.x/6, cy + corner1.y/6);
    vertex(cx + twelfth.x, cy + twelfth.y);
    endShape(CLOSE);
    // Draw mirror lines
    stroke(mirrorColor);
    var mEnd1 = hexToPixel(L/2, 0);
    var mEnd2 = hexToPixel(L/2, L/2);
    line(cx + origin.x, cy + origin.y, cx + mEnd1.x, cy + mEnd1.y);
    line(cx + origin.x, cy + origin.y, cx + mEnd2.x, cy + mEnd2.y);
  }

  pop();
  strokeWeight(1);
}

// ============================================
// Integer Axial Coordinate Operations
// ============================================

// Rotation operations in axial coords (around origin)
function hexRot60(q, r) { return { q: -r, r: q + r }; }
function hexRot120(q, r) { return { q: -q - r, r: q }; }
function hexRot180(q, r) { return { q: -q, r: -r }; }
function hexRot240(q, r) { return { q: r, r: -q - r }; }
function hexRot300(q, r) { return { q: q + r, r: -q }; }

// Mirror operations in axial coords
// These correspond to swapping pairs in cube coordinates
function hexMirrorS(q, r) { return { q: r, r: q }; }           // swap q↔r (across s-axis)
function hexMirrorQ(q, r) { return { q: q, r: -q - r }; }      // across q-axis
function hexMirrorR(q, r) { return { q: -q - r, r: r }; }      // across r-axis

// Wrap coordinates to lattice cell [0, L) x [0, L)
function hexWrap(q, r, L) {
  return {
    q: ((q % L) + L) % L,
    r: ((r % L) + L) % L
  };
}

// Generate full orbit of a point under a symmetry group
function hexOrbit(q, r, L, group) {
  var dominated = {};
  var orbit = [];

  function addPoint(p) {
    var wrapped = hexWrap(p.q, p.r, L);
    var key = wrapped.q + "," + wrapped.r;
    if (!dominated[key]) {
      dominated[key] = true;
      orbit.push(wrapped);
    }
  }

  var p = { q: q, r: r };

  if (group === "333") {
    // p3: 3-fold rotations only
    addPoint(p);
    addPoint(hexRot120(p.q, p.r));
    addPoint(hexRot240(p.q, p.r));
  }
  else if (group === "3*3") {
    // p31m: 3-fold rotations + mirrors (rotation centers not all on mirrors)
    addPoint(p);
    addPoint(hexRot120(p.q, p.r));
    addPoint(hexRot240(p.q, p.r));
    // Add mirrors
    var m = hexMirrorS(p.q, p.r);
    addPoint(m);
    addPoint(hexRot120(m.q, m.r));
    addPoint(hexRot240(m.q, m.r));
  }
  else if (group === "*333") {
    // p3m1: 3-fold rotations + mirrors (all rotation centers on mirrors)
    addPoint(p);
    addPoint(hexRot120(p.q, p.r));
    addPoint(hexRot240(p.q, p.r));
    // Add mirrors (different axis than 3*3)
    var m = hexMirrorQ(p.q, p.r);
    addPoint(m);
    addPoint(hexRot120(m.q, m.r));
    addPoint(hexRot240(m.q, m.r));
  }
  else if (group === "632") {
    // p6: 6-fold rotation only
    var current = p;
    for (var i = 0; i < 6; i++) {
      addPoint(current);
      current = hexRot60(current.q, current.r);
    }
  }
  else if (group === "*632") {
    // p6m: 6-fold rotation + mirrors
    var current = p;
    for (var i = 0; i < 6; i++) {
      addPoint(current);
      current = hexRot60(current.q, current.r);
    }
    // Add all mirrors
    var m = hexMirrorS(p.q, p.r);
    current = m;
    for (var i = 0; i < 6; i++) {
      addPoint(current);
      current = hexRot60(current.q, current.r);
    }
  }

  return orbit;
}

// Find canonical representative (lexicographically smallest in orbit)
function hexCanonical(q, r, L, group) {
  var orbit = hexOrbit(q, r, L, group);

  orbit.sort(function(a, b) {
    if (a.q !== b.q) return a.q - b.q;
    return a.r - b.r;
  });

  return orbit[0];
}

// Compute equivalence classes for hex grid
function computeHexEqClasses() {
  // Use lattice_a as the period (should equal domain_a for hex groups)
  var L = lattice_a;

  for (var key in hexCells) {
    var cell = hexCells[key];
    var canon = hexCanonical(cell.q, cell.r, L, symmetry_group);
    // Use canonical representative as equivalence class ID
    cell.eq_class = canon.r * L + canon.q;
  }
}

// Enforce symmetry on hex grid
function enforceHexSymmetry() {
  // Build a map from eq_class to state
  // For each equivalence class, find the state of its canonical representative
  var classStates = {};
  var L = lattice_a;

  // First pass: collect states from canonical representatives
  for (var key in hexCells) {
    var cell = hexCells[key];
    var canon = hexCanonical(cell.q, cell.r, L, symmetry_group);
    var canonKey = hexKey(canon.q, canon.r);

    // If this cell IS the canonical representative, record its state
    if (cell.q === canon.q && cell.r === canon.r) {
      if (classStates[cell.eq_class] === undefined) {
        classStates[cell.eq_class] = cell.state;
      }
    }
  }

  // For classes without a canonical cell in view, use any cell in that class
  for (var key in hexCells) {
    var cell = hexCells[key];
    if (classStates[cell.eq_class] === undefined) {
      classStates[cell.eq_class] = cell.state;
    }
  }

  // Second pass: apply canonical state to all cells
  for (var key in hexCells) {
    var cell = hexCells[key];
    if (classStates[cell.eq_class] !== undefined) {
      cell.setState(classStates[cell.eq_class]);
    }
  }
}

// Fade a hex equivalence class
function fadeHexClass(eq_class, state) {
  for (var key in hexCells) {
    var cell = hexCells[key];
    if (cell.eq_class == eq_class && cell.state != state) {
      cell.toggle();
      cell.startFade();
    }
  }
}

// Set all cells in a hex equivalence class to a state
function setHexClass(eq_class, state) {
  for (var key in hexCells) {
    var cell = hexCells[key];
    if (cell.eq_class == eq_class) {
      cell.setState(state);
    }
  }
}

// Get hex cell at pixel position
function hexCellAtPixel(px, py) {
  // Adjust for grid center
  var x = px - grid_width_px / 2;
  var y = py - grid_width_px / 2;

  var hex = pixelToHex(x, y);
  var key = hexKey(hex.q, hex.r);

  if (hexCells[key]) {
    return hexCells[key];
  }
  return null;
}

// Get state at any hex position (for GoL)
function getHexStateAt(q, r) {
  // Find the canonical representative for this position
  var L = lattice_a;
  var canon = hexCanonical(q, r, L, symmetry_group);
  var key = hexKey(canon.q, canon.r);

  if (hexCells[key]) {
    return hexCells[key].state;
  }

  // If canonical cell not in grid, look up any cell with same eq_class
  var eqClass = canon.r * L + canon.q;
  for (var k in hexCells) {
    if (hexCells[k].eq_class === eqClass) {
      return hexCells[k].state;
    }
  }

  return 0;
}

// Hex neighbors (6 directions)
var HEX_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

// Count hex neighbors for Game of Life
function countHexNeighbors(q, r) {
  var count = 0;
  for (var i = 0; i < 6; i++) {
    var nq = q + HEX_DIRECTIONS[i].q;
    var nr = r + HEX_DIRECTIONS[i].r;
    count += getHexStateAt(nq, nr);
  }
  return count;
}

// Game of Life step for hex grid
function golHexStep() {
  // Compute next states for domain cells
  var nextStates = {};

  for (var r = 0; r < domain_b; r++) {
    for (var q = 0; q < domain_a; q++) {
      var key = hexKey(q, r);
      var cell = hexCells[key];
      if (!cell) continue;

      var neighbors = countHexNeighbors(q, r);
      var currentState = cell.state;
      var nextState;

      // Hex GoL rules (slightly different from square - using 2/3 rule)
      if (currentState === 1) {
        nextState = (neighbors === 2 || neighbors === 3) ? 1 : 0;
      } else {
        nextState = (neighbors === 2) ? 1 : 0; // Birth at 2 for hex
      }
      nextStates[key] = nextState;
    }
  }

  // Apply next states
  for (var key in nextStates) {
    var cell = hexCells[key];
    if (cell && cell.state !== nextStates[key]) {
      cell.setState(nextStates[key]);
      cell.startFade();
    }
  }

  // Propagate via symmetry
  enforceHexSymmetry();
}
