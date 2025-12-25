#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_texture;// 底圖 (Content Image)
uniform sampler2D u_depth_texture;// 隱藏圖 (Depth/Watermark)
uniform float u_season;// 1:Spring, 2:Summer, 3:Autumn, 4:Winter

// ==========================================
//           配置區域 (CONFIG)
// ==========================================

// --- 功能開關 ---
#define USE_IMAGE_CONTENT// 是否使用底圖內容影響迷彩分佈
#define USE_DEPTH_MAP// 是否嵌入隱藏深度/浮水印

// ===============================
// 參數微調 (通用)
// ===============================
uniform float u_pixel_density;// 像素化程度 (越高越細緻)
uniform float u_pattern_scale;// 迷彩花紋大小 (越小越大塊)
uniform float u_seed;// 隨機種子

// 混合權重
uniform float u_w_content;// 底圖對迷彩形狀的影響力 (0.0~1.0)
uniform float u_w_hidden;// 隱藏圖層的可見度 (越低越隱蔽)

// ===============================
// 工具函數
// ===============================

// 顏色混合函數：使用 Gamma 校正混合以避免顏色變髒 (變暗)
vec3 mixColors(vec3 c1,vec3 c2,float t){
  // 線性混合通常會導致亮度下降 (例如紅+綠=暗黃)
  // 使用平方混合 (Gamma Correct Mixing) 可以保持亮度
  return sqrt(mix(c1*c1,c2*c2,t));
}

// 取得特定季節的配色與參數
void getSeasonData(int season,out vec3 c1,out vec3 c2,out vec3 c3,out vec3 c4,out float th1,out float th2,out float th3){
  if(season==1){
    // Spring
    c1=vec3(.55,.48,.45);
    c2=vec3(.65,.75,.50);
    c3=vec3(.95,.70,.78);
    c4=vec3(.98,.96,.92);
    th1=.30;th2=.45;th3=.70;
  }else if(season==2){
    // Summer
    c1=vec3(.10,.25,.15);
    c2=vec3(.25,.55,.20);
    c3=vec3(.50,.75,.30);
    c4=vec3(.90,.85,.60);
    th1=.30;th2=.55;th3=.80;
  }else if(season==3){
    // Autumn
    c1=vec3(.30,.15,.10);
    c2=vec3(.65,.30,.15);
    c3=vec3(.85,.55,.20);
    c4=vec3(.90,.80,.50);
    th1=.25;th2=.40;th3=.75;
  }else{
    // Winter (Default)
    c1=vec3(.15,.18,.22);
    c2=vec3(.45,.50,.55);
    c3=vec3(.70,.82,.88);
    c4=vec3(.96,.98,1.);
    th1=.25;th2=.50;th3=.70;
  }
}

// 隨機雜湊
vec2 hash2(vec2 p){
  return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}

// 2D 旋轉
vec2 rotate(vec2 uv,float angle){
  float s=sin(angle);
  float c=cos(angle);
  return mat2(c,-s,s,c)*uv;
}

// M90 風格的 Voronoi 生成器
// 返回: .x = 距離場 (可用於邊緣), .y = 隨機 ID (用於顏色)
vec2 voronoi(in vec2 x){
  vec2 n=floor(x);
  vec2 f=fract(x);
  
  float m_dist=8.;
  vec2 m_neighbor=vec2(0.);
  
  // 搜尋 3x3 鄰域
  for(int j=-1;j<=1;j++){
    for(int i=-1;i<=1;i++){
      vec2 g=vec2(float(i),float(j));
      vec2 o=hash2(n+g+vec2(u_seed));
      
      // 動態抖動 (可選)
      // o = 0.5 + 0.5 * sin(u_time * 0.5 + 6.2831 * o);
      
      vec2 r=g+o-f;
      float d=dot(r,r);// 歐幾里得距離平方
      
      if(d<m_dist){
        m_dist=d;
        m_neighbor=g;
      }
    }
  }
  
  // 根據最近鄰居生成 Cell ID
  float id=hash2(n+m_neighbor+vec2(u_seed)).x;
  return vec2(sqrt(m_dist),id);
}

// ===============================
// 深度層級參數設定 (8 Levels)
// ===============================
// 這是您可以調整的變數區域
// 根據深度值 (0.0 ~ 1.0) 返回 vec3(角度, 縮放倍率, 模糊程度)
vec3 getLevelParams(float depth){
  // 切分 8 個層級 (每層約 0.125)
  // 參數順序: vec3(Angle, ScaleMultiplier, Blur)
  
  if(depth<.125)return vec3(0.,.5,.200);// Level 1: 深背景 (最模糊)
  if(depth<.250)return vec3(-.2,.6,.150);// Level 2
  if(depth<.375)return vec3(.20,.8,.100);// Level 3
  if(depth<.500)return vec3(-.4,1.,.080);// Level 4
  if(depth<.625)return vec3(.40,1.2,.050);// Level 5
  if(depth<.750)return vec3(.80,1.5,.030);// Level 6
  if(depth<.875)return vec3(1.20,2.,.010);// Level 7
  return vec3(1.57,2.5,.002);// Level 8: 主體 (最銳利)
}

// ===============================
// 主程式
// ===============================

