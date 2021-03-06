import controlP5.*;
import java.util.*;

/**
 * Cox
 * 
 * App for generating tilings from symmetry group.
 */

ControlP5 cp5;

String symmetry_group;
String[] SYMGROUPS;

//we are assuming the first basis vector is always horizontal
int domain_a, domain_a1, domain_b;
int lattice_a, lattice_a1, lattice_b;

int n_classes;
int n_cells;

//must be even
int grid_width;

int grid_width_px;
int cell_size_px;

int handle_size_px;

//locations
int grid_center_x, grid_center_y;
int grid_corner_x, grid_corner_y;

color domain_color = #9C79FF;
color lattice_color = #79CAFF;

boolean showDomain;

DomainSelector ds;

Cell[][] cells;

boolean filling;
int filling_state;

void setup() {
  SYMGROUPS = new String[]{"o", 
               "2222", "22x", "22*", "2*22","*2222",
               "442", "4*2", "*442",
               "xx", "x*", "**",
               "333", "3*3", "*333",
               "632", "*632"};

  int menu_width_px = 300;
  grid_width_px = 16*50;
  int pad_px = 20;
  
  grid_center_x = pad_px + grid_width_px/2;
  grid_center_y = pad_px + grid_width_px/2;
  size(1340, 1040);
   
  //ensure integrality
  init_grid(50);   
   
  domain_a = 5;
  domain_a1 = 0;
  domain_b = 5;
   
  lattice_a = domain_a;
  lattice_a1 = domain_a1;
  lattice_b = domain_b;

  filling = false;
  filling_state = 0;

  ds = new DomainSelector(domain_a, domain_b, cell_size_px, grid_corner_x, grid_corner_y, 2, 2);

  set_symmetry_group("o");


  makeMenus(grid_width_px + 2*pad_px);

  cells = new Cell[grid_width][grid_width];

  init_cells();

  compute_eq_classes();
}

void makeMenus(int menu_left){
  int spacer = 20;
  int y = spacer;

  Textlabel textLab;

  cp5 = new ControlP5(this);
  
  //List of symmetry groups
  textLab = cp5.addTextlabel("symLabel")
     .setText("Symmetry Groups")
     .setPosition(menu_left,y)
     .setColorValue(0)
     .setFont(createFont("Georgia",20));
  y += textLab.getHeight();
  y += spacer;

  List l = Arrays.asList(SYMGROUPS);
  cp5.addScrollableList("symList")
     .setCaptionLabel("Symmetry Group")
     .setPosition(menu_left + spacer, y)
     .setSize(150, 260)
     .setBarHeight(20)
     .setItemHeight(20)
     .setType(ControlP5.LIST)
     .addItems(l);

  y += 260;
  
  //grid
  y += spacer;
  textLab = cp5.addTextlabel("gridlabel")
     .setText("Grid")
     .setPosition(menu_left,y)
     .setColorValue(0)
     .setFont(createFont("Georgia",20));
  y += textLab.getHeight();
  
  y += spacer;
  cp5.addButton("refinePressed")
   .setCaptionLabel("Refine")
   .setValue(0)
   .setPosition(menu_left + spacer,y)
   .setSize(75,20);

  cp5.addButton("coarsenPressed")
   .setCaptionLabel("Coarsen")
   .setValue(0)
   .setPosition(menu_left + 75 + spacer + spacer,y)
   .setSize(75,20);
  
  //domain
  
  y += spacer;

  textLab = cp5.addTextlabel("domainlabel")
     .setText("Domain")
     .setPosition(menu_left,y)
     .setColorValue(0)
     .setFont(createFont("Georgia",20));
  y += textLab.getHeight();
  
  y += spacer;
  
  cp5.addToggle("showDomain")
     .setPosition(menu_left + spacer,y)
     .setSize(60,20)
     .setCaptionLabel("Domain")
     .setLabelVisible(true);
}

void draw(){
  background(255);
  updateCells();
  drawCells();
  if(showDomain){
   drawDomain(); 
  }
}

