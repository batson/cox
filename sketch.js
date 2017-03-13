
/*
 * @name Cox
 * @frame 720,425
 * @description The circle changes color when you click on it.
 * <p><em><span class="small"> To run this example locally, you will need the
 * <a href="http://p5js.org/reference/#/libraries/p5.dom">p5.dom library</a>.
 * </em></p>
 */

// cells
var cells;

var domain_a, domain_a1, domain_b;
var lattice_a, lattice_a1, lattice_b;

var n_classes;
var n_cells;

var grid_width

var grid_width_px;
var cell_size_px;

var handle_size_px;

var filling;
var filling_state;

var canvas;

var symmetry_group;
var symmetry_sel;

var SYMGROUPS;

function setup() {
  //initialize grid

  grid_width_px = min(windowWidth, 500);

  pad_px = 20;

  grid_center_x = pad_px + grid_width_px/2;
  grid_center_y = pad_px + grid_width_px/2;

  grid_width = 30;
  cell_size_px = grid_width_px/grid_width;
  grid_width_px = grid_width * cell_size_px;

  grid_corner_x = grid_center_x - grid_width_px/2;
  grid_corner_y = grid_center_y - grid_width_px/2;

  canvas = createCanvas(grid_width_px + 2*pad_px, grid_width_px + 2*pad_px);

  //initialize domain domain

  domain_a = 5;
  domain_a1 = 0;
  domain_b = 5;

  lattice_a = domain_a;
  lattice_a1 = domain_a1;
  lattice_b = domain_b;

  filling = false;
  filling_state = 0;

  symmetry_group = "o";

  initCells();

  computeEqClasses();

  //symmetry selector
  SYMGROUPS = ["o",
               "2222", "22x", "22*", "2*22","*2222",
               "442", "4*2", "*442",
               "xx", "x*", "**",
               "333", "3*3", "*333",
               "632", "*632"];
  symmetry_sel = createSelect();
  for (var i = 0; i < SYMGROUPS.length; i++) {
    symmetry_sel.option(SYMGROUPS[i]);
    console.log(SYMGROUPS[i]);
  }
  symmetry_sel.position(0, 0);
  symmetry_sel.changed(updateSymmetryGroup);
}



function draw() {
    background(255);
    updateCells();
    drawCells();
}

function initCells(){
    var x, y;
    cells = [];
    for(var i = 0; i < grid_width; i++){
            cells[i] = [];
        for(var j = 0; j < grid_width; j++){
            x = grid_corner_x + cell_size_px * i;
            y = grid_corner_y + cell_size_px * j;
            cells[i][j] = new Cell(i, j, x, y);
            cells[i][j].setSize(cell_size_px);
        }
    }
}

function enforceSymmetry(){
  for(var i = 0; i < grid_width; i++){
      for(var j = 0; j < grid_width; j++){
          var cell = cells[i][j];
          var state = cell.state;
          var domain_rep = latticeToDomain(i,j);
          var eq_class = cellToInt(domain_rep[0], domain_rep[1], domain_b);
          fadeClass(eq_class, state);
    }
  }
}

function updateCells(){
    if(filling){


    }

}

function drawCells(){
  for(var i = 0; i < grid_width; i++){
      for(var j = 0; j < grid_width; j++){
          cells[i][j].display();
      }
    }
}

function computeEqClasses(){
    n_classes = domain_a * domain_b;
    for(var i = 0; i < grid_width; i++){
     for(var j = 0; j < grid_width; j++){
      var lattice_rep = modLattice(i,j);
      var domain_rep = latticeToDomain(lattice_rep[0], lattice_rep[1]);
      var eq_class = cellToInt(domain_rep[0], domain_rep[1], domain_b);
      cells[i][j].eq_class = eq_class;
     }
   }
}

function modLattice(a, b){
    var b_remainder = b % lattice_b;
    var a_remainder = (a - lattice_a1*(b - b_remainder)/lattice_b) % lattice_a;

    return [a_remainder, b_remainder]
}

