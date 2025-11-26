// 20200220_glsl Genetic Face_v0.frag
// Title: Genetic Face
// Reference: https://www.shadertoy.com/view/XsGXWW

//#version 300 es
//#extension GL_OES_standard_derivatives : enable

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

#define iTime u_time
#define iResolution u_resolution
#define iMouse u_mouse
#define fragCoord gl_FragCoord.xy
uniform sampler2D u_tex0;//../../data/reference/CMH_oil_sad.png
uniform sampler2D u_tex1;//../../data/reference/CMH_oil_joy.png
uniform sampler2D u_buffer0;//FBO from previous iterated frame

vec3 rgb2hsl(vec3 c);
vec3 hsl2rgb(vec3 c);
float hueDiff(float h1,float h2);

//==================PASS A
#if defined(BUFFER_0)

#define MUTATION_RATE.1// 0.5% chance to accept a worse color
// #define SOURCE_COLORS
#define EVERY_PIXEL_SAME_COLOR
#define TRIANGLES

//Randomness code from Martin, here: https://www.shadertoy.com/view/XlfGDS
float Random_Final(vec2 uv,float seed)
{
  float fixedSeed=abs(seed)+1.;
  float x=dot(uv,vec2(12.9898,78.233)*fixedSeed);
  return fract(sin(x)*43758.5453);
}

//Test if a point is in a triangle
bool pointInTriangle(vec2 triPoint1,vec2 triPoint2,vec2 triPoint3,vec2 testPoint)
{
  float denominator=((triPoint2.y-triPoint3.y)*(triPoint1.x-triPoint3.x)+(triPoint3.x-triPoint2.x)*(triPoint1.y-triPoint3.y));
  float a=((triPoint2.y-triPoint3.y)*(testPoint.x-triPoint3.x)+(triPoint3.x-triPoint2.x)*(testPoint.y-triPoint3.y))/denominator;
  float b=((triPoint3.y-triPoint1.y)*(testPoint.x-triPoint3.x)+(triPoint1.x-triPoint3.x)*(testPoint.y-triPoint3.y))/denominator;
  float c=1.-a-b;
  
  return 0.<=a&&a<=1.&&0.<=b&&b<=1.&&0.<=c&&c<=1.;
}

// Test if a point is in a circle
bool pointInCircle(vec2 center,float radius,vec2 testPoint)
{
  return distance(testPoint,center)<radius;
}

// Test if a point is in an axis-aligned rectangle
bool pointInRect(vec2 pos,vec2 size,vec2 testPoint)
{
  return testPoint.x>pos.x&&testPoint.x<pos.x+size.x&&
  testPoint.y>pos.y&&testPoint.y<pos.y+size.y;
}