void updateCells(){
  if(!ds.dragging){
    if(!showDomain || !(ds.overHandle())){
       if(filling) {
         if(overGrid(mouseX, mouseY)){
           int cell_a = (mouseX - grid_corner_x)/cell_size_px;
           int cell_b = (mouseY - grid_corner_y)/cell_size_px;
           int eq_class = cells[cell_a][cell_b].eq_class;
           fadeClass(eq_class, filling_state);
         }
         if(!mousePressed){
           filling = false;
         }
      }
      if(!filling){
        if(overGrid(mouseX, mouseY) & mousePressed){
          filling = true;
          int cell_a = (mouseX - grid_corner_x)/cell_size_px;
          int cell_b = (mouseY - grid_corner_y)/cell_size_px;
          filling_state = 1 - cells[cell_a][cell_b].state;
        }
      }
    }
  }
}

void drawDomain(){
  ds.update();
  ds.display();
  if(!ds.dragging){
    if(!(domain_a == ds.dwidth && domain_b == ds.dheight)){
      domain_a = ds.dwidth;
      domain_b = ds.dheight;
      set_symmetry_group(symmetry_group);
      compute_eq_classes();
      enforce_symmetry();
    }
  }
}

boolean overDomainHandle(int x, int y){
  x = x - grid_corner_x - cell_size_px*domain_a;
  y = y - grid_corner_y - cell_size_px*domain_b;
  if(x*x + y*y < handle_size_px*handle_size_px)
    return true;
  else
    return false; 
}

boolean overGrid(int x, int y){
 if (x > grid_corner_x && x < grid_corner_x + grid_width_px){
   if (y > grid_corner_y && y < grid_corner_y + grid_width_px){
     return true;
     
   }
 }
 return false;
}

public void symList(int n){
  println("updating symmetry group to " + SYMGROUPS[n]);
 update_symmetry_group(SYMGROUPS[n]);
}

public void refinePressed(int theValue) {
  println("refine pressed");
  if(cell_size_px/2 < 3)
    println("cells are too small to be refined");
  else
    refine_grid();
}

public void coarsenPressed(int theValue) {
  println("coarsen pressed");
  coarsen_grid();
}

void fadeClass(int eq_class){
  Cell cell;
  for(int i = 0; i < grid_width; i++){
   for(int j = 0; j < grid_width; j++){
     cell = cells[i][j];
     if (cell.eq_class == eq_class){
       cell.toggle();
       cell.start_fade(); 
     }
    }
  }
}

void fadeClass(int eq_class, int state){
  Cell cell;
  for(int i = 0; i < grid_width; i++){
   for(int j = 0; j < grid_width; j++){
     cell = cells[i][j];
     if (cell.eq_class == eq_class){
       if(cell.state != state){
           cell.toggle();
           cell.start_fade(); 
       }
     }
    }
  }
}

void pulseClass(int eq_class){
  Cell cell;
  for(int i = 0; i < grid_width; i++){
   for(int j = 0; j < grid_width; j++){
     cell = cells[i][j];
     if (cell.eq_class == eq_class){
       cell.toggle_pulse();
     }
     else
       cell.stop_pulse();
    }
  }
}

void toggleClass(int eq_class){
  for(int i = 0; i < grid_width; i++){
   for(int j = 0; j < grid_width; j++){
     if (cells[i][j].eq_class == eq_class){
       cells[i][j].toggle();
     }
    }
  }
}

void setClass(int eq_class, int state){
  for(int i = 0; i < grid_width; i++){
   for(int j = 0; j < grid_width; j++){
     if (cells[i][j].eq_class == eq_class){
       cells[i][j].set_state(state);
     }
    }
  }
}

void init_grid(int gw){
  grid_width = gw;
  cell_size_px = grid_width_px/grid_width;
  grid_width_px = grid_width * cell_size_px;
  
  grid_corner_x = grid_center_x - grid_width_px/2;
  grid_corner_y = grid_center_y - grid_width_px/2;
}

void refine_grid(){
  //double number of gridcells
  set_grid(grid_width*2);
}

void coarsen_grid(){ 
  set_grid(grid_width/2);
}