function latticeToDomain(ia, ib) {
  //use coordinates of centers of squares
  var a = ia + 0.5;
  var b = ib + 0.5;
  var A = domain_a;
  var B = domain_b;

  if(symmetry_group == "o"){
  }
  else if(symmetry_group == "2222"){
    if (a > A){
     a = 2*A - a;
     b = B - b;
    }
  }
  else if(symmetry_group == "22x"){
    if (a > A){
      a = 2*A - a;
      b = (b + B) % (2*B);
    }
    if (b > B){
      a = A - a;
      b = 2*B - b;
    }
  }
  else if(symmetry_group == "22*"){
    if (a > A)
      a = 2*A - a;
    if (b > B){
      a = A - a;
      b = 2*B - b;
    }
  }
  else if(symmetry_group == "2*22"){
    if (a > A)
      a = 2*A - a;
    if (b > 2*B)
      b = 4*B - b;
    if (b > B){
      b = 2*B - b;
      a = A - a;
    }
  }
  else if(symmetry_group == "*2222"){
    if (a > A)
      a = 2*A - a;
    if (b > B)
      b = 2*B - b;
  }
  else if(symmetry_group == "442"){
    while(a > A || b > A){
      var b_new = a;
      var a_new = 2*A - b;
      a = a_new;
      b = b_new;
    }
  }
  else if(symmetry_group == "4*2"){
    while(a > A || b > A){
      var b_new = a;
      var a_new = 2*A - b;
      a = a_new;
      b = b_new;
    }
    if (a + b > A){
      var b_new = A - a;
      var a_new = A - b;
      a = a_new;
      b = b_new;
    }
  }
  else if(symmetry_group == "*442"){
    while(a > A || b > A){
      var b_new = a;
      var a_new = 2*A - b;
      a = a_new;
      b = b_new;
    }
    if (b > a){
      var b_new = a;
      var a_new = b;
      a = a_new;
      b = b_new;
    }
  }
  else if(symmetry_group == "xx"){
    if (a > A){
      b = (b + B/2) % B;
      a = 2*A - a;
    }
  }
  else if(symmetry_group == "x*"){
    if (a > 2*A){
      a = 4*A - a;
      b = (b + B/2) % B;
    }
    if (a > A){
      a = 2*A - a;
    }
  }
  else if(symmetry_group == "**"){
    if (a > A)
      a = 2*A - a;
  }
  else if(symmetry_group == "333"){
    console.log("no triangles yet");
  }
  else if(symmetry_group == "3*3"){
    console.log("no triangles yet");
  }
  else if(symmetry_group == "*333"){
    console.log("no triangles yet");
  }
  else if(symmetry_group == "632"){
    console.log("no triangles yet");
  }
  else if(symmetry_group == "*632"){
    console.log("no triangles yet");
  }
  else{
   console.log("invalid symmetry group (lattice)");
  }

  var oa = round(a - 0.5);
  var ob = round(b - 0.5);

  return [oa, ob];
}

function updateSymmetryGroup(){
  sg = symmetry_sel.value();
  if(sg == symmetry_group)
    return;
  setSymmetryGroup(sg);
  computeEqClasses();
  enforceSymmetry();
}

function setSymmetryGroup(sg){
  //it's probably a rectangle
  lattice_a1 = domain_a1;

  var a = domain_a;
  var b = domain_b;

  if(sg == "o"){
    lattice_a = domain_a;
    lattice_b = domain_b;
    symmetry_group = sg;
  }
  else if(sg == "2222"){
    lattice_a = 2*domain_a;
    lattice_b = domain_b;
    lattice_a1 = domain_a1;
    symmetry_group = sg;
  }
  else if(sg == "22x"){
    lattice_a = 2*domain_a;
    lattice_b = 2*domain_b;
    symmetry_group = sg;
  }
  else if(sg == "22*"){
    lattice_a = 2*domain_a;
    lattice_b = 2*domain_b;
    symmetry_group = sg;
  }
  else if(sg == "2*22"){
    lattice_a = 2*domain_a;
    lattice_b = 4*domain_b;
    symmetry_group = sg;
  }
  else if(sg == "*2222"){
    lattice_a = 2*domain_a;
    lattice_b = 2*domain_b;
    symmetry_group = sg;
  }
  else if(sg == "442"){
    domain_b = domain_a;
    lattice_a = 2*domain_a;
    lattice_b = 2*domain_b;
    symmetry_group = sg;
  }
  else if(sg == "4*2"){
    domain_b = domain_a;
    lattice_a = 2*domain_a;
    lattice_b = 2*domain_b;
    symmetry_group = sg;
  }
  else if(sg == "*442"){
    domain_b = domain_a;
    lattice_a = 2*domain_a;
    lattice_b = 2*domain_b;
    symmetry_group = sg;
  }
  else if(sg == "xx"){
    lattice_a = 2*domain_a;
    lattice_b = domain_b;
    symmetry_group = sg;
  }
  else if(sg == "x*"){
    lattice_a = 4*domain_a;
    lattice_b = domain_b;
    symmetry_group = sg;
  }
  else if(sg == "**"){
    lattice_a = 2*domain_a;
    lattice_b = domain_b;
    symmetry_group = sg;
  }
  else if(sg == "333"){
    console.log("no triangles yet");
    //symmetry_group = sg;
  }
  else if(sg == "3*3"){
    console.log("no triangles yet");
    //symmetry_group = sg;
  }
  else if(sg == "*333"){
    console.log("no triangles yet");
    //symmetry_group = sg;
  }
  else if(sg == "632"){
    console.log("no triangles yet");
    //symmetry_group = sg;
  }
  else if(sg == "*632"){
    console.log("no triangles yet");
    //symmetry_group = sg;
  }
  else{
   console.log("invalid symmetry group selected");
  }
}

