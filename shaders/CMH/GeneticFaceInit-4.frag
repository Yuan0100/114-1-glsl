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
uniform sampler2D u_tex0;//../../data/wave_wave-sat0.png
uniform sampler2D u_tex1;//../../data/wave_wave-sat0.png
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
#define EVOLVE_FROM_SOURCE
// --- Shape Generation Switches ---
#define GENERATE_TRIANGLES
#define GENERATE_CIRCLES
// #define GENERATE_RECTANGLES
// #define GENERATE_ELLIPSES
// ---
#define MIN_ELLIPSE_ASPECT_RATIO 5.
// --- MODIFICATION: Circle Size Control ---
#define MIN_CIRCLE_RADIUS.01// 最小半徑 (螢幕寬度的 1%)
#define MAX_CIRCLE_RADIUS.1// 最大半徑 (螢幕寬度的 10%)

#define MUTATION_RATE.015// 0.5% chance to accept a worse color
#define EVERY_PIXEL_SAME_COLOR

// ================== MAIN

void main()
{
  vec2 imageUV=fragCoord.xy/iResolution.xy;
  
  #ifdef EVOLVE_FROM_SOURCE
  if(iTime<.1){// A small threshold to detect the first frame
    // --- Image as Initialization ---
    // gl_FragColor=texture2D(u_tex0,imageUV);// Initialize with source image
    
    // Gradient as initialization ---
    vec3 colorTop=vec3(250./255.,220./255.,226./255.);// Pink (#FADCE2)
    vec3 colorBottom=vec3(174./255.,203./255.,237./255.);// Blue (#AECBED)
    
    // Mix colors based on the vertical position (imageUV.y)
    vec3 gradient=mix(colorBottom,colorTop,imageUV.y);
    
    gl_FragColor=vec4(gradient,1.);
    
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
      
      // --- MODIFICATION: Enforce aspect ratio ---
      float r1=Random_Final(testUV,iTime*3.);
      float r2=Random_Final(testUV,iTime*4.);
      
      float majorRadius=max(r1,r2);
      float minorRadius=min(r1,r2);
      
      // If the ellipse is too "circular", shrink the minor radius
      if(minorRadius>0.&&(majorRadius/minorRadius)<MIN_ELLIPSE_ASPECT_RATIO){
        minorRadius=majorRadius/MIN_ELLIPSE_ASPECT_RATIO;
      }
      
      vec2 finalRadii;
      // Randomly decide the orientation (horizontal or vertical)
      if(Random_Final(testUV,iTime*5.)>.5){
        finalRadii=vec2(majorRadius,minorRadius);
      }else{
        finalRadii=vec2(minorRadius,majorRadius);
      }
      
      isInShape=pointInEllipse(center,finalRadii*.3,imageUV);
      // --- END MODIFICATION ---
    }
    currentIndex++;
    #endif
  }
  
  // --- STEP 2: Generate the "Challenger" Color ---
  vec4 testColor;
  
  #ifdef SOURCE_COLORS
  // --- Get color directly from the source/target image ---
  // The challenger color is the "correct" color for that pixel.
  testColor=texture2D(u_tex0,imageUV);
  
  #elif defined(USE_PALETTE)
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
  
  // Directly use the selected base color without adding noise.
  // testColor = vec4(baseColor, 1.0);
  
  // Add a small amount of noise for variation
  float noiseAmount=.2;// You can adjust this for more/less color variety
  vec3 noise=vec3(Random_Final(testUV,iTime*10.),
  Random_Final(testUV,iTime*11.),
  Random_Final(testUV,iTime*12.))*noiseAmount-(noiseAmount/2.);
  
  vec3 finalTestColor=clamp(baseColor+noise,0.,.9);
  testColor=vec4(finalTestColor,1.);
  
  #else
  // --- Generate a completely random color ---
  testColor=vec4(Random_Final(testUV,iTime*10.),
  Random_Final(testUV,iTime*11.),
  Random_Final(testUV,iTime*12.),
1.);
#endif

if(rgb2hsl(testColor.rgb).z>.85){
  isInShape=false;
}

// --- STEP 3: Evolution and Rendering Logic ---
vec4 prevColor=texture2D(u_buffer0,imageUV);
gl_FragColor=prevColor;

#ifdef RENDER_DOTS
// --- Dot Grid Rendering Logic ---
float gridSize=300.;
vec2 cellCenterUV=(floor(imageUV*gridSize)+.5)/gridSize;
#ifdef EVOLVE_FROM_SOURCE
vec3 targetColorAtCell=texture2D(u_tex1,cellCenterUV).rgb;// Target is u_tex1
#else
vec3 targetColorAtCell=texture2D(u_tex0,cellCenterUV).rgb;// Default target is u_tex0
#endif
float brightness=rgb2hsl(targetColorAtCell).z;
float adjustedBrightness=pow(brightness,1.);
float minRadius=1.;
float maxRadius=10.;
float dynamicRadius=minRadius+adjustedBrightness*(maxRadius-minRadius);
vec2 gridUV=fract(imageUV*gridSize);
float distToCellCenter=distance(gridUV,vec2(.5));
float feather=5.;
float dotFactor=1.-smoothstep(dynamicRadius-feather,dynamicRadius+feather,distToCellCenter);

