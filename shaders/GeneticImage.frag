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
uniform sampler2D u_tex0;//../../data/wave_wave.jpg
uniform sampler2D u_buffer0;//FBO from previous iterated frame

vec3 rgb2hsl(vec3 c);
vec3 hsl2rgb(vec3 c);
float hueDiff(float h1,float h2);

float Random_Final(vec2 uv,float seed);
bool pointInTriangle(vec2 triPoint1,vec2 triPoint2,vec2 triPoint3,vec2 testPoint);
bool pointInCircle(vec2 center,float radius,vec2 testPoint);
bool pointInRect(vec2 pos,vec2 size,vec2 testPoint);
bool pointInEllipse(vec2 center,vec2 radii,vec2 testPoint);

//==================PASS A
#if defined(BUFFER_0)

// --- CONTROL SWITCHES ---
#define RENDER_DOTS
#define USE_PALETTE
// --- Shape Generation Switches ---
#define GENERATE_TRIANGLES
#define GENERATE_CIRCLES
// #define GENERATE_RECTANGLES
// #define GENERATE_ELLIPSES
// ---
// #define EVOLVE_FROM_GRADIENT
#define MIN_CIRCLE_RADIUS.01// 最小半徑 (螢幕寬度的 1%)
#define MAX_CIRCLE_RADIUS.1// 最大半徑 (螢幕寬度的 10%)

#define MUTATION_RATE.01// 0.5% chance to accept a worse color
#define EVERY_PIXEL_SAME_COLOR
#define FADE_IN_SPEED.8// Speed of fade-in effect (lower is slower)

// ================== MAIN