function cellToInt(a, b, dim){
  return dim*a + b;
}

function currentCell(){
  if(overGrid(mouseX, mouseY)){
    var cell_a = floor((mouseX - grid_corner_x)/cell_size_px);
    var cell_b = floor((mouseY - grid_corner_y)/cell_size_px);

    return cells[cell_a][cell_b];
  }
  else{
    return null;
  }
}

function overGrid(x, y){
 if (x > grid_corner_x && x < grid_corner_x + grid_width_px){
   if (y > grid_corner_y && y < grid_corner_y + grid_width_px){
     return true;

   }
 }
 return false;
}

// Mouse and touch actions
function mousePressed() {
  if(overGrid(mouseX, mouseY)){
    var cell = currentCell();
    filling_state = 1 - cell.state;
    var eq_class = cell.eq_class;
    fadeClass(eq_class, filling_state);
  }

  //return false;
}

function mouseDragged() {
  if(overGrid(mouseX, mouseY)){
    var cell = currentCell();
    var eq_class = cell.eq_class;
    fadeClass(eq_class, filling_state);
  }

    return false;
}

function mouseReleased(){

    return false;
}


function fadeClass(eq_class, state){
  for(var i = 0; i < grid_width; i++){
   for(var j = 0; j < grid_width; j++){
     var cell = cells[i][j];
     if (cell.eq_class == eq_class && cell.state!= state){
        cell.toggle();
        cell.startFade();
       }
     }
  }
}

//Cell structure

function Cell(_a, _b, _x, _y){
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

    this.setSize = function(isize){
      this.size = isize;
     }

    this.startFade = function(){
        this.fade_start = millis();
        this.fading = true;
        this.pulsing = false;
    }

    this.startPulse = function(){
        this.pulse_start = millis();
        this.fading = false;
        this.pulsing = true;
    }

    this.stopPulse = function(){
        this.pulsing = false;
    }

    this.togglePulse = function(){
        if(pulsing){
            this.stop_pulse();
        }
        else{
            this.start_pulse();
        }
    }

    this.toggle = function(){
        this.state = 1 - this.state;
    }

    this.setState = function(st){
        this.state = st;
    }

    this.intensity = function(){
        var t = millis();
        if(this.fading && t - this.fade_start > this.fade_duration){
          this.fading = false;
        }

        var lambda = this.state;
        if(this.fading){
         lambda = (t - this.fade_start)/this.fade_duration;
         if(this.state == 0){
           lambda = 1 - lambda;
         }
        }
        else if(this.pulsing){
         lambda = sin( (t - this.pulse_start) / this.pulse_period * TWO_PI);
         if(this.state == 1){
           lambda = 1 - lambda;
         }
        }
        return lambda;
    }

    this.display = function(){
       var lambda = this.intensity();

       fill(map(lambda, 0, 1, this.empty_fill, this.full_fill));
       stroke(map(lambda, 0 , 1, this.empty_stroke, this.full_stroke));

       rect(this.x, this.y, this.size, this.size);
    }
}
