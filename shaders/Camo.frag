// ...existing code...
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
varying vec2 v_uv;

// Simple hash / value noise
float hash(vec2 p){
  return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);
}
float noise(vec2 p){
  vec2 i=floor(p);
  vec2 f=fract(p);
  vec2 u=f*f*(3.-2.*f);
  return mix(
    mix(hash(i+vec2(0.,0.)),hash(i+vec2(1.,0.)),u.x),
    mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),
    u.y
  );
}

// FBM with slight rotation to avoid axis artifacts
mat2 rot(float a){
  float c=cos(a),s=sin(a);
  return mat2(c,-s,s,c);
}
float fbm(vec2 p){
  float v=0.;
  float amp=.5;
  for(int i=0;i<5;i++){
    v+=amp*noise(p);
    p=rot(.5)*p*2.+vec2(1.7,9.2);
    amp*=.5;
  }
  return v;
}

// Palette mapping for camo
vec3 camoPalette(float t){
  // four camo colors: dark green, olive, tan, dark brown
  vec3 c0=vec3(.06,.22,.07);
  vec3 c1=vec3(.30,.36,.10);
  vec3 c2=vec3(.72,.64,.41);
  vec3 c3=vec3(.18,.10,.05);
  
  if(t<.25)return mix(c0,c1,smoothstep(0.,.25,t));
  else if(t<.5)return mix(c1,c2,smoothstep(.25,.5,t));
  else if(t<.8)return mix(c2,c3,smoothstep(.5,.8,t));
  return c3;
}

void main(){
  // uv: prefer v_uv if provided, otherwise use frag coord
  vec2 uv=(gl_FragCoord.xy/u_resolution.xy);
  #ifdef GL_ES
  // nothing
  #endif
  // center and correct aspect
  uv=uv*2.-1.;
  uv.x*=u_resolution.x/u_resolution.y;
  
  // layered noise for larger splotches plus detail
  float base=fbm(uv*1.2+u_time*.05);
  float spots=fbm(uv*6.-u_time*.1);
  float detail=fbm(uv*20.+u_time*.2);
  
  // combine and quantize into regions
  float pattern=mix(base,spots,.6)*.8+detail*.2;
  // push into a few hard regions to simulate camo blobs
  float region=floor(pattern*4.+0.)/3.;
  // add slight smoothness
  float t=smoothstep(0.,1.,region+detail*.05);
  
  vec3 color=camoPalette(t);
  
  gl_FragColor=vec4(color,1.);
}