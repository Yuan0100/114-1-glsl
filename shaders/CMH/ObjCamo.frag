//#extension GL_OES_standard_derivatives : enable

#ifdef GL_ES
precision mediump float;
#endif

varying vec4 v_position;
varying vec4 v_normal;
varying vec2 v_texcoord;
varying vec4 v_color;

uniform mat4 u_projectionMatrix;
uniform mat4 u_modelViewMatrix;
uniform mat4 u_normalMatrix;
uniform vec2 u_resolution;
uniform float u_time;

#if defined(VERTEX)

attribute vec4 a_position;// data/Snowastronaut.obj
//attribute vec4 a_position;
attribute vec4 a_normal;
attribute vec2 a_texcoord;
attribute vec4 a_color;

void main(void){
  v_position=u_projectionMatrix*u_modelViewMatrix*a_position;
  v_normal=u_normalMatrix*a_normal;
  v_texcoord=a_texcoord;
  v_color=a_color;
  gl_Position=v_position;
}

#else// fragment shader

uniform vec2 u_mouse;
uniform vec2 u_pos;
vec3 camo(vec2 uv);
vec3 camo_triplanar(in vec3 p,in vec3 n);//camo triplanar function

void main(){
  vec2 p=v_texcoord;
  vec3 normal=normalize(v_normal.xyz);
  vec3 rdir=normalize(-v_position.xyz);// view direction
  float VdotN=dot(normal,-rdir);
  //VdotN = step(0.8, VdotN); //clamp to 0..1
  
  // --- Cel shading for baseColor ---
  vec3 lightDir=normalize(vec3(.5,1.,.9));// directional light
  float NdotL=dot(normal,lightDir);
  
  // Quantize lighting into discrete bands (cel shading)
  float celShade;
  if(NdotL>.9)celShade=1.2;
  else if(NdotL>.6)celShade=.8;
  else if(NdotL>.1)celShade=.3;
  else celShade=.1;
  
  vec3 camocolor=camo_triplanar(v_position.xyz,normal);//camo pattern
  //vec3 baseColor = vec3(0.9216, 0.1098, 0.1098) * celShade;
  vec3 baseColor=camocolor*celShade;
  
  // Add rim light for cel effect
  float rimLight=1.-max(0.,dot(normal,-rdir));
  rimLight=smoothstep(.6,1.,rimLight);
  baseColor+=vec3(.2,.2,.25)*rimLight*.3;
  
  gl_FragColor=vec4(vec3(baseColor),1.);
}

#endif

//camo pattern
float u_scale=5.5;// base scale (suggest 2.0..8.0)
int u_octaves=4;// fbm octaves (1..8)
float u_persistence=.4;// fbm persistence (0.3..0.8)
float u_lacunarity=1.8;// fbm lacunarity (1.8..2.5)
float u_contrast=.7;// global contrast (0.5..2.0)
int u_levels=4;// number of color blobs (2..6)
float u_edgeSoft=.1;// softness of blob edges (0.01..0.15)
float u_seed=.312;// random seed/animation offset
vec2 u_offset=vec2(0.);// optional sample offset
float u_gamma=1.;// final gamma correction (0.8..1.2)

//
// Improved camo shader: multi-scale fbm + better soft quantization,
// subtle color variation, local contrast and film grain for visual quality.
//

// --- hash / grad ---
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
vec2 grad2(vec2 p){float a=hash21(p)*6.28318530718;return vec2(cos(a),sin(a));}
vec2 fade2(vec2 t){return t*t*t*(t*(t*6.-15.)+10.);}

// classic perlin noise
float perlin(vec2 p){
  vec2 i=floor(p),f=fract(p);
  vec2 g00=grad2(i+vec2(0.,0.)),g10=grad2(i+vec2(1.,0.));
  vec2 g01=grad2(i+vec2(0.,1.)),g11=grad2(i+vec2(1.,1.));
  vec2 d00=f-vec2(0.,0.),d10=f-vec2(1.,0.);
  vec2 d01=f-vec2(0.,1.),d11=f-vec2(1.,1.);
  float n00=dot(g00,d00),n10=dot(g10,d10),n01=dot(g01,d01),n11=dot(g11,d11);
  vec2 u=fade2(f);
  float nx0=mix(n00,n10,u.x),nx1=mix(n01,n11,u.x);
  return mix(nx0,nx1,u.y);
}

// robust fbm with amplitude normalization
float fbm(vec2 p){
  int oct=8;//int(u_octaves); //clamp(u_octaves, 1, 8);
  float pers=(u_persistence<=0.)?.5:u_persistence;
  float lac=(u_lacunarity<=0.)?2.:u_lacunarity;
  float amp=1.;
  float freq=1.;
  float sum=0.;
  float maxA=0.;
  for(int i=0;i<8;i++){
    if(i>=oct)break;
    sum+=amp*perlin(p*freq);
    maxA+=amp;
    amp*=pers;
    freq*=lac;
  }
  return sum/maxA;
}

