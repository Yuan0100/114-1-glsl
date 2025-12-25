#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_texture;// ../data/camouflage/formosan_clouded_leopard.png

// ==========================================
//           配置區域 (CONFIG)
// ==========================================

// #define CADPAT_MULTI_TERRAIN
#define CADPAT_URBAN

// --- 種子碼：改變這個數字 (例如 1.0, 42.5, 999.0)，就會生成完全不同的迷彩分佈
const float SEED=42.;

// -------------------------------
// 迷彩顏色定義區
// -------------------------------
#ifdef CADPAT_MULTI_TERRAIN
// --- Multi-Terrain CADPAT 顏色定義
const vec3 COLOR_LAYER_1=vec3(.76,.72,.62);// 淺沙色 (Light Sand/Beige)
const vec3 COLOR_LAYER_2=vec3(.58,.51,.40);// 狼棕色 (Coyote Tan)
const vec3 COLOR_LAYER_3=vec3(.38,.40,.30);// 橄欖綠 (Olive Drab)
const vec3 COLOR_LAYER_4=vec3(.26,.22,.18);// 深褐土色 (Dark Earth)
// --- 顏色分佈閾值 (0.0 ~ 1.0)
// 這些數值決定了顏色的佔比。
// 噪聲值小於 THRESHOLD_4 -> 顯示黑色
// 噪聲值小於 THRESHOLD_3 -> 顯示棕色
// ...以此類推
const float THRESHOLD_4=.3;// 0.00 ~ 0.35 是黑色
const float THRESHOLD_3=.55;// 0.35 ~ 0.55 是棕色
const float THRESHOLD_2=.8;// 0.55 ~ 0.70 是深綠色
// 0.70 ~ 1.00 是亮綠色 (剩餘部分)
#endif

#ifdef CADPAT_URBAN
// ---Urban CADPAT顏色定義
const vec3 COLOR_LAYER_1=vec3(.75,.78,.80);// 1. 淺灰藍 (Light Blue Grey)
const vec3 COLOR_LAYER_2=vec3(.45,.50,.55);// 2. 鋼鐵灰 (Steel Grey)
const vec3 COLOR_LAYER_3=vec3(.25,.28,.32);// 3. 深炭灰 (Charcoal)
const vec3 COLOR_LAYER_4=vec3(.10,.12,.15);// 4. 夜色黑 (Midnight Black)
// --- 顏色分佈閾值 (0.0 ~ 1.0)
// 這些數值決定了顏色的佔比。
// 噪聲值小於 THRESHOLD_4 -> 顯示黑色
// 噪聲值小於 THRESHOLD_3 -> 顯示棕色
// ...以此類推
const float THRESHOLD_4=.35;// 0.00 ~ 0.35 是黑色
const float THRESHOLD_3=.55;// 0.35 ~ 0.55 是棕色
const float THRESHOLD_2=.70;// 0.55 ~ 0.70 是深綠色
// 0.70 ~ 1.00 是亮綠色 (剩餘部分)
#endif
// -------------------------------

// --- 空間與尺寸參數
// PIXEL_DENSITY: 數值越大，像素格子越小（解析度越高）
// 原始建議: 60.0
const float PIXEL_DENSITY=120.;

// --- NOISE_SCALE: 數值越大，迷彩圖案越密集（看起來越遠）；數值越小，色塊越大
// 原始建議: 3.0
const float NOISE_SCALE=3.;

// --- FBM 細節設定
const float FBM_OCTAVES=4.;// 疊加層數：層數越多，邊緣越破碎，計算量越大

// --- 內容權重 (決定圖片對迷彩分佈的影響力)
// 0.0 = 純隨機迷彩 (完全看不出圖片)
// 1.0 = 純圖片亮度分層 (邊緣整齊，像海報)
// 建議 0.7 ~ 0.85，讓圖片輪廓主導，同時保有迷彩的數位破碎感
const float CONTENT_WEIGHT=.8;

// ===============================

float noise(in vec2 st);
float fbm(in vec2 st);

// ===============================

void main(){
  // 標準化座標
  vec2 st=gl_FragCoord.xy/u_resolution.xy;
  float aspect=u_resolution.x/u_resolution.y;// 提取長寬比變數
  st.x*=aspect;
  
  // 1. 空間像素化 (使用 PIXEL_DENSITY 常數)
  vec2 gridST=floor(st*PIXEL_DENSITY)/PIXEL_DENSITY;
  
  // --- 處理底圖邏輯 ---
  // A. 還原 UV 座標
  vec2 texUV=gridST;
  texUV.x/=aspect;
  
  // B. 讀取圖片顏色
  vec3 imgColor=texture2D(u_texture,texUV,-100.).rgb;
  
  // C. 計算亮度 (Luminance) - 這是圖片的 "內容" 形狀
  float lum=dot(imgColor,vec3(.299,.587,.114));
  
  // 2. 準備噪聲座標
  vec2 seedOffset=vec2(SEED*100.,SEED*57.3);
  vec2 noisePos=gridST*NOISE_SCALE+seedOffset;
  
  // 3. 生成噪聲 - 這是迷彩的 "風格" 紋理
  float n=fbm(noisePos);
  
  // --- 核心修改：混合噪聲與圖片亮度 ---
  // 讓圖片的明暗來決定顏色的分佈，而不是完全隨機
  // mix(n, lum, 0.8) 代表結果有 80% 取決於圖片亮度，20% 取決於隨機噪聲
  float finalValue=mix(n,lum,CONTENT_WEIGHT);
  
  // 4. 顏色映射 (使用混合後的數值 finalValue)
  // 這樣做會讓圖片暗部對應到深色迷彩，亮部對應到淺色迷彩
  vec3 color;
  
  if(finalValue<THRESHOLD_4){
    color=COLOR_LAYER_4;// 最深色 (對應圖片陰影)
  }else if(finalValue<THRESHOLD_3){
    color=COLOR_LAYER_3;
  }else if(finalValue<THRESHOLD_2){
    color=COLOR_LAYER_2;
  }else{
    // 最亮部：使用迷彩的主色調 (Layer 1)
    // 這樣整張圖都會統一成迷彩風格
    color=COLOR_LAYER_1;
  }
  
  gl_FragColor=vec4(color,1.);
}

// ===============================
// Helper Functions
// ===============================

float random(in vec2 st){
  return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
}

float noise(in vec2 st){
  vec2 i=floor(st);
  vec2 f=fract(st);
  
  // 這裡使用 mix 進行簡單的線性插值，保持一定的塊狀感
  // 如果想要更硬的邊緣，可以去除 smoothstep 或直接取 random(i)
  float a=random(i);
  float b=random(i+vec2(1.,0.));
  float c=random(i+vec2(0.,1.));
  float d=random(i+vec2(1.,1.));
  
  vec2 u=f*f*(3.-2.*f);
  
  return mix(a,b,u.x)+
  (c-a)*u.y*(1.-u.x)+
  (d-b)*u.x*u.y;
}

float fbm(in vec2 st){
  float value=0.;
  float amplitude=.5;
  float frequency=0.;// 初始頻率偏移，這裡設為0即可
  
  // 根據常數循環
  for(int i=0;i<4;i++){
    value+=amplitude*noise(st);
    st*=FBM_OCTAVES;// 頻率加倍
    amplitude*=.5;// 振幅減半
  }
  return value;
}