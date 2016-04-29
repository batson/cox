class Cell
{
 int a;
 int b;

 int x;
 int y;
 int size;
 
 int full_stroke;
 int full_fill;
 int empty_stroke;
 int empty_fill;
 
 float fade_start;
 float pulse_start;
 
 float fade_duration;
 float pulse_period;
 
 int state;
 boolean pulsing;
 boolean fading;
 
 int eq_class;
 
 Cell(){
   full_stroke = 0;
   full_fill = 0;
   empty_stroke = 200;
   empty_fill = 255;
   
   fade_duration = 100.0;
   pulse_period = 2000.0;
   eq_class = 0;

   a = 0;
   b = 0;
   x = 0;
   y = 0;
   size = 0;
 }
 
 void set_positions(int ia,int ib,int ix,int iy){
  a = ia;
  b = ib;
  x = ix;
  y = iy;
 }
 
 void set_size(int isize){
  size = isize; 
 }
 
 void start_fade(){
  fade_start = millis();
  fading = true;
  pulsing = false;
 }
 
 void start_pulse(){
  pulse_start = millis();
  fading = false;
  pulsing = true;
 }
 
 void stop_pulse(){
  pulsing = false; 
 }
 
 void toggle_pulse(){
  if(pulsing)
    stop_pulse();
  else
    start_pulse();
 }
 
 void toggle(){
  state = 1 - state; 
 }
 
 void set_state(int st){
  state = st; 
 }
 
 void display(){
   int t = millis();
   if(fading && t - fade_start > fade_duration){
     fading = false;
   }
   
   float lambda = state;
   if(fading){
    lambda = (t - fade_start)/fade_duration; 
    if(state == 0){
      lambda = 1 - lambda;
    }
   }
   else if(pulsing){
    lambda = sin( (t - pulse_start) / pulse_period * TWO_PI);
    if(state == 1){
      lambda = 1 - lambda;
    }
    lambda = 0.3;
   }
   
   fill(map(lambda, 0, 1, empty_fill, full_fill));
   stroke(map(lambda, 0 , 1, empty_stroke, full_stroke));

   rect(x, y, size, size); 
 }

}