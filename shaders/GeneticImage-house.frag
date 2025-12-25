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

// 新增 grid size uniform
uniform float u_grid_size;

#define iTime u_time
#define iResolution u_resolution
#define iMouse u_mouse
#define fragCoord gl_FragCoord.xy
uniform sampler2D u_tex0;//../data/house/Xizhi.jpeg
uniform sampler2D u_buffer0;//FBO from previous iterated frame

vec3 rgb2hsl(vec3 c);
vec3 hsl2rgb(vec3 c);
float hueDiff(float h1,float h2);
float hue2rgb(float f1,float f2,float hue);

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
#define EVOLVE_FROM_GRADIENT
#define MIN_CIRCLE_RADIUS.01
#define MAX_CIRCLE_RADIUS.1

#define MUTATION_RATE.05
#define EVERY_PIXEL_SAME_COLOR
#define FADE_IN_SPEED.8

// ================== MAIN

void main()
{
  vec2 imageUV=fragCoord.xy/iResolution.xy;
  
  // --- 座標系統修正 (配合提供的程式碼) ---
  float aspect=iResolution.x/iResolution.y;
  vec2 correctedUV=(imageUV-.5)*vec2(aspect,1.);
  
  #ifdef EVOLVE_FROM_GRADIENT
  if(iTime<.1){
    // Gradient as initialization ---
    vec3 colorTop=vec3(250./255.,220./255.,226./255.);
    vec3 colorBottom=vec3(174./255.,203./255.,237./255.);
    
    vec3 gradient=mix(colorBottom,colorTop,imageUV.y);
    
    gl_FragColor=vec4(gradient,1.);
    return;
  }
  #endif
  
  vec2 testUV=imageUV;
  #ifdef EVERY_PIXEL_SAME_COLOR
  testUV=vec2(1.,1.);
  #endif
  
  /// --- STEP 1: Generate the "Challenger" Shape ---
  // 注意：這裡保留 GPU 生成邏輯，但適配到 correctedUV 座標系 (-0.5 ~ 0.5)
  bool isInShape=false;
  
  int shapeTypeCount=0;
  #ifdef GENERATE_TRIANGLES
  shapeTypeCount++;
  #endif
  #ifdef GENERATE_CIRCLES
  shapeTypeCount++;
  #endif
  
  if(shapeTypeCount>0){
    int shapeChoice=int(mod(floor(Random_Final(testUV,iTime*.5)*float(shapeTypeCount)),float(shapeTypeCount)));
    int currentIndex=0;
    
    #ifdef GENERATE_TRIANGLES
    if(shapeChoice==currentIndex){
      // 生成範圍調整為 -0.5 ~ 0.5 附近，並考慮 aspect
      vec2 triPoint1=vec2(Random_Final(testUV,iTime*1.)-.5,Random_Final(testUV,iTime*2.)-.5);
      vec2 triPoint2=vec2(Random_Final(testUV,iTime*3.)-.5,Random_Final(testUV,iTime*4.)-.5);
      vec2 triPoint3=vec2(Random_Final(testUV,iTime*5.)-.5,Random_Final(testUV,iTime*6.)-.5);
      
      triPoint1.x*=aspect;
      triPoint2.x*=aspect;
      triPoint3.x*=aspect;
      
      // 稍微放大範圍以覆蓋全螢幕
      triPoint1*=1.5;
      triPoint2*=1.5;
      triPoint3*=1.5;
      
      isInShape=pointInTriangle(triPoint1,triPoint2,triPoint3,correctedUV);
    }
    currentIndex++;
    #endif
    
    #ifdef GENERATE_CIRCLES
    if(shapeChoice==currentIndex){
      vec2 center=vec2(Random_Final(testUV,iTime*1.)-.5,Random_Final(testUV,iTime*2.)-.5);
      float r=Random_Final(testUV,iTime*3.);
      float radius=MIN_CIRCLE_RADIUS+r*(MAX_CIRCLE_RADIUS-MIN_CIRCLE_RADIUS);
      
      center.x*=aspect;
      center*=1.5;// 擴大分佈範圍
      
      isInShape=pointInCircle(center,radius,correctedUV);
    }
    currentIndex++;
    #endif
  }
  
  // --- STEP 2: Generate the "Challenger" Color (完全採用提供的程式碼邏輯) ---
  vec4 testColor;
  
  #ifdef USE_PALETTE
  vec3 colorPink=vec3(250./255.,220./255.,226./255.);
  vec3 colorBlue=vec3(174./255.,203./255.,237./255.);
  
  vec3 baseColor;
  if(Random_Final(testUV,iTime*9.)>.5){
    baseColor=colorPink;
  }else{
    baseColor=colorBlue;
  }
  
  float noiseAmount=.2;
  vec3 noise=vec3(Random_Final(testUV,iTime*10.),
  Random_Final(testUV,iTime*11.),
  Random_Final(testUV,iTime*12.))*noiseAmount-(noiseAmount/2.);
  
  // 這裡使用了 clamp 到 0.9，與提供的程式碼一致
  vec3 finalTestColor=clamp(baseColor+noise,0.,.9);
  testColor=vec4(finalTestColor,1.);
  
  #else
  testColor=vec4(Random_Final(testUV,iTime*10.),
  Random_Final(testUV,iTime*11.),
  Random_Final(testUV,iTime*12.),
1.);
#endif

// 排除過亮的顏色 (來自提供的程式碼)
if(rgb2hsl(testColor.rgb).z>.85){
  isInShape=false;
}

// --- STEP 3: Evolution and Rendering Logic ---
vec4 prevColor=texture2D(u_buffer0,imageUV);
gl_FragColor=prevColor;

#ifdef RENDER_DOTS
// --- Dot Grid Rendering Logic (完全採用提供的程式碼邏輯) ---

// 使用 uniform grid size，若未設定則給預設值
float currentGridSize=(u_grid_size>0.)?u_grid_size:300.;

vec2 cellCenterUV=(floor(imageUV*currentGridSize)+.5)/currentGridSize;
vec3 targetColorAtCell=texture2D(u_tex0,cellCenterUV).rgb;
float brightness=rgb2hsl(targetColorAtCell).z;

// 這裡改回 pow(..., 1.)
float adjustedBrightness=pow(brightness,1.);

float minRadius=.01;
float maxRadius=1.;
float dynamicRadius=minRadius+adjustedBrightness*(maxRadius-minRadius);

vec2 gridUV=fract(imageUV*currentGridSize);
float distToCellCenter=distance(gridUV,vec2(.5));
float feather=.75;// 增加羽化
float dotFactor=1.-smoothstep(dynamicRadius-feather,dynamicRadius+feather,distToCellCenter);

if(dotFactor>0.&&isInShape)
{
  vec3 blendedColor=testColor.rgb;
  float prevDiff=length(targetColorAtCell-prevColor.rgb);
  float blendedDiff=length(targetColorAtCell-blendedColor);
  float score=prevDiff-blendedDiff;
  
  // 進化邏輯
  if(score>0.||Random_Final(imageUV,iTime*15.)<MUTATION_RATE)
  {
    vec3 finalColor=mix(prevColor.rgb,blendedColor,dotFactor);
    gl_FragColor=vec4(finalColor,1.);
  }
}
#else
// ... (Original Shape Rendering Logic omitted for brevity, keeping structure) ...
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