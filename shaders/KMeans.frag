#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_tex0;// ../data/Cat.png
uniform sampler2D u_buffer0;

// Forward declarations
float fbm(vec2 st);

// =================CONFIG=================
#define K 16
#define SAMPLES 25

// 🟢 開關：想要迷彩就保留這行，不想就註解掉 (加 //)
#define CAMOUFLAGE

// =================CONFIG END=================

// 取得質心在 Buffer 中的 UV 位置
vec2 getCentroidUV(int i,vec2 res){
  return vec2((float(i)+.5)/res.x,.5/res.y);
}

float random(vec2 st){
  return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
}

#if defined(BUFFER_0)

void main(){
  vec2 st=gl_FragCoord.xy/u_resolution.xy;
  
  // --- 1. 如果我是「資料像素」(負責儲存質心) ---
  // 這裡我們只處理前 K 個像素
  if(gl_FragCoord.y<1.&&gl_FragCoord.x<float(K)){
    
    int myID=int(gl_FragCoord.x);
    
    // 讀取上一幀「我自己」的顏色
    vec3 myColor=texture2D(u_buffer0,st).rgb;
    
    // 初始化 (第一幀)
    if(u_time<.5){
      float t=float(myID)/float(K);
      gl_FragColor=vec4(t,.5,1.-t,1.);
      return;
    }
    
    // --- 隨機採樣更新 ---
    vec3 accumColor=vec3(0.);
    float count=0.;
    
    // ✅ 修正 2: 迴圈條件改用 SAMPLES (常數)
    for(int s=0;s<SAMPLES;s++){
      // 隨機抓一個點
      vec2 rndUV=vec2(
        random(vec2(float(s),u_time)),
        random(vec2(u_time,float(s)))
      );
      vec3 pColor=texture2D(u_tex0,rndUV).rgb;
      
      float minDist=100.;
      int bestIndex=-1;
      
      // ✅ 修正 3: 內層迴圈使用 K (常數)
      for(int k=0;k<K;k++){
        vec3 cColor=texture2D(u_buffer0,getCentroidUV(k,u_resolution)).rgb;
        float d=distance(pColor,cColor);
        if(d<minDist){
          minDist=d;
          bestIndex=k;
        }
      }
      
      // 如果這個隨機點是屬於我的
      if(bestIndex==myID){
        accumColor+=pColor;
        count+=1.;
      }
    }
    
    if(count>0.){
      vec3 target=accumColor/count;
      float learningRate=mix(.05,.002,smoothstep(0.,5.,u_time));
      gl_FragColor=vec4(mix(myColor,target,learningRate),1.);
    }else{
      gl_FragColor=vec4(myColor,1.);
    }
    return;
  }
  
  // --- 2. 普通畫面 (為了 Buffer 預覽) ---
  // 這裡計算每個像素屬於哪個質心，並將結果存入 Buffer 供下一幀可能的用途
  // 雖然 Main Pass 也會算一次，但這裡算出結果可以讓 debug 更方便
  vec3 pColor=texture2D(u_tex0,st).rgb;
  float minDist=100.;
  vec3 bestColor=vec3(0.);
  
  for(int k=0;k<K;k++){
    vec3 cColor=texture2D(u_buffer0,getCentroidUV(k,u_resolution)).rgb;
    float d=distance(pColor,cColor);
    if(d<minDist){
      minDist=d;
      bestColor=cColor;
    }
  }
  gl_FragColor=vec4(bestColor,1.);
}

#else

// --- Main Pass ---
void main(){
  vec2 st=gl_FragCoord.xy/u_resolution.xy;
  
  vec2 readUV=st;
  
  // 🟢 如果定義了 CAMOUFLAGE，就執行扭曲邏輯
  #ifdef CAMOUFLAGE
  float distortionScale=3.;// 迷彩塊的大小
  float distortionStrength=.01;// 扭曲程度
  
  // 加上時間讓它流動，如果不想要動，刪除 "+ u_time * 0.1"
  float n=fbm(st*distortionScale+u_time*.1);
  // float n=fbm(st*distortionScale);
  
  readUV+=vec2(n-.5)*distortionStrength;
  #endif
  
  // 讀取圖片顏色 (可能是扭曲過的 UV，也可能是原本的 UV)
  vec3 pColor=texture2D(u_tex0,readUV).rgb;
  
  // K-means 顏色匹配
  float minDist=100.;
  vec3 bestColor=vec3(0.);
  
  for(int k=0;k<K;k++){
    vec3 cColor=texture2D(u_buffer0,getCentroidUV(k,u_resolution)).rgb;
    float d=distance(pColor,cColor);
    if(d<minDist){
      minDist=d;
      bestColor=cColor;
    }
  }
  
  gl_FragColor=vec4(bestColor,1.);
  
  // 除錯條：顯示底部的一行質心顏色
  // if(st.y<.02)gl_FragColor=texture2D(u_buffer0,st);
}

#endif

// ============================
// === Helper Functions ===
// ============================

float noise(vec2 st){
  vec2 i=floor(st);
  vec2 f=fract(st);
  float a=random(i);
  float b=random(i+vec2(1.,0.));
  float c=random(i+vec2(0.,1.));
  float d=random(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
}

// 進階雜訊 (FBM) - 讓迷彩邊緣更自然
float fbm(vec2 st){
  float value=0.;
  float amplitude=.5;
  for(int i=0;i<5;i++){
    value+=amplitude*noise(st);
    st*=2.;
    amplitude*=.5;
  }
  return value;
}