void set_grid(int gw){
  //set width of the grid
  noLoop();
  
  domain_a = domain_a * gw / grid_width;
  domain_b = domain_b * gw / grid_width;
  domain_a1 = domain_a1 * gw / grid_width;
  lattice_a = lattice_a * gw / grid_width;
  lattice_b = lattice_b * gw / grid_width;
  lattice_a1 = lattice_a1 * gw / grid_width;
  
  int old_gw = grid_width;
  init_grid(gw);
  Cell[][] old_cells = cells;
  cells = new Cell[grid_width][grid_width];
  init_cells();
  for(int i = 0; i < grid_width; i++){
     for(int j = 0; j < grid_width; j++){
        cells[i][j].set_state(old_cells[i*old_gw/gw][j*old_gw/gw].state);
   }
  }
  compute_eq_classes();
  enforce_symmetry();
  update_domain_selector();
  loop();
}

void update_domain_selector(){
  ds.set_domain(domain_a, domain_b);
  ds.set_ratio(lattice_a/domain_a, lattice_b/domain_b); 
  ds.cell_size_px = cell_size_px;
  if(symmetry_group.contains("4")){
    ds.square = true;
  }
  else
    ds.square = false;
}

void init_cells(){
    int x;
    int y;
    for(int i = 0; i < grid_width; i++){
     for(int j = 0; j < grid_width; j++){
        x = grid_corner_x + cell_size_px * i;
        y = grid_corner_y + cell_size_px * j;
        cells[i][j] = new Cell();
        cells[i][j].set_positions(i, j, x, y);
        cells[i][j].set_size(cell_size_px);
     }
    }
}

void update_symmetry_group(String sg){
  if(sg == symmetry_group)
    return;
  set_symmetry_group(sg);
  compute_eq_classes();
  enforce_symmetry();
  update_domain_selector();
}

void enforce_symmetry(){
  for(int i = 0; i < domain_a; i++){
    for(int j = 0; j < domain_b; j++){
      int state = cells[i][j].state;
      int[] domain_rep = lattice_to_domain(i,j); //in case only a subdomain generates
      int eq_class = cell_to_int(domain_rep[0], domain_rep[1], domain_b);
      setClass(eq_class, state);
    }
  }
}

void compute_eq_classes(){
    n_classes = domain_a * domain_b;
    for(int i = 0; i < grid_width; i++){
     for(int j = 0; j < grid_width; j++){
      int[] lattice_rep = mod_lattice(i,j);
      int[] domain_rep = lattice_to_domain(lattice_rep[0], lattice_rep[1]);
      int eq_class = cell_to_int(domain_rep[0], domain_rep[1], domain_b);
      cells[i][j].eq_class = eq_class;   
     }
    }
}

//keep domain constant. reset lattice.
//this is not idempotent. maybe when u go up the hieirarch, it strictifies?
void set_symmetry_group(String sg){
  //set lattice size from domain
  //change name
  //possibly alter contents
  //assert Arrays.asList(SYMGROUPS).contains(sg); 
  
  //it's probably a rectangle
  lattice_a1 = domain_a1;
  
  int a = domain_a;
  int b = domain_b;

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
    assert(domain_b % 2 == 0);
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
    print("no triangles yet");
    //symmetry_group = sg;
  }
  else if(sg == "3*3"){
    print("no triangles yet");
    //symmetry_group = sg;
  }
  else if(sg == "*333"){
    print("no triangles yet");
    //symmetry_group = sg;
  }
  else if(sg == "632"){
    print("no triangles yet");
    //symmetry_group = sg;
  }
  else if(sg == "*632"){
    print("no triangles yet");
    //symmetry_group = sg;
  }
  else{
   print("invalid symmetry group selected");
  }
}

int[] lattice_to_domain(int ia, int ib){
  //use coordinates of centers of squares
  float a = ia + 0.5;
  float b = ib + 0.5;
  float A = domain_a;
  float B = domain_b;
  
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
    assert(A == B);
    while(a > A || b > A){
      float b_new = a;
      float a_new = 2*A - b;
      a = a_new;
      b = b_new;
    }
  }
  else if(symmetry_group == "4*2"){
    while(a > A || b > A){
      float b_new = a;
      float a_new = 2*A - b;
      a = a_new;
      b = b_new;
    }
    if (a + b > A){
      float b_new = A - a;
      float a_new = A - b;
      a = a_new;
      b = b_new;
    }
  }
  else if(symmetry_group == "*442"){
    while(a > A || b > A){
      float b_new = a;
      float a_new = 2*A - b;
      a = a_new;
      b = b_new;
    }
    if (b > a){
      float b_new = a;
      float a_new = b;
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
    print("no triangles yet");
  }
  else if(symmetry_group == "3*3"){
    print("no triangles yet");
  }
  else if(symmetry_group == "*333"){
    print("no triangles yet");
  }
  else if(symmetry_group == "632"){
    print("no triangles yet");
  }
  else if(symmetry_group == "*632"){
    print("no triangles yet");
  }
  else{
   print("invalid symmetry group (lattice)");
  }
  
  int oa = Math.round(a - 0.5);
  int ob = Math.round(b - 0.5);
  int[] coords = {oa, ob};
  
  return coords;
}

