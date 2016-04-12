/**
 * Cox
 * 
 * App for generating tilings from symmetry group.
 */

String symmetry_group;

int domain_a0, domain_b0, domain_a1, domain_b1;
int lattice_a0, lattice_b0, lattice_a1, lattice_b1;
int[][] cell_state;
int[][] cell_eq_class;

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

void setup() {
   size(1000, 1000);

   grid_center_x = width/2;
   grid_center_y = height/2;
   grid_width_px = min(width, height) - 20;

   grid_corner_x = grid_center_x - grid_width_px/2;
   grid_corner_y = grid_center_y - grid_width_px/2;
   
   grid_width = 50;
   
   cell_size_px = grid_width_px/grid_width;
   
   gridline_shade = 200;
   
   lattice_a0 = 5;
   lattice_b0 = 0;
   lattice_a1 = 0;
   lattice_b1 = 5;
   
   domain_a0 = lattice_a0;
   domain_a1 = lattice_a0;
   domain_b0 = lattice_a0;
   domain_b1 = lattice_b1;
   
   cell_state = new int[grid_width][grid_width];
    
   cell_eq_class = new int[grid_width][grid_width];
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
    int eq_class = cell_eq_class[cell_a][cell_b];
    toggleClass(eq_class);
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
  
  for(int i = 0; i < grid_width; i++){
   for(int j = 0; j < grid_width; j++){
     if (cell_eq_class[i][j] == eq_class){
       toggleCell(i,j);   
     }
    }
  }
}

void toggleClass(int eq_class){
  for(int i = 0; i < grid_width; i++){
   for(int j = 0; j < grid_width; j++){
     if (cell_eq_class[i][j] == eq_class){
       toggleCell(i,j);   
     }
    }
  }
}

void toggleCell(int a,int b){
  cell_state[a][b] = 1 - cell_state[a][b];
  draw_cell(a, b, cell_state[a][b]);
}

void compute_eq_classes(){
    n_classes = domain_a0 * domain_b1;
    
    for(int i = 0; i < grid_width; i++){
     for(int j = 0; j < grid_width; j++){
      int[] lattice_rep = mod_lattice(i,j);
      int eq_class = cell_to_int(lattice_rep[0], lattice_rep[1], domain_b1);
      cell_eq_class[i][j] = eq_class;   
     }
    }
}

int[] mod_lattice(int a, int b){
  assert (lattice_b0 == 0);
  int b_remainder = b % lattice_b1;
  int a_remainder = (a - lattice_a1*(b - b_remainder)/lattice_b1) % lattice_a0;
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
      draw_cell(i, j, cell_state[i][j]);
    }
  }
}

//values of state between zero and one will be interpolated
//cells are indexed from upper left corner
void draw_cell(int cell_a, int cell_b, float state){
  int cell_x = grid_corner_x + cell_size_px * cell_a;
  int cell_y = grid_corner_y + cell_size_px * cell_b;
  
  if (state == 1){
    stroke(0);
    fill(0);
  }
  else if (state == 0){
    stroke(gridline_shade);
    fill(255);
  }
  else {
    stroke(gridline_shade*(1 - state));
    fill(255*(1-state));
  }
  
  rect(cell_x, cell_y, cell_size_px, cell_size_px); 
}