vec4 trueColor=vec4(targetColorAtCell,1.);

if(dotFactor>0.&&isInShape)
{
  // 1. Calculate the blended color using the alpha blending formula
  vec3 blendedColor=testColor.rgb*testColor.a+prevColor.rgb*(1.-testColor.a);
  
  // 2. Compare the 'blended' color's distance to the true color vs. the 'previous' color's distance
  float prevDiff=length(trueColor.rgb-prevColor.rgb);
  float blendedDiff=length(trueColor.rgb-blendedColor);
  
  float score=prevDiff-blendedDiff;
  
  // float prevDiff=length(trueColor.rgb-prevColor.rgb);
  // float testDiff=length(trueColor.rgb-testColor.rgb);
  // float score=prevDiff-testDiff;
  if(score<0.)
  {
    vec3 finalColor=mix(prevColor.rgb,blendedColor.rgb,dotFactor);
    gl_FragColor=vec4(finalColor,1.);
  }
  else
  {
    float mutationChance=Random_Final(imageUV,iTime*15.);
    if(mutationChance<MUTATION_RATE)
    {
      vec3 finalColor=mix(prevColor.rgb,blendedColor.rgb,dotFactor);
      gl_FragColor=vec4(finalColor,1.);
    }
  }
}
#else
// --- Original Shape Rendering Logic ---
#ifdef EVOLVE_FROM_SOURCE
vec4 trueColor=texture2D(u_tex1,imageUV);// Target is u_tex1
#else
vec4 trueColor=texture2D(u_tex0,imageUV);// Default target is u_tex0
#endif
if(isInShape)
{
  // // --- MODIFICATION: Area-based difference calculation ---
  // float avgPrevDiff = 0.0;
  // float avgTestDiff = 0.0;
  // const int samples = 8; // 鄰近取樣點數量
  // float radius = 1.0 / iResolution.x; // 取樣半徑，設為約 2 個像素寬
  
  // for (int i = 0; i < samples; i++) {
    //     float angle = float(i) / float(samples) * 2.0 * 3.14159;
    //     vec2 offset = vec2(cos(angle), sin(angle)) * radius;
    //     vec2 sampleUV = imageUV + offset;
    
    //     vec3 currentTrueColor = texture2D(u_tex1, sampleUV).rgb;
    //     vec3 currentPrevColor = texture2D(u_buffer0, sampleUV).rgb;
    
    //     avgPrevDiff += length(currentTrueColor - currentPrevColor);
    //     avgTestDiff += length(currentTrueColor - testColor.rgb);
  // }
  
  // avgPrevDiff /= float(samples);
  // avgTestDiff /= float(samples);
  
  // float prevDiff = avgPrevDiff; // 使用平均差異
  // float testDiff = avgTestDiff; // 使用平均差異
  // float score = prevDiff - testDiff;
  // // --- END MODIFICATION ---
  // --- MODIFICATION: HSL-based color difference with brightness penalty ---
  // Convert all relevant colors to HSL color space
  // vec3 trueColorHSL=rgb2hsl(trueColor.rgb);
  // vec3 prevColorHSL=rgb2hsl(prevColor.rgb);
  // vec3 testColorHSL=rgb2hsl(testColor.rgb);
  
  // Define weights for Hue, Saturation, and Lightness differences.
  // We give a higher weight to Lightness to control brightness more effectively.
  // const float wH = 1.0;
  // const float wS = 1.0;
  // const float wL = 2.0; // 亮度差異的權重加倍
  
  // // Calculate the weighted difference between the target color and the previous color
  // float prevDiff = wH * abs(hueDiff(trueColorHSL.x, prevColorHSL.x)) +
  //                  wS * abs(trueColorHSL.y - prevColorHSL.y) +
  //                  wL * abs(trueColorHSL.z - prevColorHSL.z);
  
  // // Calculate the weighted difference between the target color and the new test color
  // float testDiff = wH * abs(hueDiff(trueColorHSL.x, testColorHSL.x)) +
  //                  wS * abs(trueColorHSL.y - testColorHSL.y) +
  //                  wL * abs(trueColorHSL.z - testColorHSL.z);
  
  // // Add an extra penalty if the test color's lightness is very high (e.g., > 0.9)
  // // This strongly discourages the algorithm from choosing colors that are almost white.
  // if (testColorHSL.z > 0.9) {
    //     testDiff += 1.0; // 增加一個很大的懲罰值
  // }
  
  // 1. Calculate the blended color using the alpha blending formula
  vec3 blendedColor=testColor.rgb*testColor.a+prevColor.rgb*(1.-testColor.a);
  
  // 2. Compare the 'blended' color's distance to the true color vs. the 'previous' color's distance
  float prevDiff=length(trueColor.rgb-prevColor.rgb);
  float blendedDiff=length(trueColor.rgb-blendedColor);
  
  float score=prevDiff-blendedDiff;
  
  if(score<0.)
  {
    gl_FragColor=vec4(blendedColor,1.);// Direct replacement, no mix
  }
  else
  {
    float mutationChance=Random_Final(imageUV,iTime*15.);
    if(mutationChance<MUTATION_RATE)
    {
      gl_FragColor=vec4(blendedColor,1.);// Direct replacement
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