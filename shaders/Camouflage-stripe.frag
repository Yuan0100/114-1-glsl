#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_tex0;// 底圖
uniform sampler2D u_tex1;// 深度圖 (黑白)

// ==========================================
//           參數配置
// ==========================================

// 1. 立體圖設置 (Magic Eye Settings)
// 這是最重要的參數：決定重複的寬度
// 數值越大，3D 效果越深，但解析度越低。通常 6-10 之間。
const float TILES_COUNT=8.;
const int MAX_STRIPES=30;// 足夠覆蓋整個螢幕寬度的迴圈次數

// 2. 迷彩風格
#define STYLE_CAMOUFLAGE_FRAG// 使用 Camouflage.frag 風格
const float PIXEL_DENSITY=60.;// 像素化程度
const float NOISE_SCALE=3.;// 噪聲縮放 (必須是整數以確保無縫)
const float DEPTH_STRENGTH=.5;// 深度造成的位移強度

// 3. 顏色配置 (Soft Urban / Winter Style)
const vec3 C1=vec3(.15,.18,.22);// 深岩灰 (暗部)
const vec3 C2=vec3(.45,.50,.55);// 混凝土灰 (過渡)
const vec3 C3=vec3(.70,.82,.88);// 冰河藍 (冷調)
const vec3 C4=vec3(.96,.98,1.);// 雪白 (主體)

// 顏色分佈閾值 (參考 Camouflage.frag Urban)
const float THRESHOLD_4=.35;
const float THRESHOLD_3=.55;
const float THRESHOLD_2=.70;

// ==========================================
//           週期性噪聲 (Tiling Noise)
// ==========================================

// 支援平鋪的隨機函數
float random_tiling(in vec2 st,float period){
  // 確保 X 軸無縫循環
  st.x=mod(st.x,period);
  return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
}

// 支援平鋪的 Value Noise
float noise_tiling(in vec2 st,float period){
  vec2 i=floor(st);
  vec2 f=fract(st);
  
  float a=random_tiling(i,period);
  float b=random_tiling(i+vec2(1.,0.),period);
  float c=random_tiling(i+vec2(0.,1.),period);
  float d=random_tiling(i+vec2(1.,1.),period);
  
  vec2 u=f*f*(3.-2.*f);
  
  return mix(a,b,u.x)+
  (c-a)*u.y*(1.-u.x)+
  (d-b)*u.x*u.y;
}

// 支援平鋪的 FBM
float fbm_tiling(in vec2 st,float period){
  float value=0.;
  float amplitude=.5;
  
  // 參考 Camouflage.frag 的設定
  // 注意：Camouflage.frag 使用 st *= 4.0 (FBM_OCTAVES)
  // 為了保持無縫，如果頻率乘以 4，週期也必須乘以 4
  
  for(int i=0;i<4;i++){
    value+=amplitude*noise_tiling(st,period);
    st*=4.;// FBM_OCTAVES in Camouflage.frag is 4.0
    period*=4.;
    amplitude*=.5;
  }
  return value;
}

// ==========================================
//           立體圖生成邏輯
// ==========================================

float getDepth(vec2 uv){
  // 技巧 1: 深度圖平滑化 (Depth Smoothing)
  // 透過對深度圖進行輕微的模糊採樣，可以大幅減少立體圖中的「撕裂感」
  // 這是讓魔眼圖看起來更自然、連續的關鍵
  
  vec2 pixel=1./u_resolution;// 單個像素的大小
  float d=0.;
  
  // 5-tap Gaussian-like sampling (十字採樣)
  d+=texture2D(u_tex1,clamp(uv,0.,1.)).r*.4;
  d+=texture2D(u_tex1,clamp(uv+vec2(pixel.x,0.),0.,1.)).r*.15;
  d+=texture2D(u_tex1,clamp(uv-vec2(pixel.x,0.),0.,1.)).r*.15;
  d+=texture2D(u_tex1,clamp(uv+vec2(0.,pixel.y),0.,1.)).r*.15;
  d+=texture2D(u_tex1,clamp(uv-vec2(0.,pixel.y),0.,1.)).r*.15;
  
  return d;
}

