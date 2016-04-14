/**
 * Cox
 * 
 * App for generating tilings from symmetry group.
 */

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

//locations
int grid_center_x, grid_center_y;
int grid_corner_x, grid_corner_y;

int gridline_shade;

Cell[][] cells;

void setup() {
   print(testy(4));
   SYMGROUPS = new String[]{"o", 
               "2222", "22x", "22*", "2*22","*2222",
               "442", "4*2", "*442",
               "xx", "x*", "**",
               "333", "3*3", "*333",
               "632", "*632"};
   size(1000, 1000);

   grid_center_x = width/2;
   grid_center_y = height/2;
   grid_width_px = min(width, height) - 20;

   grid_corner_x = grid_center_x - grid_width_px/2;
   grid_corner_y = grid_center_y - grid_width_px/2;
   
   grid_width = 50;
   
   cell_size_px = grid_width_px/grid_width;
   
   gridline_shade = 200;
   
   
   domain_a = 6;
   domain_a1 = 0;
   domain_b = 6;
   
   lattice_a = domain_a;
   lattice_a1 = domain_a1;
   lattice_b = domain_b;

   cells = new Cell[grid_width][grid_width];

   init_cells();

   compute_eq_classes();
}

void draw(){
  background(255);
  drawCells();
}

void mousePressed(){
  if (overGrid(mouseX, mouseY)){
    int cell_a = (mouseX - grid_corner_x)/cell_size_px;
    int cell_b = (mouseY - grid_corner_y)/cell_size_px;
    int eq_class = cells[cell_a][cell_b].eq_class;
    if(mouseButton == LEFT)
      fadeClass(eq_class);
    if(mouseButton == RIGHT)
      pulseClass(eq_class);
}
}

boolean overGrid(int x, int y){
 if (x > grid_corner_x && x < grid_corner_x + grid_width_px){
   if (y > grid_corner_y && y < grid_corner_y + grid_width_px){
     return true;
   }
 }
 
 return false;

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

void compute_eq_classes(){
    n_classes = domain_a * domain_b;
    for(int i = 0; i < grid_width; i++){
     for(int j = 0; j < grid_width; j++){
      int[] lattice_rep = mod_lattice(i,j);
      int eq_class = cell_to_int(lattice_rep[0], lattice_rep[1], domain_b);
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
    lattice_a = 2*domain_a;
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
   print("invalid symmetry group");
  }
}

int[] lattice_to_domain(int a, int b){
  int A = domain_a;
  int B = domain_b;
  
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
      b = (b + B) % 2*B;
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
      int b_new = a;
      int a_new = 2*A - b;
      a = a_new;
      b = b_new;
    }
  }
  else if(symmetry_group == "4*2"){
    while(a > A || b > A){
      int b_new = a;
      int a_new = 2*A - b;
      a = a_new;
      b = b_new;
    }
    if (a + b > A){
      int b_new = A - a;
      int a_new = A - b;
      a = a_new;
      b = b_new;
    }
  }
  else if(symmetry_group == "*442"){
    while(a > A || b > A){
      int b_new = a;
      int a_new = 2*A - b;
      a = a_new;
      b = b_new;
    }
    if (b > a){
      int b_new = a;
      int a_new = b;
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
      b = (b + B/2) % b;
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
   print("invalid symmetry group");
  }
  
  int[] coords = {a, b};
  
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