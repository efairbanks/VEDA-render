/*
   {
   "IMPORTED": {
   "image1": {
   "PATH": "./1.jpg",
   },
   },
   "vertexMode": "LINES",
   "pixelRatio": 4,
   "audio": true,
   "midi": true,
   }
 */

#ifndef VEDA_RENDER
precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;
uniform sampler2D backbuffer;
#endif

#define EPSILON 0.001
#define PI 3.1415

vec2 uv2p(vec2 uv) {return ((uv*resolution) * 2. - resolution) / min(resolution.x, resolution.y);}
vec2 p2uv(vec2 p) {return ((p*min(resolution.x, resolution.y))+resolution)/(2.*resolution);}

vec2 rot(vec2 p, vec2 around, float rad) {
  vec2 o = around;
  vec2 r = p-around;
  float angle = atan(r.y,r.x)+rad;
  float mag = length(r);
  return vec2(cos(angle),sin(angle))*mag+o;
}

vec3 opRep( vec3 p, vec3 c ) {
  vec3 q = mod(p,c)-0.5*c;
  return q;
}

float sdBox( vec3 p, vec3 b ) {
  vec3 d = abs(p) - b;
  return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}

float sdCross(vec3 p, float width) {
  float x = abs(p.x)-(width/3.);
  float y = abs(p.y)-(width/3.);
  float z = abs(p.z)-(width/3.);
  return max(sdBox(p,vec3(width)),min(min(max(x,z),max(x,y)),max(y,z)));
}

float sdSpongeUnit(vec3 p, float width) {
  return max(-sdCross(p,width*1.01),sdBox(p,vec3(width)));
}

float map(vec3 p) {
  //p.xz = opRep(p,vec3(3.)).xz;
  float size = 6.;
  float fi = 1.;

  for(int i=0; i < 10; i++) {
    p = abs(p);
    p.zx = rot(p.zx,vec2(0.),0.36);
    p.zy = rot(p.zy,vec2(0.),2.9);
  }

  vec3 temp = p;
  float d = sdSpongeUnit(p,6.);
  for(int i=0; i<5; i++) {
    temp = opRep(temp+vec3(size/fi), vec3(size*2./fi));
    d = max(-sdCross(temp,size*1.004/fi),d);
    fi *= 3.;
  }
  //temp.xz = rot(temp.xz,vec2(0.),3.1415/4.);
  return d+0.001;
}

vec3 gradient(vec3 p) {
  return normalize(vec3(
        map(vec3(p.x + EPSILON, p.y, p.z)) - map(vec3(p.x - EPSILON, p.y, p.z)),
        map(vec3(p.x, p.y + EPSILON, p.z)) - map(vec3(p.x, p.y - EPSILON, p.z)),
        map(vec3(p.x, p.y, p.z  + EPSILON)) - map(vec3(p.x, p.y, p.z - EPSILON))
        ));
}

#define TMIN 1.5
#define TMAX 100.

float trace(vec3 origin, vec3 ray) {
  float t = TMIN;
  for(int i=0;i<50;i++) {
    vec3 p = origin+(ray*t);
    float d = map(p);
    if(t>TMAX) return -1.;
    if(d<EPSILON) return t;
    t+=d*0.7;
  }
  return -1.;
}

float shadow(vec3 origin, vec3 ray) {
  float t = TMIN;
  for(int i=0;i<100;i++) {
    vec3 p = origin+(ray*t);
    float d = map(p);
    if(t>TMAX) return -1.;
    if(d<EPSILON) return t;
    t+=d*0.5;
  }
  return -1.;
}

float light(vec3 p, vec3 l) {
  float light = (max(0.,dot(gradient(p),normalize(l)))/pow(1.1,length(p-l)))+0.1;
  //if(shadow(p,normalize(l-p))>0.) light=0.;
  return light;
}

float lsource(vec3 origin, vec3 dest, vec3 light) {
  vec3 ray = normalize(dest-origin);
  float dist = distance(origin,dest);
  float t = 0.;
  float shade = 0.;
  for(int i=0;i<15;i++) {
    t+=(dist/15.);
    if(t>dist) break;
    if(trace(light,normalize((ray*t+origin)-light))<0.) shade += 30./pow(2.,distance(ray*dist+origin,light));
  }
  return shade;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 p = uv2p(uv)*1.;
  vec2 oldp = p;


#ifdef VEDA_RENDER
  vec3 origin = vec3(10.);
  origin.xz = rot(origin.xz,vec2(0.),time);
  origin.y = sin(time)*5.;
#else
  vec3 origin = vec3(0.);
  origin.y = (mouse.y-0.5)*(4.);
  origin.xz -= vec2(1.0);
  origin.xz = rot(origin.xz,vec2(0.),mouse.x*12.);
  origin = origin*(mouse.y+0.5);
  origin.xz *= mouse.y*10.;
#endif

  vec3 ray    = normalize(vec3(0.)-origin);
  vec3 right  = normalize(cross(ray,vec3(0.,1.,0.)));
  vec3 up     = normalize(cross(ray,right));
  ray += right*p.x + up*p.y;

  float t = trace(origin, ray);

  float lout = 0.;
  lout += light(ray*t+origin,vec3(1.))*1.;
  lout = pow(lout,1.2)*1.5;
  if(t<0.) lout = 0.;

  gl_FragColor = vec4(vec3(lout),1.0)/2.;
}

