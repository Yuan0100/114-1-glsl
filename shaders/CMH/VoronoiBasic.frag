// Author:CMH
// Title:20220321_glsl GlassDistortion_v2(normal).qtz

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_tex0;// ../../data/reference/MonaLisa.jpg
//uniform sampler2D u_tex1;

// Cellular noise ("Worley noise") in 2D in GLSL.
// Copyright (c) Stefan Gustavson 2011-04-19. All rights reserved.
// This code is released under the conditions of the MIT license.
// See LICENSE file for details.

// Permutation polynomial: (34x^2 + x) mod 289
vec3 permute(vec3 x){
  return mod((34.*x+1.)*x,289.);
}
#define K.142857142857// 1/7
#define Ko.428571428571// 3/7

vec2 cellularID(vec2 P){
  float jit=1.;
  float distFormula=0.;
  vec2 Pi=mod(floor(P),289.);
  vec2 Pf=fract(P);
  vec3 oi=vec3(-1.,0.,1.);
  vec3 of=vec3(-.5,.5,1.5);
  vec3 px=permute(Pi.x+oi);
  vec3 p=permute(px.x+Pi.y+oi);// p11, p12, p13
  vec3 ox=fract(p*K)-Ko;
  vec3 oy=mod(floor(p*K),7.)*K-Ko;
  vec3 dx=Pf.x+.5+jit*ox;
  vec3 dy=Pf.y-of+jit*oy;
  vec3 d1=mix(dx*dx+dy*dy,abs(dx)+abs(dy),distFormula);// d11, d12 and d13, squared, mixed with not squared
  p=permute(px.y+Pi.y+oi);// p21, p22, p23
  ox=fract(p*K)-Ko;
  oy=mod(floor(p*K),7.)*K-Ko;
  dx=Pf.x-.5+jit*ox;
  dy=Pf.y-of+jit*oy;
  vec3 d2=mix(dx*dx+dy*dy,abs(dx)+abs(dy),distFormula);// d21, d22 and d23, squared
  p=permute(px.z+Pi.y+oi);// p31, p32, p33
  ox=fract(p*K)-Ko;
  oy=mod(floor(p*K),7.)*K-Ko;
  dx=Pf.x-1.5+jit*ox;
  dy=Pf.y-of+jit*oy;
  vec3 d3=mix(dx*dx+dy*dy,abs(dx)+abs(dy),distFormula);// d31, d32 and d33, squared
  
  // Modified to look for ID of closest neighbor
  float f1=d1.x;
  vec2 ci=vec2(Pi.x-1.,Pi.y-1.);
  if(d1.y<f1){f1=d1.y;ci=vec2(Pi.x-1.,Pi.y);}
  if(d1.z<f1){f1=d1.z;ci=vec2(Pi.x-1.,Pi.y+1.);}
  if(d2.x<f1){f1=d2.x;ci=vec2(Pi.x,Pi.y-1.);}
  if(d2.y<f1){f1=d2.y;ci=vec2(Pi.x,Pi.y);}
  if(d2.z<f1){f1=d2.z;ci=vec2(Pi.x,Pi.y+1.);}
  if(d3.x<f1){f1=d3.x;ci=vec2(Pi.x+1.,Pi.y-1.);}
  if(d3.y<f1){f1=d3.y;ci=vec2(Pi.x+1.,Pi.y);}
  if(d3.z<f1){f1=d3.z;ci=vec2(Pi.x+1.,Pi.y+1.);}
  return mod(ci,289.);
}

float mouseEffect(vec2 uv,vec2 mouse,float size)
{
  float dist=length(uv-mouse);
  return 1.2-smoothstep(size*1.9,size,dist);//size
  //return pow(dist, 0.5);
}

void main(){
  vec2 st=gl_FragCoord.xy/u_resolution.xy;//screen coordinate
  vec2 mouse=u_mouse/u_resolution;//[0~1]
  float breathing=(exp(sin(u_time*2.*3.14159/5.))-.36787944)*.42545906412;
  float value=mouseEffect(st,mouse,.05*breathing+.1);
  
  float info=texture2D(u_tex0,st).g;
  
  // float sizeBrick=60.;//是否＝motionFreq
  vec3 color;
  // float size=10.0*sin(u_time*.2)*.5 +30.0;
  float size=40.;
  const int j=4;
  
  for(int i=0;i<j;i++){
    vec2 vo=cellularID(st*size)/size;
    color=mix(color,texture2D(u_tex0,vo).rgb,1.-float(i)/float(j-1));
    if(info<(float(i)+1.)/float(j))break;
    size*=2.;
  }
  
  gl_FragColor=vec4(vec3(color),1.);
}