// turbulence (abs)
float turb(vec2 p){
  int oct=6;//int(u_octaves); //;clamp(u_octaves,1,8);
  float pers=(u_persistence<=0.)?.5:u_persistence;
  float lac=(u_lacunarity<=0.)?2.:u_lacunarity;
  float amp=1.;float freq=1.;
  float sum=0.;float maxA=0.;
  for(int i=0;i<8;i++){
    if(i>=oct)break;
    sum+=amp*abs(perlin(p*freq));
    maxA+=amp;
    amp*=pers;
    freq*=lac;
  }
  return sum/maxA;
}

// palettes: woodland with subtle variation per position
vec3 camoPalette(float t,float variation){
  // base colors
  vec3 c0=vec3(.04,.06,.03);
  vec3 c1=vec3(.12,.20,.07);
  vec3 c2=vec3(.34,.45,.18);
  vec3 c3=vec3(.52,.40,.22);
  // slightly perturb hues using variation
  c1+=variation*.03;
  c2+=variation*.02;
  c3+=variation*.015;
  if(t<.25)return mix(c0,c1,smoothstep(0.,.25,t));
  if(t<.5)return mix(c1,c2,smoothstep(.25,.5,t));
  if(t<.75)return mix(c2,c3,smoothstep(.5,.75,t));
  return mix(c3,c0,smoothstep(.75,1.,t));
}

// small helper for contrast curve (S-curve)
float contrastCurve(float x,float c){
  // c = 1 -> identity, c>1 increases contrast
  float k=pow(.5,c);
  return(x-k)/(1.-2.*k);
}

vec3 camo(vec2 uv){
  // safe defaults
  float scale=(u_scale<=0.)?4.:u_scale;
  int levelsInt=5;//int(u_levels); //max(2, u_levels);
  float edgeSoft=max(.001,u_edgeSoft);
  float seed=u_seed;
  float gamma=(u_gamma<=0.)?1.:u_gamma;
  float contrast=(u_contrast<=0.)?1.:u_contrast;
  
  //vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 aspect=vec2(u_resolution.x/u_resolution.y,1.);
  // scaling and optional offset
  vec2 p=(uv-.5)*aspect*scale+u_offset;
  
  // add slow organic motion via seed/time
  p+=vec2(seed*10.,seed*-7.)+vec2(u_time*.01,-u_time*.006);
  
  // multi-scale composition with improved weights
  float b1=fbm(p*.9);
  float b2=fbm(p*2.8+vec2(5.2,3.7))*.6;
  float b3=turb(p*6.5+vec2(12.1,9.4))*.28;
  float mask=b1*.5+b2*.35+b3*.15;
  // normalize and apply gentle contrast
  mask=clamp(mask*.5+.5,0.,1.);
  mask=clamp(contrastCurve(mask,clamp(contrast,.6,1.8)),0.,1.);
  
  // quantize into soft levels
  float levels=float(levelsInt);
  float q=clamp(mask,0.,.9999);
  float scaled=q*levels;
  float idx=floor(scaled);
  float frac=fract(scaled);
  
  // soften edges using screen-space local noise and edgeSoft adjusted by levels
  float localVar=fbm(p*12.+vec2(seed*2.3))*.5;
  float soft=smoothstep(0.,edgeSoft*1.5,frac+(localVar-.25)*.5)*
  (1.-smoothstep(1.-edgeSoft*1.5,1.,frac+(localVar-.25)*.5));
  
  float t=(idx+soft)/max(1.,levels-1.);//check
  t=clamp(t,0.,1.);
  
  // color variation per-patch
  float variation=fbm(p*4.+vec2(9.1,4.7));
  
  vec3 color=camoPalette(t,variation);
  //gl_FragColor = vec4(camoPalette(t, variation), 1.0); //for debug
  
  // add subtle micro-grain for texture and to break banding
  float grain=fbm((uv*u_resolution.xy)*.5+vec2(seed*3.1))*.035;
  color+=grain;
  
  // slight local contrast boost using unsharp-ish technique (approx)
  float detail=turb(p*20.)*.25;
  color=mix(color,color+detail*.08,.5);
  
  // final color adjustments: desaturate slightly and gamma
  float lum=dot(color,vec3(.299,.587,.114));
  color=mix(color,vec3(lum),.06);// slight desat
  color=pow(clamp(color,0.,1.),vec3(gamma));
  
  // subtle vignetting to focus center (optional, mild)
  float d=distance(uv,vec2(.5));
  color*=smoothstep(.9,.35,d)*.12+.88;
  
  return color;
}

vec3 camo_triplanar(in vec3 p,in vec3 n)
{
  vec3 x=camo(p.yz);
  vec3 y=camo(p.zx);
  vec3 z=camo(p.xy);
  n*=n;
  return x*abs(n.x)+y*abs(n.y)+z*abs(n.z);
}