void main()
{
  vec2 imageUV=fragCoord.xy/iResolution.xy;
  vec2 testUV=imageUV;
  
  #ifdef EVERY_PIXEL_SAME_COLOR
  testUV=vec2(1.,1.);
  #endif
  
  int shapeType=int(mod(floor(Random_Final(testUV,iTime*.5)*3.),3.));
  
  bool isInShape=false;
  
  if(shapeType==0){// Triangle
    vec2 triPoint1=vec2(Random_Final(testUV,iTime),Random_Final(testUV,iTime*2.));
    vec2 triPoint2=vec2(Random_Final(testUV,iTime*3.),Random_Final(testUV,iTime*4.));
    vec2 triPoint3=vec2(Random_Final(testUV,iTime*5.),Random_Final(testUV,iTime*6.));
    isInShape=pointInTriangle(triPoint1,triPoint2,triPoint3,imageUV);
  }else if(shapeType==1){// Circle
    vec2 center=vec2(Random_Final(testUV,iTime),Random_Final(testUV,iTime*2.));
    float radius=Random_Final(testUV,iTime*3.)*.25;// Max radius 25% of screen
    isInShape=pointInCircle(center,radius,imageUV);
  }else{// Rectangle
    vec2 pos=vec2(Random_Final(testUV,iTime),Random_Final(testUV,iTime*2.));
    vec2 size=vec2(Random_Final(testUV,iTime*3.),Random_Final(testUV,iTime*4.))*.4;// Max size 40%
    isInShape=pointInRect(pos,size,imageUV);
  }
  
  // vec4 testColor=vec4(Random_Final(testUV,iTime*10.),
  // Random_Final(testUV,iTime*11.),
  // Random_Final(testUV,iTime*12.),1.);
  
  float randomAlpha=Random_Final(testUV,iTime*13.)*.5;
  vec4 testColor=vec4(Random_Final(testUV,iTime*10.),
  Random_Final(testUV,iTime*11.),
  Random_Final(testUV,iTime*12.),
randomAlpha);

// // --- New logic for generating testColor based on target hue ---
// // 1. Pick a random location from the target texture
// vec2 samplePos=vec2(Random_Final(testUV,iTime*7.),Random_Final(testUV,iTime*8.));

// // 2. Get the base color from that location and convert to HSL
// vec3 baseColorRGB=texture2D(u_tex0,samplePos).rgb;
// vec3 baseColorHSL=rgb2hsl(baseColorRGB);

// // 3. Generate a small random offset for the hue
// // Random_Final gives 0.0 to 1.0. We shift it to -0.5 to 0.5,
// // then scale it down to make the difference "slight". Let's use a range of -0.1 to 0.1.
// float hueOffset=(Random_Final(testUV,iTime*9.)-.5)*.2;

// // 4. Apply the offset to the hue and create the new HSL color
// vec3 newColorHSL=vec3(baseColorHSL.x+hueOffset,baseColorHSL.y,baseColorHSL.z);

// // 5. Convert back to RGB to get our final testColor
// vec4 testColor=vec4(hsl2rgb(newColorHSL),1.);
// // --- End of new logic ---

#ifdef SOURCE_COLORS
vec2 colorUV=vec2(Random_Final(testUV,iTime*10.),
Random_Final(testUV,iTime*11.));

testColor=texture(u_tex1,colorUV);
#endif

vec4 trueColor=texture2D(u_tex0,imageUV);
vec4 prevColor=texture2D(u_buffer0,imageUV);

gl_FragColor=prevColor;

// bool isInTriangle=true;

// #ifdef TRIANGLES
// isInTriangle=pointInTriangle(triPoint1,triPoint2,triPoint3,imageUV);
// #endif

if(isInShape)
{
  // 1. Calculate the blended color using the alpha blending formula
  vec3 blendedColor=testColor.rgb*testColor.a+prevColor.rgb*(1.-testColor.a);
  
  // 2. Compare the 'blended' color's distance to the true color vs. the 'previous' color's distance
  float prevDiff=length(trueColor.rgb-prevColor.rgb);
  float blendedDiff=length(trueColor.rgb-blendedColor);
  
  // --- MODIFICATION: Add random mutation logic ---
  // 3. Decide whether to adopt the new color
  if(blendedDiff<prevDiff)
  {
    // Always accept a better color
    gl_FragColor=vec4(blendedColor,1.);
  }
  else
  {
    // If the color is worse, accept it with a very small probability (random mutation)
    // We need a random number that is different for each pixel.
    float mutationChance=Random_Final(imageUV,iTime*15.);// Use imageUV to make it pixel-specific
    if(mutationChance<MUTATION_RATE)
    {
      gl_FragColor=vec4(blendedColor,1.);
    }
  }
}

// modified for forward and backward evolution
// if(isInTriangle)
// {
  //   float prevDiff=abs(length(trueColor-prevColor));
  //   float testDiff=abs(length(trueColor-testColor));
  //   float score=prevDiff-testDiff;
  //   // if(u_time<20.&&score<0.)gl_FragColor=testColor;//backwards evolution
  //   // else if(u_time>=20.&&score>0.)gl_FragColor=testColor;//forward evolution
  //   if(score>0.)gl_FragColor=testColor;//forward evolution
// }

}

//==================Main Pass
#else

void main()
{
vec2 uv=fragCoord/iResolution.xy;
gl_FragColor=texture2D(u_buffer0,uv);
}

#endif

// ================== Help Functions ================= //

vec3 rgb2hsl(vec3 c){
float maxC=max(c.r,max(c.g,c.b));
float minC=min(c.r,min(c.g,c.b));
float h=0.,s=0.,l=(maxC+minC)/2.;
if(maxC==minC){
  h=s=0.;
}else{
  float d=maxC-minC;
  s=l>.5?d/(2.-maxC-minC):d/(maxC+minC);
  if(maxC==c.r)h=(c.g-c.b)/d+(c.g<c.b?6.:0.);
  else if(maxC==c.g)h=(c.b-c.r)/d+2.;
  else if(maxC==c.b)h=(c.r-c.g)/d+4.;
  h/=6.;
}
return vec3(h,s,l);
}

float hue2rgb(float f1,float f2,float hue){
if(hue<0.)hue+=1.;
if(hue>1.)hue-=1.;
float res;
if((6.*hue)<1.)res=f1+(f2-f1)*6.*hue;
else if((2.*hue)<1.)res=f2;
else if((3.*hue)<2.)res=f1+(f2-f1)*((2./3.)-hue)*6.;
else res=f1;
return res;
}

vec3 hsl2rgb(vec3 c){
if(c.y==0.)return vec3(c.z);
float f2=c.z<.5?c.z*(1.+c.y):c.z+c.y-c.y*c.z;
float f1=2.*c.z-f2;
return vec3(
  hue2rgb(f1,f2,c.x+1./3.),
  hue2rgb(f1,f2,c.x),
  hue2rgb(f1,f2,c.x-1./3.)
);
}

// 處理色相環形距離的函數
float hueDiff(float h1,float h2){
float d=h2-h1;
if(d>.5)d-=1.;
if(d<-.5)d+=1.;
return d;
}

//