void main()
{
  vec2 imageUV=fragCoord.xy/iResolution.xy;
  
  // // --- Input Image Aspect Ratio Correction Snippet ---
  vec2 st=fragCoord.xy/iResolution.xy;
  vec2 uv=st;
  
  float currentAspect=iResolution.x/iResolution.y;
  float targetAspect=16./9.;
  
  if(currentAspect>targetAspect){
    // 螢幕太寬，裁切左右兩側
    float scale=currentAspect/targetAspect;
    uv.x=(uv.x-.5)*scale+.5;
  }else{
    // 螢幕太窄，裁切上下兩側
    float scale=targetAspect/currentAspect;
    uv.y=(uv.y-.5)*scale+.5;
  }
  
  float mask=step(0.,uv.x)*step(uv.x,1.)*
  step(0.,uv.y)*step(uv.y,1.);
  
  // 如果計算後的 uv 在 [0,1] 範圍外，就畫黑色
  // if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    //   gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    //   return;
  // }
  
  // vec2 imageUV=uv;
  // // ---------------------------------
  
  #ifdef EVOLVE_FROM_GRADIENT
  if(iTime<.1){// A small threshold to detect the first frame
    // --- Image as Initialization ---
    // gl_FragColor=texture2D(u_tex0,imageUV);// Initialize with source image
    
    // Gradient as initialization ---
    vec3 colorTop=vec3(250./255.,220./255.,226./255.);// Pink (#FADCE2)
    vec3 colorBottom=vec3(174./255.,203./255.,237./255.);// Blue (#AECBED)
    
    // Mix colors based on the vertical position (imageUV.y)
    vec3 gradient=mix(colorBottom,colorTop,imageUV.y);
    
    gl_FragColor=vec4(gradient,1.)*mask;
    
    return;// Stop further processing for the first frame
  }
  #endif
  
  vec2 testUV=imageUV*mask;
  
  #ifdef EVERY_PIXEL_SAME_COLOR
  testUV=vec2(1.,1.);
  #endif
  
  /// --- STEP 1: Generate the "Challenger" Shape (used as a mask) ---
  bool isInShape=false;
  
  // Count how many shape types are enabled
  int shapeTypeCount=0;
  #ifdef GENERATE_TRIANGLES
  shapeTypeCount++;
  #endif
  #ifdef GENERATE_CIRCLES
  shapeTypeCount++;
  #endif
  #ifdef GENERATE_RECTANGLES
  shapeTypeCount++;
  #endif
  #ifdef GENERATE_ELLIPSES
  shapeTypeCount++;
  #endif
  
  if(shapeTypeCount>0){
    // Pick a random shape from the enabled types
    int shapeChoice=int(mod(floor(Random_Final(testUV,iTime*.5)*float(shapeTypeCount)),float(shapeTypeCount)));
    int currentIndex=0;
    
    #ifdef GENERATE_TRIANGLES
    if(shapeChoice==currentIndex){
      vec2 triPoint1=vec2(Random_Final(testUV,iTime*1.),Random_Final(testUV,iTime*2.));
      vec2 triPoint2=vec2(Random_Final(testUV,iTime*3.),Random_Final(testUV,iTime*4.));
      vec2 triPoint3=vec2(Random_Final(testUV,iTime*5.),Random_Final(testUV,iTime*6.));
      isInShape=pointInTriangle(triPoint1,triPoint2,triPoint3,imageUV);
    }
    currentIndex++;
    #endif
    
    #ifdef GENERATE_CIRCLES
    if(shapeChoice==currentIndex){
      vec2 center=vec2(Random_Final(testUV,iTime*1.),Random_Final(testUV,iTime*2.));
      float r=Random_Final(testUV,iTime*3.);
      float radius=MIN_CIRCLE_RADIUS+r*(MAX_CIRCLE_RADIUS-MIN_CIRCLE_RADIUS);
      isInShape=pointInCircle(center,radius,imageUV);
    }
    currentIndex++;
    #endif
    
    #ifdef GENERATE_RECTANGLES
    if(shapeChoice==currentIndex){
      vec2 pos=vec2(Random_Final(testUV,iTime*1.),Random_Final(testUV,iTime*2.));
      vec2 size=vec2(Random_Final(testUV,iTime*3.),Random_Final(testUV,iTime*4.))*.4;
      isInShape=pointInRect(pos,size,imageUV);
    }
    currentIndex++;
    #endif
    
    #ifdef GENERATE_ELLIPSES
    if(shapeChoice==currentIndex){
      vec2 center=vec2(Random_Final(testUV,iTime*1.),Random_Final(testUV,iTime*2.));
      vec2 radii=vec2(Random_Final(testUV,iTime*3.),Random_Final(testUV,iTime*4.))*.3;
      isInShape=pointInEllipse(center,radii,imageUV);
    }
    currentIndex++;
    #endif
  }
  
  // --- STEP 2: Generate the "Challenger" Color ---
  vec4 testColor;
  
  #ifdef USE_PALETTE
  // --- Generate a color from the palette with added noise ---
  // This guarantees the color is always in a usable range.
  vec3 colorPink=vec3(250./255.,220./255.,226./255.);// #FADCE2
  vec3 colorBlue=vec3(174./255.,203./255.,237./255.);// #AECBED
  
  // Randomly choose between pink and blue as the base
  vec3 baseColor;
  if(Random_Final(testUV,iTime*9.)>.5){
    baseColor=colorPink;
  }else{
    baseColor=colorBlue;
  }
  
  // Add a small amount of noise for variation
  float noiseAmount=.2;// You can adjust this for more/less color variety
  vec3 noise=vec3(Random_Final(testUV,iTime*10.),
  Random_Final(testUV,iTime*11.),
  Random_Final(testUV,iTime*12.))*noiseAmount-(noiseAmount/2.);
  
  vec3 finalTestColor=clamp(baseColor+noise,0.,1.);
  testColor=vec4(finalTestColor,1.);
  
  #else
  // --- Generate a completely random color ---
  testColor=vec4(Random_Final(testUV,iTime*10.),
  Random_Final(testUV,iTime*11.),
  Random_Final(testUV,iTime*12.),
1.);
#endif

// --- STEP 3: Evolution and Rendering Logic ---
vec4 prevColor=texture2D(u_buffer0,imageUV);
gl_FragColor=prevColor;

#ifdef RENDER_DOTS
// --- Dot Grid Rendering Logic ---
float gridSize=300.;
vec2 cellCenterUV=(floor(imageUV*gridSize)+.5)/gridSize;
vec3 targetColorAtCell=texture2D(u_tex0,cellCenterUV).rgb;
float brightness=rgb2hsl(targetColorAtCell).z;
float adjustedBrightness=pow(brightness,1.2);
float minRadius=1.;
float maxRadius=10.;
float dynamicRadius=minRadius+adjustedBrightness*(maxRadius-minRadius);
vec2 gridUV=fract(imageUV*gridSize);
float distToCellCenter=distance(gridUV,vec2(.5));
float feather=.5;
float dotFactor=1.-smoothstep(dynamicRadius-feather,dynamicRadius+feather,distToCellCenter);

vec4 trueColor=vec4(targetColorAtCell,1.);

if(dotFactor>0.&&isInShape)
{
  float prevDiff=length(trueColor.rgb-prevColor.rgb);
  float testDiff=length(trueColor.rgb-testColor.rgb);
  if(testDiff<prevDiff)
  {
    vec3 finalColor=mix(prevColor.rgb,testColor.rgb,dotFactor);
    gl_FragColor=mix(gl_FragColor,vec4(finalColor,1.),FADE_IN_SPEED)*mask;
    // gl_FragColor=vec4(finalColor,1.);
  }
  else
  {
    float mutationChance=Random_Final(imageUV,iTime*15.);
    if(mutationChance<MUTATION_RATE)
    {
      vec3 finalColor=mix(prevColor.rgb,testColor.rgb,dotFactor);
      gl_FragColor=mix(gl_FragColor,vec4(finalColor,1.),FADE_IN_SPEED)*mask;
      // gl_FragColor=vec4(finalColor,1.);
    }
  }
}
#else
// --- Original Shape Rendering Logic ---
vec4 trueColor=texture2D(u_tex0,imageUV);
if(isInShape)
{
  // --- Increase contrast of the target color ---
  // 1. Convert the true color to HSL to get its lightness.
  vec3 trueColorHSL=rgb2hsl(trueColor.rgb);
  float lightness=trueColorHSL.z;
  
  // 2. Apply a contrast curve. pow() is great for this.
  //    An exponent > 1.0 pushes mid-tones towards black.
  float contrastExponent=2.;// You can increase this for even more contrast.
  float contrastedLightness=pow(lightness,contrastExponent);
  
  // 3. Create the new high-contrast target color.
  vec3 contrastedTrueColorRGB=hsl2rgb(vec3(trueColorHSL.x,trueColorHSL.y,contrastedLightness));
  vec4 contrastedTrueColor=vec4(contrastedTrueColorRGB,1.);
  // --- END MODIFICATION ---
  
  float prevDiff=length(trueColor.rgb-prevColor.rgb);
  float testDiff=length(trueColor.rgb-testColor.rgb);
  if(testDiff<prevDiff)
  {
    gl_FragColor=mix(gl_FragColor,testColor,FADE_IN_SPEED)*mask;
    // gl_FragColor=testColor;// Direct replacement, no mix
  }
  else
  {
    float mutationChance=Random_Final(imageUV,iTime*15.);
    if(mutationChance<MUTATION_RATE)
    {
      gl_FragColor=mix(gl_FragColor,testColor,FADE_IN_SPEED)*mask;
      // gl_FragColor=testColor;// Direct replacement
    }
  }
}
#endif
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

// Test if a point is in an ellipse
bool pointInEllipse(vec2 center,vec2 radii,vec2 testPoint)
{
if(radii.x<=0.||radii.y<=0.)return false;
vec2 p=(testPoint-center)/radii;
return dot(p,p)<1.;
}

// ================= Color Conversion Functions ================= //

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

// ---