void main(){
  // 定義顏色變數
  vec3 C_LAYER_1;
  vec3 C_LAYER_2;
  vec3 C_LAYER_3;
  vec3 C_LAYER_4;
  float THRESH_1;
  float THRESH_2;
  float THRESH_3;
  
  // --- 季節插值計算 ---
  // 支援無限循環：將輸入數值映射到 0~4 的週期
  // u_season = 1.0 (Spring), 2.0 (Summer), 3.0 (Autumn), 4.0 (Winter), 5.0 (Spring)...
  
  float phase=mod(u_season-1.,4.);// 範圍 0.0 ~ 4.0
  
  int s1=int(floor(phase))+1;// 1, 2, 3, 4
  int s2=s1+1;// 2, 3, 4, 5
  if(s2>4)s2=1;// Wrap 5 -> 1
  
  float t=fract(phase);
  
  // 取得兩個季節的參數
  vec3 c1_a,c2_a,c3_a,c4_a;float th1_a,th2_a,th3_a;
  getSeasonData(s1,c1_a,c2_a,c3_a,c4_a,th1_a,th2_a,th3_a);
  
  vec3 c1_b,c2_b,c3_b,c4_b;float th1_b,th2_b,th3_b;
  getSeasonData(s2,c1_b,c2_b,c3_b,c4_b,th1_b,th2_b,th3_b);
  
  // 混合參數 (使用 Gamma 校正混合顏色)
  C_LAYER_1=mixColors(c1_a,c1_b,t);
  C_LAYER_2=mixColors(c2_a,c2_b,t);
  C_LAYER_3=mixColors(c3_a,c3_b,t);
  C_LAYER_4=mixColors(c4_a,c4_b,t);
  
  THRESH_1=mix(th1_a,th1_b,t);
  THRESH_2=mix(th2_a,th2_b,t);
  THRESH_3=mix(th3_a,th3_b,t);
  
  // 1. 基礎坐標系處理
  vec2 st=gl_FragCoord.xy/u_resolution.xy;
  float aspect=u_resolution.x/u_resolution.y;
  st.x*=aspect;
  
  // 2. 像素化網格 (Digital Grid)
  // M90 是幾何迷彩，但如果要結合數位感，我們在計算幾何前先做空間量化
  vec2 gridST=floor(st*u_pixel_density)/u_pixel_density;
  
  // 6. 讀取隱藏圖層 (Hidden Depth)
  float hiddenValue=0.;
  #ifdef USE_DEPTH_MAP
  vec2 depthUV=gridST;
  depthUV.x/=aspect;
  hiddenValue=texture2D(u_depth_texture,depthUV).r;
  #endif
  
  // 3. 準備迷彩生成坐標 (幾何變換)
  // 使用 gridST 讓幾何圖形呈現鋸齒邊緣 (數位感)
  // 若想要光滑邊緣，將 gridST 改為 st
  vec2 patternUV=gridST;
  
  // 預設參數
  vec3 params=vec3(.3,1.,.01);// Default: Angle, ScaleMultiplier, Blur
  
  #ifdef USE_DEPTH_MAP
  // 根據深度值獲取 8 層級參數
  if(hiddenValue>.01){
    params=getLevelParams(hiddenValue);
  }
  #endif
  
  float currentAngle=params.x;
  float currentScale=u_pattern_scale*params.y;// Apply multiplier
  float currentBlur=params.z;
  
  patternUV=rotate(patternUV,currentAngle);
  patternUV.x*=1.5;// M90 特徵：拉長碎片
  
  // 4. 生成基礎迷彩值 (Voronoi ID)
  vec2 vResult=voronoi(patternUV*currentScale);
  float basePattern=vResult.y;// 0.0 ~ 1.0 的隨機值
  
  // 5. 讀取與處理底圖 (Image Content)
  float contentValue=.5;// 預設中性灰
  #ifdef USE_IMAGE_CONTENT
  // 還原 UV 以正確採樣圖片
  vec2 texUV=gridST;
  texUV.x/=aspect;
  vec3 imgColor=texture2D(u_texture,texUV).rgb;
  // 計算亮度
  contentValue=dot(imgColor,vec3(.299,.587,.114));
  #endif
  
  // 7. 數值混合核心 (The Mixing Core)
  // 邏輯：迷彩圖案 + (底圖亮度 - 0.5) * 權重
  // 這樣做可以保留迷彩的隨機性，但讓亮的地方傾向出現亮色塊
  
  float finalValue=basePattern;
  
  #ifdef USE_IMAGE_CONTENT
  // 使用 Overlay 混合模式的邏輯，讓底圖亮度偏移迷彩值
  finalValue=mix(basePattern,contentValue,u_w_content);
  #endif
  
  #ifdef USE_DEPTH_MAP
  // 將隱藏資訊疊加進去
  // 如果 hiddenValue 有值，它會強制拉高或拉低 finalValue
  if(hiddenValue>.1){
    // 這裡示範簡單的混合，若要更隱密可以使用差值
    finalValue=mix(finalValue,hiddenValue,u_w_hidden);
  }
  #endif
  
  // 確保數值在 0~1 之間
  finalValue=clamp(finalValue,0.,1.);
  
  // 8. 顏色量化 (Color Quantization)
  // 使用 currentBlur 進行平滑過渡，模擬模糊效果
  vec3 finalColor=C_LAYER_1;
  
  // Layer 1 -> Layer 2
  float t1=smoothstep(THRESH_1-currentBlur,THRESH_1+currentBlur,finalValue);
  finalColor=mix(finalColor,C_LAYER_2,t1);
  
  // Layer 2 -> Layer 3
  float t2=smoothstep(THRESH_2-currentBlur,THRESH_2+currentBlur,finalValue);
  finalColor=mix(finalColor,C_LAYER_3,t2);
  
  // Layer 3 -> Layer 4
  float t3=smoothstep(THRESH_3-currentBlur,THRESH_3+currentBlur,finalValue);
  finalColor=mix(finalColor,C_LAYER_4,t3);
  
  gl_FragColor=vec4(finalColor,1.);
}