void main(){
  vec2 st=gl_FragCoord.xy/u_resolution.xy;
  float aspect=u_resolution.x/u_resolution.y;
  
  // --- 1. 計算立體圖偏移 (Stereogram Logic) ---
  // 參考 Neural Magic Eye 的 Center-Out 算法
  // https://github.com/jiupinjia/neural-magic-eye/blob/main/stereogram.py
  
  float tileWidth=1./TILES_COUNT;
  vec2 uv=st;
  float centerX=.5;
  
  // 我們將所有像素映射回 "中央條帶" (Center Strip)
  // 這樣可以減少邊緣的累積誤差，並讓主體保持在較好的解析度
  
  if(uv.x>centerX){
    // 右半部：向左尋找源頭 (Look Left)
    for(int i=0;i<MAX_STRIPES;i++){
      // 如果已經進入中央條帶範圍，停止
      if(uv.x<centerX+tileWidth*.5)break;
      
      // 根據 Neural Magic Eye 的邏輯，在 x - tileWidth/2 處採樣深度
      vec2 depthUV=vec2(uv.x-tileWidth*.5,uv.y);
      float d=getDepth(depthUV);
      
      // 計算偏移量
      float shift=tileWidth*(1.-d*DEPTH_STRENGTH);
      
      // 往回溯
      uv.x-=shift;
    }
  }else{
    // 左半部：向右尋找源頭 (Look Right)
    for(int i=0;i<MAX_STRIPES;i++){
      // 如果已經進入中央條帶範圍，停止
      if(uv.x>centerX-tileWidth*.5)break;
      
      // 根據 Neural Magic Eye 的邏輯，在 x + tileWidth/2 處採樣深度
      vec2 depthUV=vec2(uv.x+tileWidth*.5,uv.y);
      float d=getDepth(depthUV);
      
      // 計算偏移量
      float shift=tileWidth*(1.-d*DEPTH_STRENGTH);
      
      // 往回溯
      uv.x+=shift;
    }
  }
  
  // 此時 uv 已經被映射到中央區域 (或是背景紋理的對應位置)
  // 我們使用這個 uv 來生成迷彩圖案
  
  // 將座標放大到 Tiling 的尺度
  vec2 patternUV=vec2(uv.x*TILES_COUNT,uv.y*TILES_COUNT/aspect);
  
  // 設定 Tiling 的週期範圍
  // 為了保證無縫，tilePeriod 必須配合變形
  // 我們希望迷彩圖案在每一個 "條帶 (Stripe)" 的寬度上都能無縫循環
  
  // --- 2. 應用迷彩像素化與噪聲生成 ---
  
  // 空間像素化 (Pixelation)
  // 注意：這裡的 PIXEL_DENSITY 是相對於 patternUV 的
  vec2 gridUV=floor(patternUV*PIXEL_DENSITY)/PIXEL_DENSITY;
  
  // 準備噪聲座標
  // 條帶寬度在 patternUV 空間中是 1.0
  // 我們將其放大 NOISE_SCALE 倍
  vec2 noisePos=gridUV*NOISE_SCALE;
  
  // 計算無縫 FBM
  // 週期必須是 NOISE_SCALE (因為寬度 1.0 * NOISE_SCALE = NOISE_SCALE)
  float n=fbm_tiling(noisePos,NOISE_SCALE);
  
  // --- 3. 顏色映射 (Thresholds) ---
  vec3 color;
  
  if(n<THRESHOLD_4){
    color=C1;// Darkest
  }else if(n<THRESHOLD_3){
    color=C3;// Mid-Dark (Swap C2/C3 for better contrast?) Let's stick to order.
    // Camouflage.frag: 4(Darkest) -> 3 -> 2 -> 1(Lightest)
    // My C1(Dark) -> C2 -> C3 -> C4(Light)
    // So:
    // < T4: C1
    // < T3: C2
    // < T2: C3
    // else: C4
    color=C2;
  }else if(n<THRESHOLD_2){
    color=C3;
  }else{
    color=C4;
  }
  
  gl_FragColor=vec4(color,1.);
}