int[] mod_lattice(int a, int b){
  int b_remainder = b % lattice_b;
  int a_remainder = (a - lattice_a1*(b - b_remainder)/lattice_b) % lattice_a;
  int[] coords = {a_remainder, b_remainder};

  return coords;
}

//dim is the range of b
int cell_to_int(int a, int b, int dim){
  return dim*a + b;
}

int[] int_to_cell(int m, int dim){
  int[] coords = {(m - (m % dim))/dim, m % dim};
  return coords;
}

void compute_cell_size(){
  cell_size_px = grid_width_px/grid_width;
}

void drawCells(){
  for(int i = 0; i < grid_width; i++){
    for(int j = 0; j < grid_width; j++){
      cells[i][j].display();
    }
  }
}

class DomainSelector {
  int dwidth; //width of domain in grid cells
  int dheight; //height of domain in grid cells

  int cell_size_px;
  int handle_size_px;
  
  int dcorner_x;
  int dcorner_y;
  
  float handle_x;
  float handle_y;
  
  int width_ratio;
  int height_ratio;
  
  boolean dragging;
  
  color domain_color;
  color light_domain_color;
  color lattice_color;
 
  boolean square;
 
  DomainSelector(int domain_a, int domain_b, int icell_size_px, int dcx, int dcy, int wr, int hr) {
    
    dwidth = domain_a;
    dheight = domain_b;
    
    cell_size_px = icell_size_px;
    handle_size_px = cell_size_px/4;
    
    dcorner_x = dcx;
    dcorner_y = dcy;
    
    handle_x = dcorner_x + cell_size_px * dwidth;
    handle_y = dcorner_y + cell_size_px * dheight;
    
    width_ratio = wr;
    height_ratio = hr;
    
    dragging = false;
    
    domain_color = #9C79FF;
    light_domain_color = #CBB9FF;
    lattice_color = #79CAFF;
    
    square = false;
  }
  
  void update() {
    if(dragging) {
      handle_x = mouseX;
      handle_y = mouseY;
      if(square)
        handle_y = handle_x;
      
      if(!mousePressed){
        dragging = false;
        snap_handle();
      }
    }
    if(!dragging){
      if(square)
        handle_y = handle_x;
      if(overHandle() && mousePressed){
        dragging = true; 
      }
    }
          
  }
  
  void snap_handle() {
   dwidth = round((handle_x - dcorner_x)/cell_size_px);
   dheight = round((handle_y - dcorner_y)/cell_size_px);
   
   dheight = max(dheight, 1);
   dwidth = max(dwidth, 1);
   
   handle_x = dcorner_x + cell_size_px * dwidth;
   handle_y = dcorner_y + cell_size_px * dheight;

  }
  
  boolean overHandle() {
    float x = mouseX - handle_x;
    float y = mouseY - handle_y;
    if(x*x + y*y < handle_size_px*handle_size_px)
      return true;
    else
      return false; 
  }
  
  void set_ratio(int wr, int hr){
    width_ratio = wr;
    height_ratio = hr;
  }
  
  void set_domain(int da, int db){
    dwidth = da;
    dheight = db;
  }
  
  void display() {
     pushMatrix();
     
     noFill();

     strokeWeight(2);
     stroke(lattice_color);
     rect(dcorner_x, dcorner_y, (handle_x - dcorner_x) * width_ratio, (handle_y - dcorner_y) * height_ratio);
     stroke(domain_color);
     rect(dcorner_x, dcorner_y, handle_x - dcorner_x, handle_y - dcorner_y);
     if(overHandle())
       fill(light_domain_color);
     else
       fill(domain_color);
     ellipse(handle_x, handle_y, 2*handle_size_px, 2*handle_size_px);
     popMatrix();
     
     strokeWeight(1);
  }
  
}