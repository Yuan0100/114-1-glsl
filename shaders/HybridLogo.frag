#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_tex0;//../data/NYCU_GBT-Hybrid-painting-logo.png
uniform sampler2D u_tex1;//../data/NYCU_GBT-Hybrid-painting-ball.png
uniform sampler2D u_tex2;// ../data/NYCU_GBT-Hybrid-painting-withBall.png

float mask(vec2 uv,float targetAspect){
  // 計算當前螢幕比例和目標比例
  float currentAspect=u_resolution.x/u_resolution.y;
  // float targetAspect=16./9.;
  
  if(currentAspect>targetAspect){
    // 螢幕太寬，裁切左右兩側
    float scale=currentAspect/targetAspect;
    uv.x=(uv.x-.5)*scale+.5;
  }else{
    // 螢幕太窄，裁切上下兩側
    float scale=targetAspect/currentAspect;
    uv.y=(uv.y-.5)*scale+.5;
  }
  
  // 創建遮罩，檢查 UV 是否在 [0,1] 範圍內
  float mask=step(0.,uv.x)*step(uv.x,1.)*
  step(0.,uv.y)*step(uv.y,1.);
  
  return mask;
}

void main(){
  vec2 st=gl_FragCoord.xy/u_resolution.xy;
  vec2 uv=st;
  
  // 計算當前螢幕比例和目標比例
  float currentAspect=u_resolution.x/u_resolution.y;
  float targetAspect=1./1.;
  
  if(currentAspect>targetAspect){
    // 螢幕太寬，裁切左右兩側
    float scale=currentAspect/targetAspect;
    uv.x=(uv.x-.5)*scale+.5;
  }else{
    // 螢幕太窄，裁切上下兩側
    float scale=targetAspect/currentAspect;
    uv.y=(uv.y-.5)*scale+.5;
  }
  
  // 創建遮罩，檢查 UV 是否在 [0,1] 範圍內
  float mask=step(0.,uv.x)*step(uv.x,1.)*
  step(0.,uv.y)*step(uv.y,1.);
  
  // ===
  
  vec2 texel=1./u_resolution.xy;
  
  // 定義三種模糊半徑
  float radius_high=1.1;// 高頻邊界：值越小，提取的細節越精細
  float radius_mid=8.;// 中頻邊界：定義中頻圖案的模糊程度
  float radius_low=18.;// 低頻邊界：值越大，遠景圖案越模糊，輪廓越突出
  
  // 為了效能，我們重複利用計算結果
  // 建立一個通用的模糊函式會更清晰
  // 但為了直接展示，這裡我們先手動計算
  
  // 1. 計算最強烈的模糊 (用於低頻和中頻的減去項)
  vec3 blur_strong_tex1=vec3(0.);// 低頻影像
  vec3 blur_strong_tex2=vec3(0.);// 中頻影像的減去項
  for(int x=-5;x<=5;x++){
    for(int y=-5;y<=5;y++){
      vec2 offset=vec2(float(x),float(y))*texel*(radius_low/5.);
      blur_strong_tex1+=texture2D(u_tex1,uv+offset).rgb;
      blur_strong_tex2+=texture2D(u_tex2,uv+offset).rgb;
    }
  }
  blur_strong_tex1/=121.;
  blur_strong_tex2/=121.;
  vec3 low_freq=blur_strong_tex1;
  
  // 2. 計算中等模糊 (用於中頻)
  vec3 blur_medium_tex2=vec3(0.);
  for(int x=-4;x<=4;x++){
    for(int y=-4;y<=4;y++){
      vec2 offset=vec2(float(x),float(y))*texel*(radius_mid/4.);
      blur_medium_tex2+=texture2D(u_tex2,uv+offset).rgb;
    }
  }
  blur_medium_tex2/=81.;
  // 中頻 = 中等模糊 - 強烈模糊
  vec3 mid_freq=blur_medium_tex2-blur_strong_tex2;
  
  // 3. 計算輕微模糊 (用於高頻)
  vec3 blur_weak_tex0=vec3(0.);
  for(int x=-3;x<=3;x++){
    for(int y=-3;y<=3;y++){
      vec2 offset=vec2(float(x),float(y))*texel*(radius_high/3.);
      blur_weak_tex0+=texture2D(u_tex0,uv+offset).rgb;
    }
  }
  blur_weak_tex0/=49.;
  // 高頻 = 原圖 - 輕微模糊
  vec3 high_freq=texture2D(u_tex0,uv).rgb-blur_weak_tex0;
  
  // 4. 最終混合
  // 可以為中頻和高頻加上權重來調整強度
  float mid_weight=1.1;// 增加此值使中距離圖案更明顯
  float high_weight=2.;// 增加此值使近距離 Logo 更銳利
  vec3 hybrid=low_freq+mid_freq*mid_weight+high_freq*high_weight;
  
  gl_FragColor=vec4(hybrid*mask,1.);
}