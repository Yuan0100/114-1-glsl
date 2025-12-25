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

uniform float u_grid_size;

#define iTime u_time
#define iResolution u_resolution
#define iMouse u_mouse
#define fragCoord gl_FragCoord.xy
uniform sampler2D u_tex0;
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
// #define RENDER_DOTS
#define USE_PALETTE
// --- Shape Generation Switches ---
#define GENERATE_TRIANGLES
#define GENERATE_CIRCLES
// #define GENERATE_RECTANGLES
// #define GENERATE_ELLIPSES
// ---
#define EVOLVE_FROM_GRADIENT
#define MIN_CIRCLE_RADIUS.01// 最小半徑 (螢幕寬度的 1%)
#define MAX_CIRCLE_RADIUS.3// 最大半徑 (螢幕寬度的 10%)

#define MUTATION_RATE.01// 0.5% chance to accept a worse color
#define EVERY_PIXEL_SAME_COLOR
#define FADE_IN_SPEED.8// Speed of fade-in effect (lower is slower)

// ================== MAIN

void main()
{
  vec2 imageUV=fragCoord.xy/iResolution.xy;
  
  vec2 correctedUV=imageUV;
  float aspectRatio=iResolution.x/iResolution.y;
  correctedUV.x*=aspectRatio;
  
  #ifdef EVOLVE_FROM_GRADIENT
  if(iTime<.1){// A small threshold to detect the first frame
    // --- Image as Initialization ---
    // gl_FragColor=texture2D(u_tex0,imageUV);// Initialize with source image
    
    // === 背景初始化選項 (請擇一使用) ===
    
    // 選項 1: 漸層背景 (原本的設定)
    
    vec3 colorTop=vec3(250./255.,220./255.,226./255.);
    vec3 colorBottom=vec3(174./255.,203./255.,237./255.);
    vec3 gradient=mix(colorBottom,colorTop,imageUV.y);
    gl_FragColor=vec4(gradient,1.);
    
    // 選項 2: 純白背景
    // gl_FragColor=vec4(vec3(.985),1.);
    
    // 選項 3: 透明背景 (RGBA 全部為 0)
    // 下載後的 PNG 背景會是透明的，只有生成的圖形是不透明的
    // gl_FragColor=vec4(0.);
    
    return;// Stop further processing for the first frame
  }
  #endif
  
  vec2 testUV=imageUV;
  
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
      
      triPoint1.x*=aspectRatio;
      triPoint2.x*=aspectRatio;
      triPoint3.x*=aspectRatio;
      
      isInShape=pointInTriangle(triPoint1,triPoint2,triPoint3,correctedUV);
    }
    currentIndex++;
    #endif
    
    #ifdef GENERATE_CIRCLES
    if(shapeChoice==currentIndex){
      vec2 center=vec2(Random_Final(testUV,iTime*1.),Random_Final(testUV,iTime*2.));
      float r=Random_Final(testUV,iTime*3.);
      float radius=MIN_CIRCLE_RADIUS+r*(MAX_CIRCLE_RADIUS-MIN_CIRCLE_RADIUS);
      
      center.x*=aspectRatio;
      
      isInShape=pointInCircle(center,radius,correctedUV);
    }
    currentIndex++;
    #endif
    
    #ifdef GENERATE_RECTANGLES
    if(shapeChoice==currentIndex){
      vec2 pos=vec2(Random_Final(testUV,iTime*1.),Random_Final(testUV,iTime*2.));
      vec2 size=vec2(Random_Final(testUV,iTime*3.),Random_Final(testUV,iTime*4.))*.4;
      
      pos.x*=aspectRatio;
      size.x*=aspectRatio;
      
      isInShape=pointInRect(pos,size,correctedUV);
    }
    currentIndex++;
    #endif
    
    #ifdef GENERATE_ELLIPSES
    if(shapeChoice==currentIndex){
      vec2 center=vec2(Random_Final(testUV,iTime*1.),Random_Final(testUV,iTime*2.));
      vec2 radii=vec2(Random_Final(testUV,iTime*3.),Random_Final(testUV,iTime*4.))*.3;
      
      center.x*=aspectRatio;
      radii.x*=aspectRatio;
      
      isInShape=pointInEllipse(center,radii,correctedUV);
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
  
  // ===========================
  // --- Alternative Color Palettes ---
  // Uncomment one of the following palettes to use it
  
  // 1. RISO 經典風格 (紅 / 藍)
  // vec3 colorPink=vec3(241./255.,80./255.,96./255.);// Riso Red
  // vec3 colorBlue=vec3(0./255.,120./255.,191./255.);// Riso Blue
  
  // 2. 黑白映畫 (高對比)
  // vec3 colorPink=vec3(.1,.1,.1);// Black (Dark Grey)
  // vec3 colorBlue=vec3(.9,.9,.9);// White (Light Grey)
  
  // 3. 復古海報 (米黃 / 深褐)
  // vec3 colorPink=vec3(245./255.,245./255.,220./255.);// Beige
  // vec3 colorBlue=vec3(101./255.,67./255.,33./255.);// Dark Brown
  
  // 4. 賽博龐克 (螢光粉 / 青)
  // vec3 colorPink=vec3(1.,0.,1.);// Magenta
  // vec3 colorBlue=vec3(0.,1.,1.);// Cyan
  
  // 5. 森林植被 (深綠 / 淺綠)
  // vec3 colorPink=vec3(144./255.,238./255.,144./255.);// Light Green
  // vec3 colorBlue=vec3(34./255.,139./255.,34./255.);// Forest Green
  
  // 6. 夕陽漸層 (紫 / 橘)
  // vec3 colorPink=vec3(255./255.,165./255.,0./255.);// Orange
  // vec3 colorBlue=vec3(128./255.,0./255.,128./255.);// Purple
  
  // 7. 現代極簡 (水泥灰 / 亮黃)
  // vec3 colorPink=vec3(255./255.,215./255.,0./255.);// Gold/Yellow
  // vec3 colorBlue=vec3(112./255.,128./255.,144./255.);// Slate Grey
  
  // 8. 海軍風格 (深藍 / 金)
  // vec3 colorPink=vec3(218./255.,165./255.,32./255.);// Goldenrod
  // vec3 colorBlue=vec3(0./255.,0./255.,128./255.);// Navy Blue
  
  // ===========================
  
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
// --- Dot Grid Rendering Logic (完全採用提供的程式碼邏輯) ---

// 使用 uniform grid size，若未設定則給預設值
float currentGridSize=(u_grid_size>0.)?u_grid_size:300.;

// 根據長寬比調整網格密度，確保格子是正方形
// aspectRatio 已在 main 開頭定義 (width / height)
vec2 gridDensity=vec2(currentGridSize,currentGridSize/aspectRatio);

vec2 cellCenterUV=(floor(imageUV*gridDensity)+.5)/gridDensity;
vec3 targetColorAtCell=texture2D(u_tex0,cellCenterUV).rgb;
float brightness=rgb2hsl(targetColorAtCell).z;

// float adjustedBrightness=pow(brightness,1.);
float adjustedBrightness=1.-pow(brightness,1.);

float minRadius=0.;
float maxRadius=1.;
float dynamicRadius=minRadius+adjustedBrightness*(maxRadius-minRadius);

vec2 gridUV=fract(imageUV*gridDensity);
float distToCellCenter=distance(gridUV,vec2(.5));
float feather=.75;// 增加羽化
float dotFactor=1.-smoothstep(dynamicRadius-feather,dynamicRadius+feather,distToCellCenter);

vec4 trueColor=vec4(targetColorAtCell,1.);

if(dotFactor>0.&&isInShape)
{
  float prevDiff=length(trueColor.rgb-prevColor.rgb);
  // --- MODIFICATION START ---
  // 原本：比較「純墨水顏色」與目標的差異 (導致亮部畫不上去，因為墨水太深)
  // float testDiff=length(trueColor.rgb-testColor.rgb);
  
  // 新增：先計算「墨水與背景混合後」的預期顏色
  vec3 potentialColor=mix(prevColor.rgb,testColor.rgb,dotFactor);
  
  // 修改：比較「混合後的顏色」與目標的差異
  float testDiff=length(trueColor.rgb-potentialColor);
  // --- END MODIFICATION ---
  if(testDiff<prevDiff)
  {
    vec3 finalColor=mix(prevColor.rgb,testColor.rgb,dotFactor);
    gl_FragColor=mix(gl_FragColor,vec4(finalColor,1.),FADE_IN_SPEED);
    // gl_FragColor=vec4(finalColor,1.);
  }
  else
  {
    float mutationChance=Random_Final(imageUV,iTime*15.);
    if(mutationChance<MUTATION_RATE)
    {
      vec3 finalColor=mix(prevColor.rgb,testColor.rgb,dotFactor);
      gl_FragColor=mix(gl_FragColor,vec4(finalColor,1.),FADE_IN_SPEED);
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
    gl_FragColor=mix(gl_FragColor,testColor,FADE_IN_SPEED);
    // gl_FragColor=testColor;// Direct replacement, no mix
  }
  else
  {
    float mutationChance=Random_Final(imageUV,iTime*15.);
    if(mutationChance<MUTATION_RATE)
    {
      gl_FragColor=mix(gl_FragColor,testColor,FADE_IN_SPEED);
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